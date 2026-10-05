"""
LegalRAG FastAPI Backend

Minimal API layer over the existing Cognivault pipeline.
No retrieval logic is changed — this file only exposes
the pipeline via HTTP endpoints.
"""

import os
import time
import traceback
from typing import Any, Dict, List, Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.verifier import verify_answer
from src.statute_service import statute_service

# ─── Pydantic Schemas ───────────────────────────────────

class QueryRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="The legal question to ask LegalRAG."
    )


class SourceItem(BaseModel):
    source: Optional[str] = None
    statute_code: Optional[str] = None
    statute_name: Optional[str] = None
    statute_short: Optional[str] = None
    chunk_id: Optional[int] = None
    page: Optional[int] = None
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    page_display: Optional[str] = None
    text: Optional[str] = None
    detected_sections: Optional[List[str]] = None
    section_title: Optional[str] = None
    relevance_explanation: Optional[str] = None
    grounding_status: Optional[str] = None
    rerank_score: Optional[float] = None
    rrf_score: Optional[float] = None
    semantic_rank: Optional[int] = None
    semantic_distance: Optional[float] = None
    bm25_rank: Optional[int] = None
    bm25_score: Optional[float] = None
    is_toc: Optional[bool] = False
    retrieval_method: Optional[str] = None


class CitationItem(BaseModel):
    section: str
    section_num: str
    statute_code: str
    statute_name: str
    statute_short: str
    source_file: Optional[str] = None
    gazette_page: str
    chunk_id: Optional[int] = None
    status: str
    status_label: str
    evidence_snippet: str
    rerank_score: Optional[float] = None


class VerificationCheck(BaseModel):
    id: str
    name: str
    passed: bool
    detail: str


class VerificationDetails(BaseModel):
    overall_status: str
    overall_label: str
    is_abstention: bool
    total_cited_sections: int
    supported_sections_count: int
    cited_sections: List[str]
    citations: List[CitationItem]
    checks: List[VerificationCheck]
    statutes_referenced: List[str]


class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceItem]
    question: str
    processing_time_seconds: float
    pipeline_stages: List[str]
    verification: Optional[VerificationDetails] = None
    follow_ups: Optional[List[str]] = None


class HealthResponse(BaseModel):
    status: str
    pipeline_loaded: bool
    message: str
    chroma_chunks_count: Optional[int] = None
    bm25_chunks_count: Optional[int] = None
    cataloged_sections: Optional[int] = None


# ─── App Setup ──────────────────────────────────────────

