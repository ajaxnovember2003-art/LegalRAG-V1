"""
LegalRAG Statutory Retrieval Benchmark

Evaluates ChromaDB dense semantic retrieval against indexed Official Gazette chunks
across Bharatiya Nyaya Sanhita (BNS), BNSS, and BSA 2023.
"""

from pathlib import Path
import chromadb
from sentence_transformers import SentenceTransformer

CHROMA_DIR = "chroma_db"
COLLECTION_NAME = "cognivault_documents"
MODEL_NAME = "all-MiniLM-L6-v2"
TOP_K = 5

LEGAL_BENCHMARK_QUESTIONS = [
    {
        "question": "What is the punishment for murder under BNS Section 103?",
        "expected_terms": ["103", "murder", "death", "imprisonment for life", "fine"],
        "statute": "BNS 2023",
    },
    {
        "question": "What is the procedure for zero FIR and electronic submission under BNSS Section 173?",
        "expected_terms": ["173", "cognizable", "electronic", "police station", "information"],
        "statute": "BNSS 2023",
    },
    {
        "question": "How is electronic and digital evidence made admissible under Bharatiya Sakshya Adhiniyam?",
        "expected_terms": ["electronic", "digital", "document", "evidence"],
        "statute": "BSA 2023",
    },
    {
        "question": "What are the statutory conditions for bail in non-bailable offences under Section 480 BNSS?",
        "expected_terms": ["480", "bail", "non-bailable", "court", "arrested"],
        "statute": "BNSS 2023",
    },
    {
        "question": "What constitutes cheating and dishonestly inducing property delivery under Section 318 BNS?",
        "expected_terms": ["318", "cheats", "deceiving", "fraudulently", "dishonestly"],
        "statute": "BNS 2023",
    },
    {
        "question": "When can a police officer arrest without warrant under Section 35 of BNSS?",
        "expected_terms": ["35", "arrest", "warrant", "police officer", "cognizable"],
        "statute": "BNSS 2023",
    },
    {
        "question": "What constitutes an electronic or digital record as a document under Section 2 BSA?",
        "expected_terms": ["document", "electronic", "record", "means"],
        "statute": "BSA 2023",
    },
    {
        "question": "What is the statutory definition of bail and bailable offence under Section 2 of BNSS?",
        "expected_terms": ["bail", "bailable offence", "bond", "court"],
        "statute": "BNSS 2023",
    },
    {
        "question": "What is the punishment for murder by a life convict under Section 104 BNS?",
        "expected_terms": ["104", "murder", "imprisonment for life", "death"],
        "statute": "BNS 2023",
    },
    {
        "question": "What are the provisions regarding oral and documentary evidence under BSA?",
        "expected_terms": ["evidence", "oral", "documentary", "statements"],
        "statute": "BSA 2023",
    },
]


def main():
    print("Loading embedding model...")
    model = SentenceTransformer(MODEL_NAME)

    print("Connecting to ChromaDB...")
    client = chromadb.PersistentClient(path=CHROMA_DIR)
    collection = client.get_collection(name=COLLECTION_NAME)

    total_passed = 0
    total_recall_hits = 0

    print("\n" + "=" * 70)
    print("LEGALRAG STATUTORY RETRIEVAL BENCHMARK")
    print("=" * 70)

    for index, item in enumerate(LEGAL_BENCHMARK_QUESTIONS, start=1):
        question = item["question"]
        expected_terms = item["expected_terms"]
        statute = item["statute"]

        query_embedding = model.encode(
            [question],
            normalize_embeddings=True
        )

        results = collection.query(
            query_embeddings=query_embedding.tolist(),
            n_results=TOP_K
        )

        documents = results["documents"][0]
        metadatas = results["metadatas"][0]

        combined_text = " ".join(documents).lower()

        matched_terms = [
            term for term in expected_terms if term.lower() in combined_text
        ]

        term_recall = len(matched_terms) / len(expected_terms)
        passed = len(matched_terms) >= 2

        if passed:
            total_passed += 1
            status = "PASS"
        else:
            status = "FAIL"

        print(f"\n[{index}/{len(LEGAL_BENCHMARK_QUESTIONS)}] {status} | {statute}")
        print(f"Query: {question}")
        print(f"Matched Terms ({len(matched_terms)}/{len(expected_terms)}): {matched_terms}")
        print(f"Top Source: {metadatas[0].get('source')} (Page {metadatas[0].get('page')})")

    accuracy = (total_passed / len(LEGAL_BENCHMARK_QUESTIONS)) * 100
    print("\n" + "=" * 70)
    print(f"OVERALL RETRIEVAL ACCURACY: {accuracy:.1f}% ({total_passed}/{len(LEGAL_BENCHMARK_QUESTIONS)} passed)")
    print("=" * 70)


if __name__ == "__main__":
    main()
