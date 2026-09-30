import os

from google import genai


class AnswerGenerator:

    def __init__(self):

        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set."
            )

        self.client = genai.Client(
            api_key=api_key
        )

        self.model = "gemini-3.6-flash"

    def build_prompt(self, question, results):

        evidence_blocks = []

        for index, result in enumerate(
            results,
            start=1
        ):

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

            evidence_blocks.append(
                f"""
Evidence {index}
Source: {result['source']}
{page_text}
Chunk: {result['chunk_id']}

{result['text']}
"""
            )

        evidence = "\n".join(
            evidence_blocks
        )

        return f"""
You are  Legal RAG , an
evidence-grounded legal research assistant.

Your task is to answer the user's question
using ONLY the supplied legal document evidence.

The supplied documents may contain statutes,
procedural laws, evidence laws, judgments,
or case-related documents.

IMPORTANT:
You are a legal research and information
system. Do not claim to be a lawyer and do
not predict what a court will decide.

STRICT EVIDENCE RULES:

1. Use ONLY the supplied evidence.
2. Do NOT use outside legal knowledge.
3. Do NOT invent sections, provisions,
   facts, cases, punishments, procedures,
   or citations.
4. Every factual legal statement must be
   supported by supplied evidence.
5. Distinguish clearly between:
   - LAW SAYS
   - CASE DOCUMENT SAYS
   - INFERENCE
6. Do not present an inference as if it were
   directly stated by the law or case document.
7. If the evidence is insufficient, explicitly
   say that the supplied documents do not
   contain enough evidence to answer the
   question.
8. Cite every important statement using the
   supplied source and page information.
9. Never create a citation that does not
   correspond to the supplied evidence.
10. Prefer precise statutory sections when
    they appear in the evidence.
11. Keep the answer concise but informative.

OUTPUT FORMAT:

ANSWER
Give a direct answer to the question.

LAW SAYS
Explain the relevant legal provisions found
in the supplied evidence. Mention section
numbers only when they appear in the evidence.

CASE DOCUMENT SAYS
If the supplied evidence contains case-specific
material, explain the relevant facts or findings.
If no case-specific evidence is supplied, write:
"No case-specific document evidence was supplied."

INFERENCE
Explain the connection between the supplied
law and supplied case evidence, if such a
connection can actually be made.

If no reasonable inference can be made from
the evidence, say:
"No supported inference can be made from the
supplied evidence."

SOURCES
List the document source and page number(s)
used in the answer.

USER QUESTION:
{question}

DOCUMENT EVIDENCE:
{evidence}

Now answer the question using ONLY the
supplied evidence.
"""


    def generate(self, question, results):

        prompt = self.build_prompt(
            question,
            results
        )

        interaction = self.client.interactions.create(
            model=self.model,
            input=prompt
        )

        return interaction.output_text