app = FastAPI(
    title="LegalRAG API",
    description=(
        "Indian Legal Question Answering System — "
        "Evidence-Grounded RAG Pipeline & Statutory Catalog"
    ),
    version="2.0.0",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Pipeline Singleton ────────────────────────────────

pipeline_instance = None
pipeline_error = None


def try_load_pipeline():
    """Attempt to load or re-load the Cognivault pipeline if not already loaded."""
    global pipeline_instance, pipeline_error

    if pipeline_instance is not None:
        return True

    try:
        try:
            from dotenv import load_dotenv
            load_dotenv(override=True)
        except ImportError:
            pass

        from src.pipeline import Cognivault
        pipeline_instance = Cognivault()
        pipeline_error = None
        print("\n[API] LegalRAG pipeline loaded successfully.\n")
        return True
    except Exception as e:
        pipeline_error = str(e)
        print(f"\n[API] Pipeline load attempt: {e}\n")
        return False


@app.on_event("startup")
def startup_event():
    """Load the Cognivault pipeline on startup."""
    try_load_pipeline()


# ─── Query & Health Endpoints ──────────────────────────

@app.get("/api/health", response_model=HealthResponse)
def health_check():
    """Check whether the pipeline and statute service are loaded and ready."""
    if pipeline_instance is None:
        try_load_pipeline()

    statutes_summary = statute_service.get_statutes_summary()
    total_sections = sum(s.get("cataloged_sections_count", 0) for s in statutes_summary)

    if pipeline_instance is not None:
        chroma_count = None
        bm25_count = None
        try:
            chroma_count = pipeline_instance.retriever.collection.count()
            bm25_count = len(pipeline_instance.retriever.chunks)
        except Exception:
            pass

        return HealthResponse(
            status="healthy",
            pipeline_loaded=True,
            message="LegalRAG pipeline and statutory catalog are ready.",
            chroma_chunks_count=chroma_count,
            bm25_chunks_count=bm25_count,
            cataloged_sections=total_sections,
        )
    else:
        return HealthResponse(
            status="degraded",
            pipeline_loaded=False,
            message=(
                f"Pipeline not loaded: {pipeline_error}"
                if pipeline_error
                else "Pipeline is still loading."
            ),
            cataloged_sections=total_sections,
        )


@app.post("/api/query", response_model=QueryResponse)
def query_legal_rag(request: QueryRequest):
    """
    Submit a legal question to the LegalRAG pipeline.
    Runs hybrid retrieval, reranking, grounded generation, and citation verification.
    """
    if pipeline_instance is None:
        try_load_pipeline()

    if pipeline_instance is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "LegalRAG pipeline is not available. "
                f"{pipeline_error or 'Still loading.'}"
            ),
        )

    question = request.question.strip()

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty.",
        )

    start_time = time.time()

    try:
        answer, context_results = pipeline_instance.answer(
            question
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Pipeline error: {str(e)}",
        )

    elapsed = round(time.time() - start_time, 2)

    # Run Multi-Step Citation & Grounding Verification Engine
    verification_data = verify_answer(
        question=question,
        answer=answer,
        context_chunks=context_results,
    )

    enriched_sources_data = verification_data.get("enriched_sources", [])
    sources = [SourceItem(**s) for s in enriched_sources_data]

    verification_details = VerificationDetails(
        overall_status=verification_data["overall_status"],
        overall_label=verification_data["overall_label"],
        is_abstention=verification_data["is_abstention"],
        total_cited_sections=verification_data["total_cited_sections"],
        supported_sections_count=verification_data["supported_sections_count"],
        cited_sections=verification_data["cited_sections"],
        citations=[CitationItem(**c) for c in verification_data["citations"]],
        checks=[VerificationCheck(**ck) for ck in verification_data["checks"]],
        statutes_referenced=verification_data["statutes_referenced"],
    )

    pipeline_stages = [
        "Hybrid Retrieval (Semantic + BM25Okapi)",
        "RRF Fusion (Top 50 Candidates)",
        "Cross-Encoder Reranking (Top 5 Focused)",
        "Contiguous Context Expansion (Window ±1)",
        "Gemini 3.8 Flash Grounded Synthesis",
        "Citation & Statutory Grounding Verification",
    ]

    return QueryResponse(
        answer=answer,
        sources=sources,
        question=question,
        processing_time_seconds=elapsed,
        pipeline_stages=pipeline_stages,
        verification=verification_details,
        follow_ups=verification_data.get("follow_ups", []),
    )


# ─── Statutes Directory & Historical Concordance Endpoints ─

@app.get("/api/statutes")
def list_statutes():
    """List all supported Indian criminal statutes with cataloged section counts."""
    return statute_service.get_statutes_summary()


@app.get("/api/statutes/mappings")
def get_historical_mappings(
    statute_code: Optional[str] = Query(None, description="Optional statute code filter (e.g. bns-2023)")
):
    """Retrieve verified historical concordance table (IPC ↔ BNS, CrPC ↔ BNSS, IEA ↔ BSA)."""
    return statute_service.get_historical_mappings(statute_code=statute_code)


@app.get("/api/statutes/{statute_code}")
def get_statute(statute_code: str):
    """Get metadata for a specific statute."""
    statute = statute_service.get_statute(statute_code)
    if not statute:
        raise HTTPException(status_code=404, detail="Statute not found.")
    return statute


@app.get("/api/statutes/{statute_code}/sections")
def search_statute_sections(
    statute_code: str,
    q: Optional[str] = Query(None, description="Search keyword, section number, or phrase"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Browse and search sections within a statute or across all statutes."""
    return statute_service.search_sections(
        statute_code=statute_code,
        query=q,
        limit=limit,
        offset=offset,
    )


@app.get("/api/statutes/{statute_code}/sections/{section_number}")
def get_section_detail(statute_code: str, section_number: str):
    """Get complete statutory excerpt, chunk metadata, and historical equivalence for a section."""
    section = statute_service.get_section_detail(statute_code, section_number)
    if not section:
        raise HTTPException(
            status_code=404,
            detail=f"Section {section_number} not found in {statute_code} catalog.",
        )
    return section


# ─── Run ────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.api:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )

