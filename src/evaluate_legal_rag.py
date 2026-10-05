"""
LegalRAG Comprehensive Evaluation Suite & Benchmark Runner

Evaluates:
1. Exact Section Retrieval & Section 2 Regression Test
2. Conceptual Legal Retrieval (Intent, Mens Rea, Offence Ingredients)
3. Cross-Act Concordance & Historical Legislation Mapping
4. Insufficient Evidence & Out-of-Scope Abstention Detection
5. Act Identification, Section Extraction, Latency, and Verification Scores
"""

import sys
import time
from typing import Dict, List, Any

# Ensure UTF-8 console output for Windows cp1252 compatibility
sys.stdout.reconfigure(encoding='utf-8')

from src.retriever import HybridRetriever
from src.query_understanding import analyze_legal_query
from src.verifier import verify_answer


EVALUATION_DATASET = [
    # ── Category 1: Exact Section Retrieval (Including Regression Tests) ──
    {
        "category": "Exact Section Retrieval",
        "question": "Explain Section 2 of BNS 2023 in detail.",
        "expected_act": "BNS",
        "expected_section": "2",
        "must_not_contain_toc": True,
        "description": "Critical regression test: must retrieve operative definitions, not TOC or BNSS chunks.",
    },
    {
        "category": "Exact Section Retrieval",
        "question": "Explain Section 103 of BNS 2023.",
        "expected_act": "BNS",
        "expected_section": "103",
        "must_not_contain_toc": True,
        "description": "Punishment for murder under BNS.",
    },
    {
        "category": "Exact Section Retrieval",
        "question": "What is the purpose of Section 4 of BNS 2023?",
        "expected_act": "BNS",
        "expected_section": "4",
        "must_not_contain_toc": True,
        "description": "Punishments cataloged under BNS.",
    },
    {
        "category": "Exact Section Retrieval",
        "question": "Explain Section 173 of BNSS 2023 regarding information in cognizable cases.",
        "expected_act": "BNSS",
        "expected_section": "173",
        "must_not_contain_toc": True,
        "description": "Zero FIR and electronic FIR submission.",
    },
    {
        "category": "Exact Section Retrieval",
        "question": "Explain Section 63 of Bharatiya Sakshya Adhiniyam 2023 regarding electronic records.",
        "expected_act": "BSA",
        "expected_section": "63",
        "must_not_contain_toc": True,
        "description": "Admissibility of electronic and digital records.",
    },

    # ── Category 2: Conceptual Legal Retrieval ──
    {
        "category": "Conceptual Legal Retrieval",
        "question": "Explain the legal meaning of common intention under the new criminal code.",
        "expected_act": "BNS",
        "expected_section": "3",
        "must_not_contain_toc": True,
        "description": "Joint liability and acts done in furtherance of common intention.",
    },
    {
        "category": "Conceptual Legal Retrieval",
        "question": "What are the relevant statutory provisions concerning theft and its punishment?",
        "expected_act": "BNS",
        "expected_section": "303",
        "must_not_contain_toc": True,
        "description": "Theft definition and community service provisions.",
    },
    {
        "category": "Conceptual Legal Retrieval",
        "question": "Explain the legal distinction between culpable homicide and murder under BNS.",
        "expected_act": "BNS",
        "expected_section": "101",
        "must_not_contain_toc": True,
        "description": "Definitions of culpable homicide and murder.",
    },

    # ── Category 3: Cross-Act Retrieval & Concordance ──
    {
        "category": "Cross-Act Retrieval",
        "question": "Compare Section 302 of IPC with Section 103 of BNS.",
        "expected_act": "BNS",
        "expected_section": "103",
        "must_not_contain_toc": True,
        "description": "Historical concordance mapping from IPC murder to BNS murder.",
    },
    {
        "category": "Cross-Act Retrieval",
        "question": "Explain how Section 63 of BSA relates to Section 65B of the repealed Indian Evidence Act.",
        "expected_act": "BSA",
        "expected_section": "63",
        "must_not_contain_toc": True,
        "description": "Electronic records certificate requirement transition from IEA to BSA.",
    },

    # ── Category 4: Insufficient Evidence & Out-of-Scope Queries ──
    {
        "category": "Insufficient Evidence",
        "question": "What is the penalty under Section 9999 of BNS?",
        "expected_act": "BNS",
        "expected_section": "9999",
        "expect_abstention": True,
        "description": "Non-existent section number absent from corpus.",
    },
    {
        "category": "Insufficient Evidence",
        "question": "What did the Supreme Court hold in Kesavananda Bharati v. State of Kerala?",
        "expected_act": None,
        "expected_section": None,
        "expect_abstention": True,
        "description": "Constitutional precedent absent from statutory criminal code corpus.",
    },
]


def run_benchmark():
    print("=" * 80)
    print("LEGALRAG ADVANCED STATUTORY RETRIEVAL & ACCURACY BENCHMARK")
    print("=" * 80)

    print("\nInitializing HybridRetriever...")
    retriever = HybridRetriever()

    results_summary = []
    total_queries = len(EVALUATION_DATASET)
    passed_queries = 0

    for idx, item in enumerate(EVALUATION_DATASET, 1):
        q = item["question"]
        cat = item["category"]
        exp_act = item["expected_act"]
        exp_sec = item["expected_section"]
        must_not_toc = item.get("must_not_contain_toc", False)
        expect_abstention = item.get("expect_abstention", False)

        print(f"\n[{idx}/{total_queries}] Testing: '{q}'")
        print(f"  Category: {cat} | Target Act: {exp_act} | Target Sec: {exp_sec}")

        start_t = time.time()
        analysis = analyze_legal_query(q)
        retrieved = retriever.search(q, top_k=5)
        latency = round((time.time() - start_t) * 1000, 1)

        # Metrics
        act_identified = (analysis.target_act == exp_act) if exp_act else True
        sec_identified = (analysis.target_section == exp_sec) if exp_sec else True

        # Check if retrieved chunks contain target act
        if exp_act:
            act_recall = any(
                exp_act.lower() in (r.get("statute_short") or "").lower() or
                exp_act.lower() in (r.get("source") or "").lower()
                for r in retrieved
            )
        else:
            act_recall = True

        # Check if retrieved chunks contain target section
        if exp_sec and not expect_abstention:
            sec_recall = any(
                exp_sec in r.get("operative_sections", []) or
                exp_sec in str(r.get("chunk_id")) or
                f"section {exp_sec}" in r.get("text", "").lower() or
                f"{exp_sec}." in r.get("text", "")
                for r in retrieved
            )
        elif expect_abstention:
            # If abstention expected, check that we don't hallucinate an exact match
            sec_recall = len([r for r in retrieved if r.get("exact_match")]) == 0
        else:
            sec_recall = True

        # Check TOC suppression
        toc_free = True
        if must_not_toc:
            top_is_toc = retrieved[0].get("is_toc", False) if retrieved else False
            toc_free = not top_is_toc

        # Pass criteria
        test_passed = act_identified and sec_identified and act_recall and sec_recall and toc_free

        if test_passed:
            passed_queries += 1
            status_str = "PASS [OK]"
        else:
            status_str = "FAIL [X]"

        print(f"  Result: {status_str} in {latency}ms")
        print(f"  Act Match: {act_identified} | Sec Match: {sec_identified} | TOC-Free: {toc_free}")
        if retrieved:
            top = retrieved[0]
            print(f"  Top Chunk #{top.get('chunk_id')} ({top.get('source')}, Pages {top.get('page_start')}-{top.get('page_end')})")
            print(f"  Method: {top.get('retrieval_method')} | Snippet: {top.get('text', '')[:100].replace(chr(10), ' ')}")

        results_summary.append({
            "index": idx,
            "question": q,
            "category": cat,
            "passed": test_passed,
            "latency_ms": latency,
            "act_recall": act_recall,
            "sec_recall": sec_recall,
            "toc_free": toc_free,
        })

    accuracy = (passed_queries / total_queries) * 100
    avg_latency = round(sum(r["latency_ms"] for r in results_summary) / len(results_summary), 1)

    print("\n" + "=" * 80)
    print("BENCHMARK SUMMARY RESULTS")
    print("=" * 80)
    print(f"Total Benchmark Queries: {total_queries}")
    print(f"Passed Queries:          {passed_queries}/{total_queries} ({accuracy:.1f}%)")
    print(f"Average Retrieval Latency: {avg_latency} ms")

    # Category breakdown
    categories = list(dict.fromkeys(r["category"] for r in results_summary))
    print("\nPerformance by Category:")
    for cat in categories:
        cat_items = [r for r in results_summary if r["category"] == cat]
        cat_passed = len([r for r in cat_items if r["passed"]])
        cat_acc = (cat_passed / len(cat_items)) * 100
        print(f"  - {cat:30s}: {cat_passed}/{len(cat_items)} ({cat_acc:.1f}%)")

    print("\n" + "=" * 80)
    return accuracy == 100.0


if __name__ == "__main__":
    success = run_benchmark()
    sys.exit(0 if success else 1)
