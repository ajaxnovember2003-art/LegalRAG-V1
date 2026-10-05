"""
Cross-Encoder Reranker for LegalRAG

Combines:
1. Deep Transformer Cross-Encoder (ms-marco-MiniLM-L-6-v2) for fine-grained relevance scoring.
2. Statutory exact-match preservation: guarantees that exact statutory provisions
   from the target act/section are never demoted below peripheral passages.
"""

from typing import List, Dict
from sentence_transformers import CrossEncoder


MODEL_NAME = "cross-encoder/ms-marco-MiniLM-L-6-v2"


class Reranker:

    def __init__(self):
        print("Loading cross-encoder...")
        self.model = CrossEncoder(MODEL_NAME)

    def rerank(
        self,
        query: str,
        results: List[Dict],
        top_k: int = 5
    ) -> List[Dict]:
        if not results:
            return []

        pairs = [
            (query, result.get("text", ""))
            for result in results
        ]

        scores = self.model.predict(pairs)

        reranked = []
        for result, score in zip(results, scores):
            res_copy = result.copy()
            raw_score = float(score)
            res_copy["cross_encoder_score"] = raw_score

            # If exact statutory match, give statutory priority boost
            if result.get("exact_match", False):
                res_copy["rerank_score"] = raw_score + 10.0
            elif result.get("concordance_match", False):
                res_copy["rerank_score"] = raw_score + 5.0
            else:
                res_copy["rerank_score"] = raw_score

            reranked.append(res_copy)

        # Sort by boosted rerank score
        reranked.sort(
            key=lambda x: x["rerank_score"],
            reverse=True
        )

        # Normalize display rerank scores to a clean float for the UI
        for rank, item in enumerate(reranked, 1):
            item["rerank_rank"] = rank

        return reranked[:top_k]
