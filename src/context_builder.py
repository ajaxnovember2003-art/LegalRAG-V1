"""
Context Expansion & Statutory Window Builder for LegalRAG

Expands retrieved provisions with neighbouring statutory chunks to ensure
definitions, subsections, provisos, and explanations are not truncated,
while preventing Table of Contents (TOC) pollution into operative context.
"""

from typing import List, Dict, Tuple, Optional


class ContextBuilder:

    def __init__(self, chunks: List[Dict]):
        self.chunks = chunks
        self.lookup: Dict[Tuple[str, int], Dict] = {
            (chunk["source"], chunk["chunk_id"]): chunk
            for chunk in chunks
        }

    def build(
        self,
        results: List[Dict],
        window: int = 1
    ) -> List[Dict]:
        if not results:
            return []

        expanded = []
        seen = set()

        # Step 1: Add primary retrieved results first
        for result in results:
            key = (result["source"], result["chunk_id"])
            if key not in seen:
                seen.add(key)
                expanded.append(result)

        # Step 2: Expand around top results (window expansion)
        # Limit expansion to top 2 results to maintain context precision
        for primary in results[:2]:
            source = primary["source"]
            chunk_id = primary["chunk_id"]

            for offset in range(-window, window + 1):
                if offset == 0:
                    continue

                nearby_id = chunk_id + offset
                key = (source, nearby_id)

                if key in self.lookup and key not in seen:
                    nearby = self.lookup[key]

                    # CRITICAL: Do NOT expand into Table of Contents or Index chunks!
                    if nearby.get("is_toc", False):
                        continue

                    seen.add(key)
                    expanded.append({
                        **nearby,
                        "retrieval_method": "context_window_expansion",
                        "retrieval_score": primary.get("retrieval_score", 0),
                        "rerank_score": primary.get("rerank_score", 0) - 0.5,
                        "is_expanded_context": True,
                    })

        return expanded
