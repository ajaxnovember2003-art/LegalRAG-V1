"""
LegalRAG Statute Catalog and Historical Concordance Service

Indexes statutory provisions directly from the official processed Gazette chunks
and provides verified historical concordance between colonial acts (IPC, CrPC, IEA)
and the enacted 2023 Sanhitas (BNS, BNSS, BSA).
"""

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

PROCESSED_DIR = Path("data/processed")

# Canonical Statute Definitions
STATUTE_SPECS = [
    {
        "code": "bns-2023",
        "short_name": "BNS 2023",
        "full_name": "Bharatiya Nyaya Sanhita, 2023",
        "act_number": "Act No. 45 of 2023",
        "replaces": "Indian Penal Code (IPC), 1860",
        "gazette_date": "25 December 2023",
        "effective_date": "1 July 2024",
        "chunk_file": "BNS2023_chunks.json",
        "source_pdf": "BNS2023.pdf",
        "total_enacted_sections": 358,
        "description": "The substantive penal code defining criminal offences, punishments, general exceptions, and offenses against the State, body, and property.",
    },
    {
        "code": "bnss-2023",
        "short_name": "BNSS 2023",
        "full_name": "Bharatiya Nagarik Suraksha Sanhita, 2023",
        "act_number": "Act No. 46 of 2023",
        "replaces": "Code of Criminal Procedure (CrPC), 1973",
        "gazette_date": "25 December 2023",
        "effective_date": "1 July 2024",
        "chunk_file": "250884_2_english_01042024_chunks.json",
        "source_pdf": "250884_2_english_01042024.pdf",
        "total_enacted_sections": 531,
        "description": "The procedural framework governing criminal investigation, arrest safeguards, Zero FIRs, forensic mandates, trial timelines, and electronic proceedings.",
    },
    {
        "code": "bsa-2023",
        "short_name": "BSA 2023",
        "full_name": "Bharatiya Sakshya Adhiniyam, 2023",
        "act_number": "Act No. 47 of 2023",
        "replaces": "Indian Evidence Act (IEA), 1872",
        "gazette_date": "25 December 2023",
        "effective_date": "1 July 2024",
        "chunk_file": "250882_english_01042024_0_chunks.json",
        "source_pdf": "250882_english_01042024_0.pdf",
        "total_enacted_sections": 170,
        "description": "The law of evidence governing relevancy, burden of proof, expert opinion, and primary admissibility of electronic and digital records.",
    },
]

