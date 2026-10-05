"""
Hybrid Retriever for LegalRAG

Combines:
1. Legal-Aware Query Understanding (Act, Section, Intent, Concordance)
2. Exact Section Inverted Index Lookup (SectionIndexer)
3. BM25 Lexical Retrieval over Operative Statutory Provisions
4. ChromaDB Dense Semantic Search
5. Reciprocal Rank Fusion (RRF)
6. Query-Adaptive Retrieval (TOC suppression, Act isolation, Exact prioritization)
"""

from pathlib import Path
from typing import Dict, List, Optional, Any
import json

import chromadb
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

from src.query_understanding import analyze_legal_query, QueryAnalysis, ACT_NAME_MAP, SOURCE_MAP
from src.section_indexer import section_indexer, SectionIndexer


PROCESSED_DIR = Path("data/processed")
CHROMA_DIR = "chroma_db"
COLLECTION_NAME = "cognivault_documents"
MODEL_NAME = "all-MiniLM-L6-v2"


class HybridRetriever:

    def __init__(self):
        print("Loading embedding model...")
        self.model = SentenceTransformer(MODEL_NAME)

        print("Loading and indexing legal chunks via SectionIndexer...")
        self.indexer = section_indexer
        self.chunks = self.indexer.chunks
        self.operative_chunks = self.indexer.operative_chunks

        print(
            f"Retriever initialized with {len(self.chunks)} total chunks "
            f"({len(self.operative_chunks)} operative provisions)."
        )

        # Build BM25 corpus on OPERATIVE chunks to avoid TOC contamination
        self.bm25_chunks = self.operative_chunks
        self.tokenized_corpus = [
            chunk["text"].lower().split()
            for chunk in self.bm25_chunks
        ]
        self.bm25 = BM25Okapi(self.tokenized_corpus)

        # Also maintain per-act BM25 indexers for isolated act retrieval
        self.act_bm25 = {}
        for code in ["BNS", "BNSS", "BSA"]:
            act_op_chunks = [c for c in self.operative_chunks if c.get("statute_code") == code]
            if act_op_chunks:
                corpus = [c["text"].lower().split() for c in act_op_chunks]
                self.act_bm25[code] = {
                    "chunks": act_op_chunks,
                    "bm25": BM25Okapi(corpus)
                }

        print("Connecting to ChromaDB...")
        client = chromadb.PersistentClient(path=CHROMA_DIR)
        self.collection = client.get_collection(name=COLLECTION_NAME)
        print(f"ChromaDB chunks: {self.collection.count()}")

    def semantic_search(
        self,
        query: str,
        top_k: int = 15,
        target_source: Optional[str] = None
    ) -> List[Dict]:
        """
        Dense vector semantic search with optional metadata source filter.
        """
        embedding = self.model.encode(
            [query],
            normalize_embeddings=True
        )

        where_clause = None
        if target_source:
            where_clause = {"source": target_source}

        results = self.collection.query(
            query_embeddings=embedding.tolist(),
            n_results=min(top_k * 2, 50),
            where=where_clause
        )

        output = []
        if not results or not results["documents"] or not results["documents"][0]:
            return output

        rank = 1
        for i in range(len(results["documents"][0])):
            metadata = results["metadatas"][0][i]
            cid = metadata["chunk_id"]
            src = metadata["source"]

            # Filter out TOC chunks from substantive semantic results
            chunk_obj = self.indexer.get_chunk(src, cid)
            if chunk_obj and chunk_obj.get("is_toc", False):
                continue

            statute_code = chunk_obj.get("statute_code") if chunk_obj else None
            statute_name = chunk_obj.get("statute_name") if chunk_obj else None

            output.append({
                "source": src,
                "statute_code": statute_code,
                "statute_name": statute_name,
                "statute_short": statute_code,
                "page": metadata.get("page"),
                "page_start": metadata.get("page_start", metadata.get("page")),
                "page_end": metadata.get("page_end", metadata.get("page")),
                "chunk_id": cid,
                "text": results["documents"][0][i],
                "semantic_rank": rank,
                "semantic_distance": results["distances"][0][i],
                "retrieval_method": "semantic_vector",
            })
            rank += 1
            if len(output) >= top_k:
                break

        return output

    def bm25_search(
        self,
        query: str,
        top_k: int = 15,
        target_act: Optional[str] = None
    ) -> List[Dict]:
        """
        BM25 lexical search over operative statutory provisions.
        """
        tokens = query.lower().split()
        if not tokens:
            return []

        # If a specific act is targeted, use isolated act BM25
        if target_act and target_act in self.act_bm25:
            pool = self.act_bm25[target_act]["chunks"]
            bm25_model = self.act_bm25[target_act]["bm25"]
        else:
            pool = self.bm25_chunks
            bm25_model = self.bm25

        scores = bm25_model.get_scores(tokens)
        ranked_indices = sorted(
            range(len(scores)),
            key=lambda i: scores[i],
            reverse=True
        )[:top_k]

        output = []
        for rank, index in enumerate(ranked_indices, start=1):
            chunk = pool[index]
            output.append({
                "source": chunk["source"],
                "statute_code": chunk.get("statute_code"),
                "statute_name": chunk.get("statute_name"),
                "statute_short": chunk.get("statute_code"),
                "page": chunk.get("page"),
                "page_start": chunk.get("page_start", chunk.get("page")),
                "page_end": chunk.get("page_end", chunk.get("page")),
                "chunk_id": chunk["chunk_id"],
                "text": chunk["text"],
                "bm25_rank": rank,
                "bm25_score": float(scores[index]),
                "retrieval_method": "bm25_lexical",
            })

        return output

    def rrf_fusion(
        self,
        semantic_results: List[Dict],
        bm25_results: List[Dict],
        top_k: int = 15,
        rrf_k: int = 60
    ) -> List[Dict]:
        """
        Reciprocal Rank Fusion across semantic and BM25 candidate lists.
        """
        fused = {}

        for result in semantic_results:
            key = (result["source"], result["chunk_id"])
            if key not in fused:
                fused[key] = {**result, "rrf_score": 0.0}
            fused[key]["rrf_score"] += 1.0 / (rrf_k + result["semantic_rank"])

        for result in bm25_results:
            key = (result["source"], result["chunk_id"])
            if key not in fused:
                fused[key] = {**result, "rrf_score": 0.0}
            else:
                fused[key]["bm25_rank"] = result["bm25_rank"]
                fused[key]["bm25_score"] = result["bm25_score"]
            fused[key]["rrf_score"] += 1.0 / (rrf_k + result["bm25_rank"])

        ranked = sorted(
            fused.values(),
            key=lambda x: x["rrf_score"],
            reverse=True
        )

        for rank, item in enumerate(ranked, 1):
            item["fused_rank"] = rank
            if "semantic_rank" in item and "bm25_rank" in item:
                item["retrieval_method"] = "hybrid_rrf"

        return ranked[:top_k]

    def search(
        self,
        query: str,
        top_k: int = 15
    ) -> List[Dict]:
        """
        Query-Adaptive Legal Retrieval:
        1. Analyzes legal query (intent, act, section, synonyms).
        2. If exact section: retrieves exact operative provision chunks first,
           then supplements with act-filtered hybrid candidates.
        3. If conceptual/cross-act: executes hybrid BM25 + dense vector RRF
           over operative chunks without TOC contamination.
        """
        # Step 1: Legal Query Analysis
        analysis: QueryAnalysis = analyze_legal_query(query)
        target_act = analysis.target_act
        target_source = analysis.target_source_file
        target_section = analysis.target_section
        intent = analysis.intent

        candidates: List[Dict] = []
        seen_keys = set()

        # Step 2: Handle Exact Statutory Queries
        if analysis.is_exact_section and target_act and target_section:
            print(f"[Retriever] Exact statutory lookup triggered: {target_act} Section {target_section}")
            exact_chunks = self.indexer.get_exact_section_chunks(target_act, target_section)

            for rank, chunk in enumerate(exact_chunks, 1):
                key = (chunk["source"], chunk["chunk_id"])
                if key not in seen_keys:
                    seen_keys.add(key)
                    item = {
                        **chunk,
                        "retrieval_method": "exact_statutory_provision",
                        "rrf_score": 1.0 - (rank * 0.01),  # Top ranking tier (0.99, 0.98...)
                        "exact_match": True,
                        "target_section": target_section,
                        "target_act": target_act,
                    }
                    candidates.append(item)

        # Step 3: Handle Cross-Act Concordance Queries
        if analysis.is_concordance_query and analysis.concordance_info:
            c_info = analysis.concordance_info
            corr_act = c_info.get("corresponding_act")
            corr_sec = c_info.get("corresponding_section")
            if corr_act and corr_sec:
                corr_chunks = self.indexer.get_exact_section_chunks(corr_act, corr_sec)
                for rank, chunk in enumerate(corr_chunks, 1):
                    key = (chunk["source"], chunk["chunk_id"])
                    if key not in seen_keys:
                        seen_keys.add(key)
                        item = {
                            **chunk,
                            "retrieval_method": "statutory_concordance",
                            "rrf_score": 0.85 - (rank * 0.01),
                            "concordance_match": True,
                            "concordance_note": f"Equivalent of {c_info.get('historical_act')} Section {c_info.get('historical_section')} ({c_info.get('description')})"
                        }
                        candidates.append(item)

        # Step 4: Hybrid BM25 + Semantic Search for remaining slots
        needed_hybrid = max(top_k - len(candidates), 5)
        
        # Build expanded query if legal synonyms exist
        search_query = query
        if analysis.expanded_terms:
            search_query = query + " " + " ".join(analysis.expanded_terms[:3])

        semantic_res = self.semantic_search(
            query=search_query,
            top_k=needed_hybrid * 2,
            target_source=target_source
        )

        bm25_res = self.bm25_search(
            query=search_query,
            top_k=needed_hybrid * 2,
            target_act=target_act
        )

        fused_res = self.rrf_fusion(
            semantic_results=semantic_res,
            bm25_results=bm25_res,
            top_k=needed_hybrid * 2
        )

        for item in fused_res:
            key = (item["source"], item["chunk_id"])
            if key not in seen_keys:
                seen_keys.add(key)
                candidates.append(item)

            if len(candidates) >= top_k:
                break

        return candidates[:top_k]
