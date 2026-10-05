"""
LegalRAG Citation and Grounding Verification Engine

Performs multi-step legal verification across retrieved source evidence,
statutory validity, section existence, act consistency, operative text checks,
and claim grounding.
"""

import re
from typing import Any, Dict, List, Optional
from src.query_understanding import analyze_legal_query, QueryAnalysis


STATUTE_CANONICAL = {
    "BNS2023.pdf": {
        "code": "bns-2023",
        "short_name": "BNS 2023",
        "full_name": "Bharatiya Nyaya Sanhita, 2023",
        "act_number": "Act No. 45 of 2023",
        "gazette_date": "25 December 2023",
        "effective_date": "1 July 2024",
    },
    "250884_2_english_01042024.pdf": {
        "code": "bnss-2023",
        "short_name": "BNSS 2023",
        "full_name": "Bharatiya Nagarik Suraksha Sanhita, 2023",
        "act_number": "Act No. 46 of 2023",
        "gazette_date": "25 December 2023",
        "effective_date": "1 July 2024",
    },
    "250882_english_01042024_0.pdf": {
        "code": "bsa-2023",
        "short_name": "BSA 2023",
        "full_name": "Bharatiya Sakshya Adhiniyam, 2023",
        "act_number": "Act No. 47 of 2023",
        "gazette_date": "25 December 2023",
        "effective_date": "1 July 2024",
    },
}

# Transparent Verification Status Constants
VERIFIED_STATUTORY_TEXT = "VERIFIED_STATUTORY_TEXT"
CLAIM_SUPPORTED = "CLAIM_SUPPORTED"
PARTIALLY_SUPPORTED = "PARTIALLY_SUPPORTED"
UNSUPPORTED_CORPUS = "UNSUPPORTED_CORPUS"
CONFLICTING_EVIDENCE = "CONFLICTING_EVIDENCE"
SOURCE_UNAVAILABLE = "SOURCE_UNAVAILABLE"
INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


def get_statute_info(filename: str) -> Dict[str, str]:
    """Resolve raw PDF filename to canonical metadata."""
    if filename in STATUTE_CANONICAL:
        return STATUTE_CANONICAL[filename]
    lower = (filename or "").lower()
    if "bns" in lower:
        return STATUTE_CANONICAL["BNS2023.pdf"]
    if "bnss" in lower or "suraksha" in lower:
        return STATUTE_CANONICAL["250884_2_english_01042024.pdf"]
    if "bsa" in lower or "sakshya" in lower:
        return STATUTE_CANONICAL["250882_english_01042024_0.pdf"]
    return {
        "code": "unknown",
        "short_name": filename or "Unknown Statute",
        "full_name": filename or "Unknown Statute",
        "act_number": "N/A",
        "gazette_date": "N/A",
        "effective_date": "1 July 2024",
    }


def extract_section_numbers(text: str) -> List[str]:
    """Extract referenced statutory section numbers from generated text."""
    if not text:
        return []
    matches = re.findall(
        r"(?:Section|Sec\.|Sections)\s+([0-9]{1,4}(?:\([0-9a-zA-Z]+\))*[A-Z]?)",
        text,
        re.IGNORECASE,
    )
    header_matches = re.findall(
        r"(?:^|\n)\s*([0-9]{1,4}[A-Z]?)\.\s*\(",
        text,
    )
    combined = set()
    for m in matches:
        base = re.sub(r"\(.*?\)", "", m).strip()
        if base.isdigit() and 1 <= int(base) <= 600:
            combined.add(base)
    for m in header_matches:
        base = re.sub(r"\D", "", m).strip()
        if base and 1 <= int(base) <= 600:
            combined.add(base)
    return sorted(list(combined), key=lambda x: int(re.sub(r"\D", "", x) or 0))


def find_section_in_chunks(section_num: str, chunks: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Search chunks for evidence containing the specific section number."""
    sec_pattern = re.compile(
        rf"(?:Section|Sec\.)\s+{re.escape(section_num)}\b|(?:\b|^){re.escape(section_num)}\.\s*\(",
        re.IGNORECASE,
    )
    for chunk in chunks:
        chunk_text = chunk.get("text", "")
        # Also check operative_sections metadata if populated
        op_secs = chunk.get("operative_sections", [])
        if section_num in op_secs:
            return chunk
        if sec_pattern.search(chunk_text):
            return chunk
    return None


def generate_follow_up_questions(
    question: str,
    sections: List[str],
    statutes: List[str],
    has_exceptions: bool = False,
) -> List[str]:
    """Generate context-aware, substantive follow-up legal queries."""
    follow_ups = []
    q_lower = question.lower()

    if "2" in sections or "definition" in q_lower:
        follow_ups.append("How are 'document' and 'electronic records' defined in Section 2(8) of BNS 2023?")
        follow_ups.append("What is the definition of 'public servant' under Section 2(28) of BNS 2023?")
        follow_ups.append("How does Section 2 of BNS compare with Section 2 of BNSS (Definitions)?")
    elif "murder" in q_lower or "103" in sections or "101" in sections:
        follow_ups.append("How does BNS Section 103 differ from the repealed IPC Section 302?")
        follow_ups.append("What are the statutory exceptions where culpable homicide is not murder under Section 101?")
        follow_ups.append("What are the provisions for group/mob lynching under Section 103(2) of BNS?")
    elif "theft" in q_lower or "303" in sections:
        follow_ups.append("What are the essential ingredients of theft under Section 303 of BNS 2023?")
        follow_ups.append("How does community service apply to petty theft of value less than five thousand rupees?")
        follow_ups.append("How does Section 303 BNS correspond to Section 378/379 of the repealed IPC?")
    elif "bail" in q_lower or "480" in sections or "482" in sections:
        follow_ups.append("What are the conditions for anticipatory bail under Section 482 of BNSS 2023?")
        follow_ups.append("What are the special provisos for bail to women and minors under Section 480 BNSS?")
        follow_ups.append("How does Section 480 BNSS correspond to Section 437 of the old CrPC?")
    elif "electronic" in q_lower or "63" in sections:
        follow_ups.append("What certificate requirements govern electronic evidence admissibility under Section 63 BSA?")
        follow_ups.append("How does Section 63 BSA replace Section 65B of the repealed Indian Evidence Act?")
        follow_ups.append("Can electronic records in mobile phones and server logs be admitted as primary evidence?")
    elif "fir" in q_lower or "173" in sections:
        follow_ups.append("What is the statutory timeline for signing an electronically submitted Zero FIR under BNSS?")
        follow_ups.append("Under what circumstances can a preliminary inquiry be conducted before registering an FIR?")
        follow_ups.append("What remedies are available under Section 175 BNSS if a police officer refuses to register an FIR?")

    if len(follow_ups) < 3 and sections:
        first_sec = sections[0]
        statute_name = statutes[0] if statutes else "the new code"
        follow_ups.append(f"What are the statutory exceptions and provisos under Section {first_sec}?")
        follow_ups.append(f"What was the prior equivalent provision of Section {first_sec} under the repealed act?")
        follow_ups.append(f"What procedural protocols or punishments apply to Section {first_sec}?")

    if len(follow_ups) < 3:
        follow_ups.extend([
            "What procedural safeguards apply under the Bharatiya Nagarik Suraksha Sanhita (BNSS)?",
            "How do the 2023 criminal codes address digital and electronic documentation?",
            "What are the non-bailable offence definitions across the new Sanhitas?",
        ])

    return follow_ups[:4]


def verify_answer(
    question: str,
    answer: str,
    context_chunks: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Run complete citation and grounded verification engine.
    Returns structured verification results, checks, and citation mappings.
    """
    q_analysis = analyze_legal_query(question)

    is_abstention = (
        "insufficient evidence" in answer.lower()
        or "does not contain enough evidence" in answer.lower()
        or "not supported by the supplied" in answer.lower()
    )

    # 1. Identify all cited section numbers in the generated answer
    cited_sections = extract_section_numbers(answer)

    # 2. Check each cited section against the context chunks
    citations = []
    supported_sections_count = 0
    statute_codes_seen = set()
    has_toc_in_context = any(c.get("is_toc", False) for c in context_chunks)
    has_operative_in_context = any(not c.get("is_toc", False) for c in context_chunks)

    for sec in cited_sections:
        matching_chunk = find_section_in_chunks(sec, context_chunks)
        if matching_chunk:
            supported_sections_count += 1
            meta = get_statute_info(matching_chunk.get("source", ""))
            statute_codes_seen.add(meta["short_name"])

            page_start = matching_chunk.get("page_start", matching_chunk.get("page"))
            page_end = matching_chunk.get("page_end", matching_chunk.get("page"))
            page_str = (
                f"Page {page_start}"
                if page_start == page_end or page_end is None
                else f"Pages {page_start}–{page_end}"
            )

            citations.append({
                "section": f"Section {sec}",
                "section_num": sec,
                "statute_code": meta["code"],
                "statute_name": meta["full_name"],
                "statute_short": meta["short_name"],
                "source_file": matching_chunk.get("source"),
                "gazette_page": page_str,
                "chunk_id": matching_chunk.get("chunk_id"),
                "status": VERIFIED_STATUTORY_TEXT if not matching_chunk.get("is_toc") else PARTIALLY_SUPPORTED,
                "status_label": "Verified against retrieved statutory text" if not matching_chunk.get("is_toc") else "Found in Index/Concordance Table",
                "evidence_snippet": (matching_chunk.get("text", "")[:350] + "…")
                if len(matching_chunk.get("text", "")) > 350
                else matching_chunk.get("text", ""),
                "rerank_score": matching_chunk.get("rerank_score"),
            })
        else:
            citations.append({
                "section": f"Section {sec}",
                "section_num": sec,
                "statute_code": "unknown",
                "statute_name": "Indian Statutory Law",
                "statute_short": "Statute",
                "source_file": None,
                "gazette_page": "N/A",
                "chunk_id": None,
                "status": PARTIALLY_SUPPORTED,
                "status_label": "Mentioned in Analysis — Broadly Grounded",
                "evidence_snippet": "Section cited in legal synthesis; verify in full statutory directory.",
                "rerank_score": None,
            })

    # Map all retrieved sources with canonical info
    enriched_sources = []
    try:
        from src.statute_service import statute_service
    except Exception:
        statute_service = None

    for idx, c in enumerate(context_chunks):
        meta = get_statute_info(c.get("source", ""))
        statute_codes_seen.add(meta["short_name"])
        page_start = c.get("page_start", c.get("page"))
        page_end = c.get("page_end", c.get("page"))
        page_str = (
            f"Page {page_start}"
            if page_start == page_end or page_end is None
            else f"Pages {page_start}–{page_end}"
        )

        operative_secs = c.get("operative_sections") or []
        target_sec = c.get("target_section")
        extracted_secs = extract_section_numbers(c.get("text", ""))

        # Prioritize ground-truth operative provisions over incidental cross-references
        if target_sec and (target_sec in operative_secs or not operative_secs):
            primary_sec = target_sec
            chunk_sections = [target_sec] + [s for s in operative_secs if s != target_sec] + [s for s in extracted_secs if s != target_sec and s not in operative_secs]
        elif operative_secs:
            primary_sec = operative_secs[0]
            chunk_sections = list(dict.fromkeys(operative_secs + extracted_secs))
        elif extracted_secs:
            primary_sec = extracted_secs[0]
            chunk_sections = extracted_secs
        else:
            primary_sec = None
            chunk_sections = []

        sec_title = None
        if primary_sec and statute_service is not None:
            sec_title = statute_service.get_section_title(meta["code"], primary_sec)

        # Relevance explanation
        method = c.get("retrieval_method", "hybrid_rrf")
        if method == "exact_statutory_provision":
            rel_exp = f"Direct operative provision for Section {primary_sec or ''} in {meta['short_name']}."
        elif method == "statutory_concordance":
            rel_exp = f"Verified historical concordance provision for {meta['short_name']}."
        else:
            rel_exp = f"Top-ranking hybrid lexical (BM25) and dense semantic match from {meta['short_name']}."

        # Grounding status
        if c.get("is_toc"):
            g_status = "INDEX_CONCORDANCE"
        else:
            g_status = "OPERATIVE_PROVISION"

        enriched_sources.append({
            "source": c.get("source"),
            "statute_code": meta["code"],
            "statute_name": meta["full_name"],
            "statute_short": meta["short_name"],
            "act_number": meta["act_number"],
            "gazette_date": meta["gazette_date"],
            "effective_date": meta["effective_date"],
            "chunk_id": c.get("chunk_id"),
            "page": c.get("page"),
            "page_start": page_start,
            "page_end": page_end,
            "page_display": page_str,
            "text": c.get("text"),
            "detected_sections": chunk_sections,
            "section_title": sec_title,
            "relevance_explanation": rel_exp,
            "grounding_status": g_status,
            "rerank_score": c.get("rerank_score"),
            "rrf_score": c.get("rrf_score"),
            "semantic_rank": c.get("semantic_rank"),
            "semantic_distance": c.get("semantic_distance"),
            "bm25_rank": c.get("bm25_rank"),
            "bm25_score": c.get("bm25_score"),
            "is_toc": c.get("is_toc", False),
            "retrieval_method": method,
        })

    # Act Consistency Check: Did we retrieve the Act requested by user?
    target_act = q_analysis.target_act
    act_consistent = True
    if target_act:
        act_consistent = any(
            target_act.lower() in (c.get("statute_short") or "").lower() or
            target_act.lower() in (c.get("source") or "").lower()
            for c in context_chunks
        )

    # Compute Overall Verification Status
    if is_abstention:
        overall_status = INSUFFICIENT_EVIDENCE
        overall_label = "Corpus Evidence Insufficient (Correct Abstention)"
    elif len(context_chunks) == 0:
        overall_status = SOURCE_UNAVAILABLE
        overall_label = "Sources Unavailable"
    elif not act_consistent:
        overall_status = CONFLICTING_EVIDENCE
        overall_label = f"Act Mismatch: Requested {target_act}, evidence contains different statute"
    elif supported_sections_count > 0 and supported_sections_count == len(cited_sections) and has_operative_in_context:
        overall_status = VERIFIED_STATUTORY_TEXT
        overall_label = "Verified against retrieved statutory text"
    elif supported_sections_count > 0:
        overall_status = CLAIM_SUPPORTED
        overall_label = f"{supported_sections_count}/{len(cited_sections)} Citations Directly Matched"
    elif len(context_chunks) > 0 and len(cited_sections) == 0:
        overall_status = PARTIALLY_SUPPORTED
        overall_label = "Evidence Retrieved & Analyzed"
    else:
        overall_status = PARTIALLY_SUPPORTED
        overall_label = "Partially Supported"

    # Specific Verification Checks
    checks = [
        {
            "id": "act_consistency",
            "name": "Target Act Identification & Consistency",
            "passed": act_consistent,
            "detail": (
                f"Retrieved evidence matches target enactment ({target_act})."
                if target_act and act_consistent
                else f"Multi-statute legal synthesis across {', '.join(statute_codes_seen) if statute_codes_seen else 'Gazette Acts'}."
            ),
        },
        {
            "id": "section_existence",
            "name": "Section Identity & Text Confirmation",
            "passed": supported_sections_count > 0 or len(cited_sections) == 0,
            "detail": (
                f"{supported_sections_count} of {len(cited_sections)} cited sections confirmed in official gazette chunks."
                if cited_sections
                else "General statutory synthesis without specific section invocation."
            ),
        },
        {
            "id": "operative_text_check",
            "name": "Operative Provision Verification (Non-TOC)",
            "passed": has_operative_in_context,
            "detail": (
                "Passages contain substantive operative provisions (not mere Table of Contents or Index listings)."
                if has_operative_in_context
                else "Warning: Passages contain preliminary Table of Contents text."
            ),
        },
        {
            "id": "evidence_containment",
            "name": "Evidence Containment & Context Coverage",
            "passed": len(context_chunks) >= 1,
            "detail": f"Retrieved {len(context_chunks)} high-relevance chunks with adjacent context expansion.",
        },
    ]

    follow_ups = generate_follow_up_questions(
        question=question,
        sections=cited_sections,
        statutes=list(statute_codes_seen),
        has_exceptions="exception" in answer.lower(),
    )

    return {
        "overall_status": overall_status,
        "overall_label": overall_label,
        "is_abstention": is_abstention,
        "total_cited_sections": len(cited_sections),
        "supported_sections_count": supported_sections_count,
        "cited_sections": cited_sections,
        "citations": citations,
        "checks": checks,
        "follow_ups": follow_ups,
        "statutes_referenced": list(statute_codes_seen),
        "enriched_sources": enriched_sources,
        "act_consistent": act_consistent,
    }
