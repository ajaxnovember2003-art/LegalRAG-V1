"""
LegalRAG Cross-Encoder Reranking Benchmark

Evaluates whether cross-encoder reranking prioritizes higher-quality legal statutory passages
over raw hybrid retrieval candidate lists.
"""

from src.retriever import HybridRetriever
from src.reranker import Reranker

TOP_K = 5
CANDIDATE_K = 15

LEGAL_RERANK_BENCHMARKS = [
    {
        "question": "What is the punishment for murder under BNS Section 103?",
        "target_terms": ["103", "murder", "death"],
        "statute": "BNS 2023",
    },
    {
        "question": "What is the procedure for Zero FIR under BNSS Section 173?",
        "target_terms": ["173", "cognizable", "electronic"],
        "statute": "BNSS 2023",
    },
    {
        "question": "How is electronic and digital record admissible under Bharatiya Sakshya Adhiniyam?",
        "target_terms": ["electronic", "digital", "document"],
        "statute": "BSA 2023",
    },
    {
        "question": "What are the rules for bail in non-bailable cases under Section 480 BNSS?",
        "target_terms": ["480", "bail", "non-bailable"],
        "statute": "BNSS 2023",
    },
    {
        "question": "What constitutes cheating under Section 318 BNS?",
        "target_terms": ["318", "cheats", "dishonestly"],
        "statute": "BNS 2023",
    },
]


def score_relevance(text: str, target_terms: list) -> float:
    text_lower = text.lower()
    matches = sum(1 for term in target_terms if term.lower() in text_lower)
    return matches / len(target_terms)


def main():
    print("Initializing HybridRetriever...")
    retriever = HybridRetriever()

    print("Initializing Reranker...")
    reranker = Reranker()

    print("\n" + "=" * 70)
    print("LEGALRAG CROSS-ENCODER RERANKING BENCHMARK")
    print("=" * 70)

    total_precision_gain = 0.0

    for idx, item in enumerate(LEGAL_RERANK_BENCHMARKS, start=1):
        q = item["question"]
        terms = item["target_terms"]

        # 1. Retrieve candidates
        candidates = retriever.search(q, top_k=CANDIDATE_K)
        initial_top = candidates[:TOP_K]
        initial_score = sum(score_relevance(c["text"], terms) for c in initial_top) / TOP_K

        # 2. Rerank candidates
        reranked = reranker.rerank(q, candidates, top_k=TOP_K)
        reranked_score = sum(score_relevance(r["text"], terms) for r in reranked) / TOP_K

        gain = reranked_score - initial_score
        total_precision_gain += gain

        print(f"\n[{idx}/{len(LEGAL_RERANK_BENCHMARKS)}] {item['statute']}: {q}")
        print(f"  Initial Top-{TOP_K} Relevance: {initial_score:.3f}")
        print(f"  Reranked Top-{TOP_K} Relevance: {reranked_score:.3f} (Delta {gain:+.3f})")

        print(f"  Top Chunk Post-Rerank: {reranked[0].get('source')} (Score: {reranked[0].get('rerank_score', 0):.4f})")

    avg_gain = total_precision_gain / len(LEGAL_RERANK_BENCHMARKS)
    print("\n" + "=" * 70)
    print(f"AVERAGE RELEVANCE GAIN POST-RERANKING: {avg_gain:+.4f}")
    print("=" * 70)


if __name__ == "__main__":
    main()
