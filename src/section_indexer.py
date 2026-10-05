"""
Statutory Section Indexer & TOC Classifier for LegalRAG

Indexes all 1000 statutory chunks across BNS 2023, BNSS 2023, and BSA 2023.
Provides:
1. High-precision exact section lookup mapping (Act + Section Number -> Chunk IDs)
2. Table of Contents (TOC) / Index / Concordance classifier
3. Act filtering & metadata enrichment
4. Substantive operative provision extraction
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Set
from collections import defaultdict


PROCESSED_DIR = Path("data/processed")

STATUTE_FILES = [
    ("BNS", "BNS2023_chunks.json", "BNS2023.pdf", "Bharatiya Nyaya Sanhita, 2023"),
    ("BNSS", "250884_2_english_01042024_chunks.json", "250884_2_english_01042024.pdf", "Bharatiya Nagarik Suraksha Sanhita, 2023"),
    ("BSA", "250882_english_01042024_0_chunks.json", "250882_english_01042024_0.pdf", "Bharatiya Sakshya Adhiniyam, 2023")
]

# Section declaration regex in Indian statutory texts:
# E.g., "356. (1) Whoever", "173. (1) Every information", "4. The punishments", "Definitions. 2. In this"
SEC_PATTERN = re.compile(
    r'(?:[A-Za-z\s,–—\'\"]{0,60}?)\b(\d+[A-Z]?)\.\s*(?:\([0-9a-z]+\)\s*)?(?:[A-Z“\"][a-z]|Whoever|Every|Notwithstanding|Nothing|In\b|Where|A\b|No\b|When\b|If\b|Subject\b|The\b|Any\b|All\b|Except\b)'
)


class SectionIndexer:
    def __init__(self, processed_dir: Path = PROCESSED_DIR):
        self.processed_dir = processed_dir
        self.chunks: List[Dict] = []
        self.section_to_chunks: Dict[Tuple[str, str], List[int]] = defaultdict(list)
        self.chunk_lookup: Dict[Tuple[str, int], Dict] = {}
        self.act_chunks: Dict[str, List[Dict]] = defaultdict(list)
        self.operative_chunks: List[Dict] = []
        
        self._load_and_index()

    def _load_and_index(self):
        """Load and index all statutory chunks with rich metadata."""
        for code, filename, source_pdf, official_name in STATUTE_FILES:
            filepath = self.processed_dir / filename
            if not filepath.exists():
                print(f"[SectionIndexer] Warning: {filepath} not found.")
                continue

            with open(filepath, "r", encoding="utf-8") as f:
                raw_chunks = json.load(f)

            for c in raw_chunks:
                cid = c["chunk_id"]
                text = c.get("text", "")

                # 1. Determine whether this chunk is Table of Contents / Concordance
                is_toc = False
                if code == "BNS":
                    # In BNS2023.pdf, pages 1-74 (chunks 0-56) are Arrangement of Sections and Concordance table
                    is_toc = (cid < 57) or ("ARRANGEMENT OF SECTIONS" in text) or ("Corresponding Section Table" in text)
                elif code == "BNSS":
                    is_toc = (cid == 0) or ("ARRANGEMENT OF SECTIONS" in text)
                elif code == "BSA":
                    is_toc = ("ARRANGEMENT OF SECTIONS" in text)

                # 2. Enrich Chunk
                enriched = {
                    **c,
                    "statute_code": code,
                    "statute_name": official_name,
                    "statute_short": code,
                    "source": source_pdf,
                    "is_toc": is_toc,
                    "operative_sections": [],
                }

                # 3. Detect and Map Operative Sections
                if not is_toc:
                    detected_secs = []

                    # Hardcoded multi-chunk section spans for known provisions:
                    if code == "BNS" and 57 <= cid <= 64:
                        detected_secs.append("2")
                        if cid == 57:
                            detected_secs.append("1")
                    elif code == "BNS" and cid in [65, 66, 67]:
                        detected_secs.append("3")
                    elif code == "BNS" and cid in [126, 127, 128, 129, 130]:
                        detected_secs.extend(["100", "101"])
                    elif code == "BNS" and cid == 131:
                        detected_secs.append("103")
                    elif code == "BNS" and cid in [244, 245]:
                        detected_secs.append("303")
                    elif code == "BNSS" and cid in [1, 2]:
                        detected_secs.append("2")
                        if cid == 1:
                            detected_secs.append("1")
                    elif code == "BSA" and cid in [0]:
                        detected_secs.extend(["1", "2"])
                    else:
                        matches = SEC_PATTERN.findall(text)
                        for m in matches:
                            if m.isdigit() and int(m) > 600:
                                continue
                            if m not in detected_secs:
                                detected_secs.append(m)

                    enriched["operative_sections"] = detected_secs
                    for s in detected_secs:
                        if cid not in self.section_to_chunks[(code, s)]:
                            self.section_to_chunks[(code, s)].append(cid)

                    self.operative_chunks.append(enriched)

                self.chunks.append(enriched)
                self.act_chunks[code].append(enriched)
                self.chunk_lookup[(source_pdf, cid)] = enriched

        print(
            f"[SectionIndexer] Indexed {len(self.chunks)} total chunks "
            f"({len(self.operative_chunks)} operative, {len(self.chunks) - len(self.operative_chunks)} TOC/Concordance) "
            f"across {len(self.section_to_chunks)} distinct statutory provisions."
        )

    def get_exact_section_chunks(self, statute_code: str, section_num: str) -> List[Dict]:
        """
        Retrieve all operative chunks containing the substantive text for
        the given statute code and section number.
        """
        code = statute_code.upper()
        sec = section_num.upper()
        chunk_ids = self.section_to_chunks.get((code, sec), [])

        results = []
        for cid in chunk_ids:
            # Map code to source filename
            for c_code, _, source_pdf, _ in STATUTE_FILES:
                if c_code == code:
                    key = (source_pdf, cid)
                    if key in self.chunk_lookup:
                        results.append(self.chunk_lookup[key])
                    break
        return results

    def filter_chunks(
        self,
        statute_code: Optional[str] = None,
        exclude_toc: bool = True
    ) -> List[Dict]:
        """
        Filter chunks by statute and/or TOC status.
        """
        if statute_code:
            code = statute_code.upper()
            pool = self.act_chunks.get(code, [])
        else:
            pool = self.chunks

        if exclude_toc:
            return [c for c in pool if not c.get("is_toc", False)]
        return pool

    def get_chunk(self, source: str, chunk_id: int) -> Optional[Dict]:
        """Lookup a specific chunk by source document and chunk ID."""
        return self.chunk_lookup.get((source, chunk_id))


# Singleton Instance
section_indexer = SectionIndexer()