# Verified Historical Concordance Tables
HISTORICAL_MAPPINGS = [
    # BNS ↔ IPC
    {
        "statute_code": "bns-2023",
        "new_statute": "BNS 2023",
        "new_section": "103",
        "new_title": "Punishment for murder",
        "old_statute": "IPC 1860",
        "old_section": "302",
        "old_title": "Punishment for murder",
        "correspondence": "SUBSTANTIVE_MODIFICATION",
        "correspondence_label": "Substantive Modification",
        "notes": "Retains death or life imprisonment; introduces Section 103(2) imposing death/life imprisonment for mob murder by five or more persons on discriminatory grounds.",
    },
    {
        "statute_code": "bns-2023",
        "new_statute": "BNS 2023",
        "new_section": "318",
        "new_title": "Cheating and property delivery",
        "old_statute": "IPC 1860",
        "old_section": "420",
        "old_title": "Cheating and dishonestly inducing delivery of property",
        "correspondence": "DIRECT_CORRESPONDENCE",
        "correspondence_label": "Direct Correspondence",
        "notes": "Consolidates cheating definitions; punishment remains up to seven years imprisonment and fine under Section 318(4).",
    },
    {
        "statute_code": "bns-2023",
        "new_statute": "BNS 2023",
        "new_section": "152",
        "new_title": "Act endangering sovereignty, unity and integrity of India",
        "old_statute": "IPC 1860",
        "old_section": "124A",
        "old_title": "Sedition",
        "correspondence": "SUBSTANTIVE_MODIFICATION",
        "correspondence_label": "Substantive Overhaul",
        "notes": "Replaces colonial 'sedition' terminology. Penalizes acts inciting secession, armed rebellion, subversive activities, or feelings of separatist activity.",
    },
    {
        "statute_code": "bns-2023",
        "new_statute": "BNS 2023",
        "new_section": "64",
        "new_title": "Punishment for rape",
        "old_statute": "IPC 1860",
        "old_section": "376",
        "old_title": "Punishment for rape",
        "correspondence": "SUBSTANTIVE_MODIFICATION",
        "correspondence_label": "Substantive Modification",
        "notes": "Rigorous imprisonment not less than 10 years extending to life; death penalty retained for rape of minors under 12 years (Section 65).",
    },
    {
        "statute_code": "bns-2023",
        "new_statute": "BNS 2023",
        "new_section": "111",
        "new_title": "Organised crime",
        "old_statute": "IPC 1860",
        "old_section": "None",
        "old_title": "Not Codified in IPC (State Laws like MCOCA)",
        "correspondence": "NEW_PROVISION",
        "correspondence_label": "New Statutory Provision",
        "notes": "First nationwide codification of organized crime syndicate activities, kidnapping, extortion, contract killing, and severe cybercrimes.",
    },
    {
        "statute_code": "bns-2023",
        "new_statute": "BNS 2023",
        "new_section": "69",
        "new_title": "Sexual intercourse by deceitful means / false promise of marriage",
        "old_statute": "IPC 1860",
        "old_section": "None",
        "old_title": "Judicial Precedents under IPC 375/417",
        "correspondence": "NEW_PROVISION",
        "correspondence_label": "New Statutory Provision",
        "notes": "Explicit standalone offence punishing deceitful means or false promise to marry up to ten years imprisonment and fine.",
    },
    {
        "statute_code": "bns-2023",
        "new_statute": "BNS 2023",
        "new_section": "4(f)",
        "new_title": "Community service as a recognized punishment",
        "old_statute": "IPC 1860",
        "old_section": "53",
        "old_title": "Punishments",
        "correspondence": "NEW_PROVISION",
        "correspondence_label": "New Penal Mechanism",
        "notes": "Introduces community service for petty offences (e.g. defamation, public misconduct under intoxication, petty theft under ₹5,000 upon return).",
    },

    # BNSS ↔ CrPC
    {
        "statute_code": "bnss-2023",
        "new_statute": "BNSS 2023",
        "new_section": "173",
        "new_title": "Information in cognizable cases (Zero FIR & Electronic submission)",
        "old_statute": "CrPC 1973",
        "old_section": "154",
        "old_title": "Information in cognizable cases",
        "correspondence": "SUBSTANTIVE_MODIFICATION",
        "correspondence_label": "Substantive Modernization",
        "notes": "Codifies Zero FIR regardless of territorial jurisdiction. Recognizes e-FIR taken on record if signed within 3 days. Preliminary inquiry allowed for offences with 3-7 year punishment.",
    },
    {
        "statute_code": "bnss-2023",
        "new_statute": "BNSS 2023",
        "new_section": "35",
        "new_title": "Arrest procedure without warrant",
        "old_statute": "CrPC 1973",
        "old_section": "41",
        "old_title": "When police may arrest without warrant",
        "correspondence": "SUBSTANTIVE_MODIFICATION",
        "correspondence_label": "Substantive Safeguards",
        "notes": "For offences punishable with less than 3 years imprisonment, arrest requires prior approval of an officer not below the rank of Deputy Superintendent of Police (DSP).",
    },
    {
        "statute_code": "bnss-2023",
        "new_statute": "BNSS 2023",
        "new_section": "187",
        "new_title": "Police custody and detention during investigation",
        "old_statute": "CrPC 1973",
        "old_section": "167",
        "old_title": "Procedure when investigation cannot be completed in 24 hours",
        "correspondence": "SUBSTANTIVE_MODIFICATION",
        "correspondence_label": "Substantive Revision",
        "notes": "Allows 15 days of police custody in whole or in parts during the initial 40 or 60 days of the 60/90-day detention period.",
    },
    {
        "statute_code": "bnss-2023",
        "new_statute": "BNSS 2023",
        "new_section": "480",
        "new_title": "Bail in non-bailable offences",
        "old_statute": "CrPC 1973",
        "old_section": "437",
        "old_title": "When bail may be taken in case of non-bailable offence",
        "correspondence": "DIRECT_CORRESPONDENCE",
        "correspondence_label": "Direct Correspondence",
        "notes": "Maintains statutory discretion and affirmative provisos for persons under sixteen years of age, women, and sick or infirm persons.",
    },
    {
        "statute_code": "bnss-2023",
        "new_statute": "BNSS 2023",
        "new_section": "176(3)",
        "new_title": "Mandatory forensic investigation for offences punishable with 7+ years",
        "old_statute": "CrPC 1973",
        "old_section": "None",
        "old_title": "No statutory forensic mandate",
        "correspondence": "NEW_PROVISION",
        "correspondence_label": "New Procedural Mandate",
        "notes": "Requires forensic experts to visit crime scenes and record evidentiary collection via mobile phone or digital device.",
    },
    {
        "statute_code": "bnss-2023",
        "new_statute": "BNSS 2023",
        "new_section": "356",
        "new_title": "Inquiry, trial or judgment in absentia of proclaimed offender",
        "old_statute": "CrPC 1973",
        "old_section": "None (CrPC 299 partial deposition)",
        "old_title": "No trial in absentia",
        "correspondence": "NEW_PROVISION",
        "correspondence_label": "New Procedure",
        "notes": "Permits full trial in absentia against proclaimed offenders who have absconded to evade justice, after following proclamation and 90-day notice procedures.",
    },
    {
        "statute_code": "bnss-2023",
        "new_statute": "BNSS 2023",
        "new_section": "528",
        "new_title": "Inherent powers of High Court",
        "old_statute": "CrPC 1973",
        "old_section": "482",
        "old_title": "Saving of inherent powers of High Court",
        "correspondence": "DIRECT_CORRESPONDENCE",
        "correspondence_label": "Direct Correspondence",
        "notes": "Preserves inherent High Court jurisdiction to give effect to orders, prevent abuse of court process, or secure ends of justice.",
    },

    # BSA ↔ IEA
    {
        "statute_code": "bsa-2023",
        "new_statute": "BSA 2023",
        "new_section": "63",
        "new_title": "Admissibility of electronic records and digital certificates",
        "old_statute": "IEA 1872",
        "old_section": "65B",
        "old_title": "Admissibility of electronic records",
        "correspondence": "SUBSTANTIVE_MODIFICATION",
        "correspondence_label": "Substantive Modernization",
        "notes": "Replaces Section 65B certificate regime with Schedule certificate (Part A by owner/manager and Part B by forensic expert).",
    },
    {
        "statute_code": "bsa-2023",
        "new_statute": "BSA 2023",
        "new_section": "61",
        "new_title": "Admissibility of electronic or digital record as primary evidence",
        "old_statute": "IEA 1872",
        "old_section": "62",
        "old_title": "Primary evidence",
        "correspondence": "SUBSTANTIVE_MODIFICATION",
        "correspondence_label": "Substantive Modernization",
        "notes": "Explicitly declares that an electronic or digital record produced from proper custody shall have equal legal effect, validity, and enforceability as other documents.",
    },
    {
        "statute_code": "bsa-2023",
        "new_statute": "BSA 2023",
        "new_section": "2(1)(d)",
        "new_title": "Definition of Document (including digital records)",
        "old_statute": "IEA 1872",
        "old_section": "3",
        "old_title": "Interpretation clause - Document",
        "correspondence": "SUBSTANTIVE_MODIFICATION",
        "correspondence_label": "Substantive Expansion",
        "notes": "Expands documents to include electronic records on emails, server logs, smartphone messages, websites, locational data, and voice mail.",
    },
    {
        "statute_code": "bsa-2023",
        "new_statute": "BSA 2023",
        "new_section": "23",
        "new_title": "Information from accused proved in police custody",
        "old_statute": "IEA 1872",
        "old_section": "27",
        "old_title": "How much of information received from accused may be proved",
        "correspondence": "DIRECT_CORRESPONDENCE",
        "correspondence_label": "Direct Correspondence",
        "notes": "Preserves doctrine of confirmation by subsequent recovery when fact is discovered in consequence of information given by accused in custody.",
    },
]


