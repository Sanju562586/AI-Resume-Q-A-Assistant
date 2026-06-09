"""
backend/rag_pipeline.py
Orchestrates the full RAG pipeline with two-stage retrieval:

  Upload → Extract → Chunk → Embed → Store (FAISS)
       ↓
  Query → FAISS retrieval (top-k) → Cross-encoder reranking → LLM

Functions exposed to main.py:
    ingest_resume(file_path, document_id)  → dict
    answer_question(document_id, question) → dict
    summarize_resume(document_id)          → str
    get_interview_questions(document_id)   → str
    extract_skills(document_id)            → str
    list_all_documents()                   → list[str]
    remove_document(document_id)           → bool

Two-stage retrieval constants
------------------------------
FAISS_CANDIDATE_K   – number of candidates retrieved by bi-encoder (wide net)
RERANK_TOP_N_QA     – top chunks kept by cross-encoder for Q&A
RERANK_TOP_N_BROAD  – top chunks kept for summary / interview / skills
"""
from typing import Dict, Any, List

from backend.document_loader import extract_text
from backend.chunker import chunk_text
from backend.vector_store import (
    store_chunks,
    retrieve,
    retrieve_all,
    document_exists,
    list_documents,
    delete_document as _vs_delete,
)
from backend.reranker import rerank
from backend.llm import (
    generate_answer,
    generate_summary,
    generate_interview_questions,
    generate_skills,
)

# ── Two-stage retrieval settings ───────────────────────────────────────────────
# Stage 1 (FAISS): retrieve a wide candidate pool
FAISS_CANDIDATE_K = 20

# Stage 2 (cross-encoder): keep only the most relevant subset
RERANK_TOP_N_QA     = 5   # tighter focus for direct Q&A
RERANK_TOP_N_BROAD  = 10  # more context for summary / interview / skills


# ── Internal helpers ───────────────────────────────────────────────────────────

def _assert_exists(document_id: str) -> None:
    """Raise FileNotFoundError if the document has not been indexed."""
    if not document_exists(document_id):
        raise FileNotFoundError(
            f"No resume indexed for document_id='{document_id}'. "
            "Please upload the resume first via POST /upload."
        )


def _retrieve_and_rerank(
    document_id: str,
    query: str,
    *,
    candidate_k: int = FAISS_CANDIDATE_K,
    top_n: int = RERANK_TOP_N_QA,
) -> List[Dict[str, Any]]:
    """
    Two-stage retrieval:
      1. FAISS bi-encoder → ``candidate_k`` approximate nearest neighbours.
      2. Cross-encoder reranker → ``top_n`` most relevant chunks.

    Args:
        document_id: The indexed resume to search.
        query:       User question or topic string.
        candidate_k: How many candidates to pull from FAISS (stage 1).
        top_n:       How many to keep after reranking (stage 2).

    Returns:
        List of chunk dicts sorted by cross-encoder score (best first).
        Each dict contains: chunk_id, text, source, distance, rerank_score.
    """
    # Stage 1 – fast vector search
    candidates = retrieve(document_id, query, top_k=candidate_k)

    # Stage 2 – precise cross-encoder reranking
    return rerank(query, candidates, top_n=top_n)


# ── Public pipeline functions ──────────────────────────────────────────────────

def ingest_resume(file_path: str, document_id: str) -> Dict[str, Any]:
    """
    Full ingestion pipeline: extract → chunk → embed → store in FAISS.

    Args:
        file_path:   Absolute path to the uploaded resume file.
        document_id: Unique identifier for this resume.

    Returns:
        Dict with document_id, chunk_count, and a 300-char preview snippet.

    Raises:
        ValueError: If the file yields no readable text or chunks.
    """
    # Step 1: Extract raw text
    raw_text = extract_text(file_path)
    if not raw_text.strip():
        raise ValueError(
            "Could not extract any readable text from the uploaded file. "
            "Ensure the file is not scanned/image-only."
        )

    # Step 2: Chunk text
    chunks = chunk_text(raw_text)

    # Step 3: Embed + store in FAISS
    store_chunks(document_id, chunks)

    return {
        "document_id": document_id,
        "chunk_count": len(chunks),
        "preview": raw_text[:300].strip(),
    }


def answer_question(document_id: str, question: str) -> Dict[str, Any]:
    """
    Two-stage retrieval + LLM answer generation for a Q&A query.

    Stage 1 – FAISS retrieves top-{FAISS_CANDIDATE_K} approximate neighbours.
    Stage 2 – Cross-encoder picks the best {RERANK_TOP_N_QA} from those.

    Args:
        document_id: The resume to query.
        question:    User's natural-language question.

    Returns:
        Dict with 'answer' (str) and 'sources' (list of snippet strings).
    """
    _assert_exists(document_id)

    relevant_chunks = _retrieve_and_rerank(
        document_id,
        question,
        candidate_k=FAISS_CANDIDATE_K,
        top_n=RERANK_TOP_N_QA,
    )

    answer = generate_answer(question, relevant_chunks)

    return {
        "answer": answer,
        "sources": [c["text"][:200] + "…" for c in relevant_chunks],
        "chunk_count": len(relevant_chunks),
    }


def summarize_resume(document_id: str) -> str:
    """
    Generate a structured professional summary using two-stage retrieval.

    Uses a broad query to cover all key resume sections, then reranks
    to surface the most informative chunks.
    """
    _assert_exists(document_id)
    chunks = _retrieve_and_rerank(
        document_id,
        query="skills experience education projects summary achievements career",
        candidate_k=FAISS_CANDIDATE_K,
        top_n=RERANK_TOP_N_BROAD,
    )
    return generate_summary(chunks)


def get_interview_questions(document_id: str) -> str:
    """Generate 10 tailored interview questions using two-stage retrieval."""
    _assert_exists(document_id)
    chunks = _retrieve_and_rerank(
        document_id,
        query="technical skills projects work experience achievements responsibilities",
        candidate_k=FAISS_CANDIDATE_K,
        top_n=RERANK_TOP_N_BROAD,
    )
    return generate_interview_questions(chunks)


def extract_skills(document_id: str) -> str:
    """Extract and categorise technical skills using two-stage retrieval."""
    _assert_exists(document_id)
    chunks = _retrieve_and_rerank(
        document_id,
        query="technical skills programming languages frameworks databases tools cloud platforms",
        candidate_k=FAISS_CANDIDATE_K,
        top_n=RERANK_TOP_N_BROAD,
    )
    return generate_skills(chunks)


# ── Document management ────────────────────────────────────────────────────────

def list_all_documents() -> List[str]:
    """Return a list of all currently indexed document IDs."""
    return list_documents()


def remove_document(document_id: str) -> bool:
    """Delete a document's vector index from disk. Returns True if found."""
    return _vs_delete(document_id)
