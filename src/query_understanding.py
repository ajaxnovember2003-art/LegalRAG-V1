"""
Legal Query Understanding Module for LegalRAG

Parses user legal queries to detect:
1. Target Act (BNS, BNSS, BSA, IPC, CrPC, IEA)
2. Target Section number(s)
3. Target Chapter
4. Query Intent (EXACT_SECTION, CONCEPTUAL, CROSS_ACT, PROCEDURAL, OUT_OF_SCOPE)
5. Legal synonyms and expansions
6. Concordance mappings between old (IPC/CrPC/IEA) and new (BNS/BNSS/BSA) codes
"""

import re
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field


# Statutory Code Constants
ACT_BNS = "BNS"
ACT_BNSS = "BNSS"
ACT_BSA = "BSA"
ACT_IPC = "IPC"
ACT_CRPC = "CRPC"
ACT_IEA = "IEA"

SOURCE_MAP = {
    ACT_BNS: "BNS2023.pdf",
    ACT_BNSS: "250884_2_english_01042024.pdf",
    ACT_BSA: "250882_english_01042024_0.pdf",
}

ACT_NAME_MAP = {
    ACT_BNS: "Bharatiya Nyaya Sanhita, 2023",
    ACT_BNSS: "Bharatiya Nagarik Suraksha Sanhita, 2023",
    ACT_BSA: "Bharatiya Sakshya Adhiniyam, 2023",
    ACT_IPC: "Indian Penal Code, 1860 (Repealed)",
    ACT_CRPC: "Code of Criminal Procedure, 1973 (Repealed)",
    ACT_IEA: "Indian Evidence Act, 1872 (Repealed)",
}

# Historical Concordance Mappings (Old -> New)
CONCORDANCE_MAP = {
    # IPC -> BNS
    ("IPC", "302"): ("BNS", "103", "Murder"),
    ("IPC", "300"): ("BNS", "101", "Murder definition"),
    ("IPC", "299"): ("BNS", "100", "Culpable homicide"),
    ("IPC", "304"): ("BNS", "105", "Punishment for culpable homicide"),
    ("IPC", "304B"): ("BNS", "80", "Dowry death"),
    ("IPC", "307"): ("BNS", "109", "Attempt to murder"),
    ("IPC", "375"): ("BNS", "63", "Rape"),
    ("IPC", "376"): ("BNS", "64", "Punishment for rape"),
    ("IPC", "378"): ("BNS", "303", "Theft"),
    ("IPC", "379"): ("BNS", "303", "Punishment for theft"),
    ("IPC", "390"): ("BNS", "309", "Robbery"),
    ("IPC", "395"): ("BNS", "310", "Dacoity"),
    ("IPC", "420"): ("BNS", "318", "Cheating and dishonestly inducing delivery"),
    ("IPC", "405"): ("BNS", "316", "Criminal breach of trust"),
    ("IPC", "499"): ("BNS", "356", "Defamation"),
    ("IPC", "124A"): ("BNS", "152", "Acts endangering sovereignty, unity and integrity"),
    ("IPC", "34"): ("BNS", "3", "Acts done by several persons in furtherance of common intention"),
    ("IPC", "120A"): ("BNS", "61", "Criminal conspiracy"),
    ("IPC", "120B"): ("BNS", "61", "Punishment of criminal conspiracy"),
    ("IPC", "141"): ("BNS", "189", "Unlawful assembly"),

    # CrPC -> BNSS
    ("CRPC", "154"): ("BNSS", "173", "Information in cognizable cases (FIR)"),
    ("CRPC", "161"): ("BNSS", "180", "Examination of witnesses by police"),
    ("CRPC", "164"): ("BNSS", "183", "Recording of confessions and statements"),
    ("CRPC", "167"): ("BNSS", "187", "Procedure when investigation cannot be completed in 24 hours"),
    ("CRPC", "173"): ("BNSS", "193", "Report of police officer on completion of investigation"),
    ("CRPC", "41"): ("BNSS", "35", "When police may arrest without warrant"),
    ("CRPC", "436"): ("BNSS", "478", "In what cases bail to be taken"),
    ("CRPC", "437"): ("BNSS", "480", "When bail may be taken in case of non-bailable offence"),
    ("CRPC", "438"): ("BNSS", "482", "Direction for grant of bail to person apprehending arrest (Anticipatory bail)"),
    ("CRPC", "439"): ("BNSS", "483", "Special powers of High Court or Court of Session regarding bail"),

    # IEA -> BSA
    ("IEA", "3"): ("BSA", "2", "Definitions (Court, Fact, Relevant, Document, Evidence)"),
    ("IEA", "25"): ("BSA", "23", "Confession to police officer not to be proved"),
    ("IEA", "26"): ("BSA", "23", "Confession by accused while in custody of police"),
    ("IEA", "27"): ("BSA", "23", "How much of information received from accused may be proved"),
    ("IEA", "65B"): ("BSA", "63", "Admissibility of electronic records"),
    ("IEA", "113B"): ("BSA", "118", "Presumption as to dowry death"),
    ("IEA", "114A"): ("BSA", "119", "Presumption as to absence of consent in certain prosecutions for rape"),
}

# Reverse concordance (New -> Old)
REVERSE_CONCORDANCE_MAP = {}
for (old_act, old_sec), (new_act, new_sec, desc) in CONCORDANCE_MAP.items():
    REVERSE_CONCORDANCE_MAP[(new_act, new_sec)] = (old_act, old_sec, desc)


# Legal Concepts Synonym Expansion
LEGAL_CONCEPT_SYNONYMS = {
    "murder": ["culpable homicide", "section 101", "section 103", "death", "intention"],
    "theft": ["dishonestly", "movable property", "without consent", "section 303"],
    "cheating": ["deceiving", "fraudulently", "dishonestly", "section 318", "property"],
    "common intention": ["joint liability", "furtherance of common intention", "section 3", "several persons"],
    "criminal conspiracy": ["agreement", "illegal act", "section 61"],
    "defamation": ["reputation", "harm", "section 356", "imputation"],
    "rape": ["sexual intercourse", "consent", "section 63", "section 64"],
    "kidnapping": ["abduction", "lawful guardian", "section 137", "section 138"],
    "extortion": ["fear of injury", "dishonestly inducing", "section 308"],
    "robbery": ["dacoity", "theft", "extortion", "hurt", "section 309"],
    "dacoity": ["five or more persons", "conjointly committing", "section 310"],
    "fir": ["first information report", "information in cognizable cases", "section 173 bnss", "police station"],
    "bail": ["anticipatory bail", "regular bail", "section 478", "section 480", "section 482 bnss"],
    "arrest": ["police officer", "warrant", "section 35 bnss"],
    "electronic record": ["digital evidence", "section 63 bsa", "admissibility", "hash value"],
    "charge sheet": ["police report", "final report", "section 193 bnss"],
}


@dataclass
class QueryAnalysis:
    raw_query: str
    target_act: Optional[str] = None
    target_act_name: Optional[str] = None
    target_source_file: Optional[str] = None
    target_section: Optional[str] = None
    target_chapter: Optional[str] = None
    intent: str = "CONCEPTUAL"  # EXACT_SECTION, CONCEPTUAL, CROSS_ACT, PROCEDURAL, OUT_OF_SCOPE
    is_exact_section: bool = False
    is_concordance_query: bool = False
    concordance_info: Optional[Dict[str, str]] = None
    expanded_terms: List[str] = field(default_factory=list)
    secondary_acts: List[str] = field(default_factory=list)
    confidence: float = 1.0


def analyze_legal_query(query: str) -> QueryAnalysis:
    """
    Perform legal-aware query analysis on a user question.
    Extracts act references, section numbers, intent, and concept expansions.
    """
    raw = query.strip()
    query_lower = raw.lower()

    target_act = None
    target_section = None
    target_chapter = None
    intent = "CONCEPTUAL"
    is_exact_section = False
    is_concordance_query = False
    concordance_info = None
    secondary_acts = []
    expanded_terms = []

    # 1. Detect Explicit (Section, Act) Pairs e.g. "Section 302 of IPC", "Section 103 of BNS"
    ENACTMENT_YEARS = {"2023", "1860", "1973", "1872", "2024"}
    explicit_pairs = {}
    pair_matches1 = re.findall(r'(?:section|sec\.?|s\.)\s*(\d+[A-Z]?)\s*(?:of\s+)?(bns|bnss|bsa|ipc|crpc|iea)\b', query_lower)
    for s_num, a_name in pair_matches1:
        if s_num not in ENACTMENT_YEARS:
            explicit_pairs[a_name.upper()] = s_num.upper()

    pair_matches2 = re.findall(r'\b(bns|bnss|bsa|ipc|crpc|iea)\s+(?:section|sec\.?|s\.)?\s*(\d+[A-Z]?)\b', query_lower)
    for a_name, s_num in pair_matches2:
        if s_num and s_num not in ENACTMENT_YEARS:
            explicit_pairs[a_name.upper()] = s_num.upper()

    # Detect Acts Mentioned
    if "BNS" in explicit_pairs:
        target_act = ACT_BNS
        target_section = explicit_pairs["BNS"]
    elif "BNSS" in explicit_pairs:
        target_act = ACT_BNSS
        target_section = explicit_pairs["BNSS"]
    elif "BSA" in explicit_pairs:
        target_act = ACT_BSA
        target_section = explicit_pairs["BSA"]
    elif re.search(r'\b(bns|bharatiya nyaya sanhita|nyaya sanhita|new criminal code|criminal code|new penal code|penal code)\b', query_lower):
        target_act = ACT_BNS
    elif re.search(r'\b(bnss|bharatiya nagarik suraksha sanhita|nagarik suraksha)\b', query_lower):
        target_act = ACT_BNSS
    elif re.search(r'\b(bsa|bharatiya sakshya adhiniyam|sakshya adhiniyam|sakshya bill)\b', query_lower):
        target_act = ACT_BSA
    elif "IPC" in explicit_pairs:
        target_act = ACT_IPC
        target_section = explicit_pairs["IPC"]
    elif re.search(r'\b(ipc|indian penal code)\b', query_lower):
        target_act = ACT_IPC
    elif "CRPC" in explicit_pairs:
        target_act = ACT_CRPC
        target_section = explicit_pairs["CRPC"]
    elif re.search(r'\b(crpc|code of criminal procedure)\b', query_lower):
        target_act = ACT_CRPC
    elif "IEA" in explicit_pairs:
        target_act = ACT_IEA
        target_section = explicit_pairs["IEA"]
    elif re.search(r'\b(iea|indian evidence act)\b', query_lower):
        target_act = ACT_IEA

    # Check for multiple acts (comparison / cross-act)
    acts_found = list(explicit_pairs.keys())
    for act_cand, act_regex in [
        (ACT_BNS, r'\b(bns|bharatiya nyaya sanhita)\b'),
        (ACT_BNSS, r'\b(bnss|bharatiya nagarik suraksha sanhita)\b'),
        (ACT_BSA, r'\b(bsa|bharatiya sakshya adhiniyam)\b'),
        (ACT_IPC, r'\b(ipc|indian penal code)\b'),
        (ACT_CRPC, r'\b(crpc|code of criminal procedure)\b'),
        (ACT_IEA, r'\b(iea|indian evidence act)\b'),
    ]:
        if act_cand not in acts_found and re.search(act_regex, query_lower):
            acts_found.append(act_cand)

    if len(acts_found) > 1:
        intent = "CROSS_ACT"
        is_concordance_query = True
        secondary_acts = [a for a in acts_found if a != target_act]

        # Prioritize new code as target_act if comparing old and new
        if any(a in acts_found for a in [ACT_BNS, ACT_BNSS, ACT_BSA]):
            for new_a in [ACT_BNS, ACT_BNSS, ACT_BSA]:
                if new_a in acts_found:
                    target_act = new_a
                    if new_a in explicit_pairs:
                        target_section = explicit_pairs[new_a]
                    break

    # Check comparison terms
    if any(k in query_lower for k in ["compare", "distinction between", "difference between", "repealed", "earlier", "old law", "equivalent to"]):
        intent = "CROSS_ACT"
        is_concordance_query = True

    # 2. Extract Section Reference (if not already bound via explicit_pairs)
    if not target_section:
        sec_match = re.search(r'\b(?:section|sec\.?|s\.)\s*(\d+[A-Z]?)(?:\s*\(([0-9a-z]+)\))?', query_lower)
        if sec_match and sec_match.group(1) not in ENACTMENT_YEARS:
            target_section = sec_match.group(1).upper()
            if any(prefix in query_lower for prefix in ["explain section", "what is section", "section ", "under section", "provision of section", "detail"]):
                if intent != "CROSS_ACT":
                    intent = "EXACT_SECTION"
                is_exact_section = True
        else:
            bare_match = re.search(r'\b(bns|bnss|bsa|ipc|crpc|iea)\s+(\d+[A-Z]?)\b', query_lower)
            if bare_match and bare_match.group(2) not in ENACTMENT_YEARS:
                target_section = bare_match.group(2).upper()
                is_exact_section = True
                intent = "EXACT_SECTION"
    else:
        if intent != "CROSS_ACT":
            intent = "EXACT_SECTION"
        is_exact_section = True

    # 3. Extract Chapter Reference
    chap_match = re.search(r'\bchapter\s+([ivxlcdm]+|\d+)\b', query_lower)
    if chap_match:
        target_chapter = chap_match.group(0).upper()

    # 4. Handle Historical Concordance Mapping
    # If explicit old and new pairs present (e.g. IPC 302 and BNS 103)
    if "IPC" in explicit_pairs and "BNS" in explicit_pairs:
        concordance_info = {
            "historical_act": "IPC",
            "historical_section": explicit_pairs["IPC"],
            "corresponding_act": "BNS",
            "corresponding_section": explicit_pairs["BNS"],
            "description": "Historical criminal code transition",
        }
    elif target_act in [ACT_IPC, ACT_CRPC, ACT_IEA] and target_section:
        lookup_key = (target_act, target_section)
        if lookup_key in CONCORDANCE_MAP:
            new_act, new_sec, desc = CONCORDANCE_MAP[lookup_key]
            concordance_info = {
                "historical_act": target_act,
                "historical_section": target_section,
                "corresponding_act": new_act,
                "corresponding_section": new_sec,
                "description": desc,
            }
            secondary_acts.append(target_act)
            target_act = new_act
            target_section = new_sec
            is_concordance_query = True
    elif target_act in [ACT_BNS, ACT_BNSS, ACT_BSA] and target_section:
        rev_key = (target_act, target_section)
        if rev_key in REVERSE_CONCORDANCE_MAP:
            old_act, old_sec, desc = REVERSE_CONCORDANCE_MAP[rev_key]
            concordance_info = {
                "historical_act": old_act,
                "historical_section": old_sec,
                "corresponding_act": target_act,
                "corresponding_section": target_section,
                "description": desc,
            }

    # 5. Concept & Synonym Expansion + Conceptual Act Targeting
    for concept, synonyms in LEGAL_CONCEPT_SYNONYMS.items():
        if concept in query_lower:
            expanded_terms.extend(synonyms)
            if not target_act:
                # Offences belong to BNS
                if concept in ["theft", "murder", "culpable homicide", "common intention", "cheating", "defamation", "rape", "robbery", "dacoity", "extortion", "criminal conspiracy", "kidnapping"]:
                    target_act = ACT_BNS
                elif concept in ["fir", "bail", "arrest", "charge sheet"]:
                    target_act = ACT_BNSS
                elif concept in ["electronic record"]:
                    target_act = ACT_BSA

            if not target_section:
                for syn in synonyms:
                    if syn.startswith("section "):
                        s_num = syn.replace("section ", "").split()[0].upper()
                        target_section = s_num
                        break

    # 6. Resolve Target File & Act Name
    target_source_file = SOURCE_MAP.get(target_act)
    target_act_name = ACT_NAME_MAP.get(target_act)

    return QueryAnalysis(
        raw_query=raw,
        target_act=target_act,
        target_act_name=target_act_name,
        target_source_file=target_source_file,
        target_section=target_section,
        target_chapter=target_chapter,
        intent=intent,
        is_exact_section=is_exact_section,
        is_concordance_query=is_concordance_query,
        concordance_info=concordance_info,
        expanded_terms=list(dict.fromkeys(expanded_terms)),
        secondary_acts=list(dict.fromkeys(secondary_acts)),
    )