class StatuteService:
    """Service for statute exploration, section lookup, and concordance queries."""

    def __init__(self):
        self.statutes = STATUTE_SPECS
        self.sections_by_statute: Dict[str, List[Dict[str, Any]]] = {}
        self.historical_mappings = HISTORICAL_MAPPINGS
        self._load_all_sections()

    def _load_all_sections(self):
        """Parse all chunk files to catalog real statutory sections."""
        for spec in self.statutes:
            code = spec["code"]
            chunk_file_path = PROCESSED_DIR / spec["chunk_file"]
            self.sections_by_statute[code] = []

            if not chunk_file_path.exists():
                continue

            try:
                with open(chunk_file_path, "r", encoding="utf-8") as f:
                    chunks = json.load(f)

                seen_sections = set()

                for chunk in chunks:
                    text = chunk.get("text", "")
                    chunk_id = chunk.get("chunk_id")
                    page_start = chunk.get("page_start", chunk.get("page"))
                    page_end = chunk.get("page_end", chunk.get("page"))
                    page_display = (
                        f"Page {page_start}"
                        if page_start == page_end or page_end is None
                        else f"Pages {page_start}–{page_end}"
                    )

                    # Extract section heading lines like "103. (1) Whoever commits murder..."
                    # or "Definitions. 2. (1)..."
                    matches = re.finditer(
                        r"(?:^|\n|\.\s+)([0-9]{1,4}[A-Z]?)\.\s*(?:\(([0-9a-zA-Z]+)\))?\s*([^\n.]{3,120})",
                        text,
                    )

                    for m in matches:
                        sec_num = m.group(1).strip()
                        raw_title = m.group(3).strip()

                        # Validate reasonable section number
                        if not sec_num.isdigit() or int(sec_num) > spec["total_enacted_sections"] + 20:
                            continue

                        if sec_num in seen_sections:
                            continue

                        # Clean up title
                        title = re.sub(r'^(In this|Where any|Whenever|Unless|Whoever|Notwithstanding).*', '', raw_title, flags=re.IGNORECASE).strip()
                        if not title or len(title) < 4:
                            title = f"Section {sec_num} of {spec['short_name']}"

                        # Find matching historical mapping if any
                        hist_match = next(
                            (
                                h
                                for h in self.historical_mappings
                                if h["statute_code"] == code and h["new_section"] == sec_num
                            ),
                            None,
                        )

                        seen_sections.add(sec_num)
                        self.sections_by_statute[code].append({
                            "statute_code": code,
                            "statute_name": spec["full_name"],
                            "statute_short": spec["short_name"],
                            "section_number": sec_num,
                            "slug": f"section-{sec_num}",
                            "title": title,
                            "gazette_page": page_display,
                            "chunk_id": chunk_id,
                            "source_file": spec["source_pdf"],
                            "excerpt": text[:600] + ("…" if len(text) > 600 else ""),
                            "full_chunk_text": text,
                            "historical_mapping": hist_match,
                        })

                # Sort sections numerically
                self.sections_by_statute[code].sort(
                    key=lambda s: int(re.sub(r"\D", "", s["section_number"]) or 0)
                )

            except Exception as e:
                print(f"[StatuteService] Error parsing {chunk_file_path}: {e}")

    def get_statutes_summary(self) -> List[Dict[str, Any]]:
        """Return high-level summary of all 3 statutes with cataloged section counts."""
        result = []
        for spec in self.statutes:
            code = spec["code"]
            indexed_count = len(self.sections_by_statute.get(code, []))
            result.append({
                **spec,
                "cataloged_sections_count": indexed_count,
                "data_status": "INDEXED_AND_READY" if indexed_count > 0 else "AVAILABLE",
            })
        return result

    def get_statute(self, statute_code: str) -> Optional[Dict[str, Any]]:
        """Get statute metadata by code."""
        for spec in self.statutes:
            if spec["code"] == statute_code or spec["short_name"].lower().startswith(statute_code.lower()):
                indexed_count = len(self.sections_by_statute.get(spec["code"], []))
                return {
                    **spec,
                    "cataloged_sections_count": indexed_count,
                    "data_status": "INDEXED_AND_READY",
                }
        return None

    def search_sections(
        self,
        statute_code: Optional[str] = None,
        query: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """Search cataloged statutory sections by section number, title, or text keyword."""
        all_sections = []
        target_codes = [statute_code] if statute_code and statute_code != "all" else [s["code"] for s in self.statutes]

        for code in target_codes:
            all_sections.extend(self.sections_by_statute.get(code, []))

        if query:
            q_clean = query.strip().lower()
            filtered = []
            for s in all_sections:
                sec_match = s["section_number"].lower() == q_clean or f"section {s['section_number'].lower()}" == q_clean
                title_match = q_clean in s["title"].lower()
                text_match = q_clean in s["full_chunk_text"].lower()

                if sec_match:
                    # Give exact section matches highest priority
                    filtered.insert(0, s)
                elif title_match or text_match:
                    filtered.append(s)
            all_sections = filtered

        total = len(all_sections)
        paginated = all_sections[offset : offset + limit]

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "sections": paginated,
        }

    def get_section_detail(self, statute_code: str, section_number: str) -> Optional[Dict[str, Any]]:
        """Get detailed view of a specific section."""
        clean_sec = re.sub(r"^section-?", "", section_number, flags=re.IGNORECASE)
        sections = self.sections_by_statute.get(statute_code, [])
        for s in sections:
            if s["section_number"] == clean_sec:
                return s
        return None

    def get_section_title(self, statute_code: str, section_number: str) -> Optional[str]:
        """Look up canonical title for a section from catalog or mappings."""
        clean_sec = re.sub(r"^section-?", "", str(section_number), flags=re.IGNORECASE).strip()
        code_key = statute_code.lower()
        if not code_key.endswith("-2023"):
            code_key = f"{code_key}-2023"

        sections = self.sections_by_statute.get(code_key, [])
        for s in sections:
            if s["section_number"] == clean_sec:
                return s.get("title")

        # Check historical mappings
        for h in self.historical_mappings:
            if h.get("statute_code") == code_key and str(h.get("new_section")) == clean_sec:
                return h.get("new_title")

        # Common canonical titles across Indian statutes
        common_titles = {
            "1": "Short title, commencement and application",
            "2": "Definitions",
            "3": "General exceptions / Acts done by several persons",
            "4": "Punishments",
            "101": "Culpable homicide",
            "103": "Punishment for murder",
            "115": "Voluntarily causing hurt",
            "173": "Information in cognizable cases (First Information Report)",
            "176": "Mandatory forensic investigation",
            "303": "Theft",
            "318": "Cheating and dishonestly inducing delivery of property",
            "356": "Inquiry, trial or judgment in absentia of proclaimed offender",
            "480": "When bail may be taken in case of non-bailable offence",
            "482": "Anticipatory bail",
            "528": "Saving of inherent powers of High Court",
            "23": "Information from accused proved in police custody",
            "61": "Admissibility of electronic or digital record as primary evidence",
            "63": "Admissibility of electronic records and digital certificates",
        }
        return common_titles.get(clean_sec)

    def get_historical_mappings(self, statute_code: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get verified historical concordance table."""
        if statute_code and statute_code != "all":
            return [m for m in self.historical_mappings if m["statute_code"] == statute_code]
        return self.historical_mappings


# Singleton instance
statute_service = StatuteService()
