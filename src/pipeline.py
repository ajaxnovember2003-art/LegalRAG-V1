from .retriever import HybridRetriever
from .reranker import Reranker
from .context_builder import ContextBuilder
from .generator import AnswerGenerator


class Cognivault:

    def __init__(self):

        print("Initializing Cognivault...")

        # 1. Hybrid retrieval
        self.retriever = HybridRetriever()

        # 2. Cross-encoder reranking
        self.reranker = Reranker()

        # 3. Context expansion
        self.context_builder = ContextBuilder(
            self.retriever.chunks
        )

        # 4. LLM generation
        self.generator = AnswerGenerator()

        print("Cognivault ready.")

    def answer(self, question):

        # --------------------------------------------------
        # STEP 1: HYBRID RETRIEVAL
        # --------------------------------------------------

        print("\n[1/4] Retrieving evidence...")

        candidates = self.retriever.search(
            question,
            top_k=50
        )

        print(
            f"Retrieved {len(candidates)} candidates."
        )

        # --------------------------------------------------
        # STEP 2: RERANKING
        # --------------------------------------------------

        exact_matches_count = len([c for c in candidates if c.get("exact_match")])
        rerank_k = max(5, min(exact_matches_count, 8))

        reranked_results = self.reranker.rerank(
            question,
            candidates,
            top_k=rerank_k
        )

        print(
            f"Selected {len(reranked_results)} "
            "high-relevance chunks."
        )

        # --------------------------------------------------
        # STEP 3: CONTEXT EXPANSION
        # --------------------------------------------------

        print("\n[3/4] Expanding context...")

        context_results = self.context_builder.build(
            reranked_results,
            window=1
        )

        print(
            f"Context contains {len(context_results)} "
            "chunks after expansion."
        )

        # --------------------------------------------------
        # STEP 4: GROUNDED LLM GENERATION
        # --------------------------------------------------

        print("\n[4/4] Generating grounded answer...")

        answer = self.generator.generate(
            question,
            context_results
        )

        return answer, context_results


def main():

    cognivault = Cognivault()

    while True:

        question = input(
            "\nAsk Cognivault "
            "(type 'exit' to quit): "
        )

        if question.strip().lower() == "exit":
            print("\nExiting Cognivault.")
            break

        if not question.strip():
            print("Please enter a question.")
            continue

        try:

            answer, results = cognivault.answer(
                question
            )

            print("\n" + "=" * 70)
            print("COGNIVAULT ANSWER")
            print("=" * 70)

            print(answer)

            print("\n" + "=" * 70)
            print("EVIDENCE SOURCES")
            print("=" * 70)

            shown = set()

            for result in results:

                key = (
                    result["source"],
                    result["chunk_id"]
                )

                if key in shown:
                    continue

                shown.add(key)

                page_start = result.get(
                    "page_start",
                    result.get("page")
                )

                page_end = result.get(
                    "page_end",
                    result.get("page")
                )

                if page_start == page_end:
                    page_text = f"Page {page_start}"
                else:
                    page_text = (
                        f"Pages {page_start}-{page_end}"
                    )

                rerank_score = result.get(
                    "rerank_score",
                    0
                )

                print(
                    f"{page_text} "
                    f"| Chunk {result['chunk_id']} "
                    f"| Rerank score "
                    f"{rerank_score:.4f}"
                )

        except Exception as error:

            print("\n" + "=" * 70)
            print("COGNIVAULT ERROR")
            print("=" * 70)

            print(error)


if __name__ == "__main__":
    main()

