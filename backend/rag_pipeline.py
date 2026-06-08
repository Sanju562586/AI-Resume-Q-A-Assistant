"""
backend/rag_pipeline.py
Orchestrates the full RAG pipeline:
  Upload → Extract → Chunk → Embed → Store → Retrieve → Answer

Functions exposed to main.py:
    ingest_resume(file_path, document_id)  → dict
    answer_question(document_id, question) → dict
    summarize_resume(document_id)          → str
    get_interview_questions(document_id)   → str
    extract_skills(document_id)            → str
"""
from typing import Dict, Any, List

from backend.document_loader import extract_text
from backend.chunker import chunk_text
from backend.vector_store import store_chunks, retrieve, retrieve_all, document_exists
from backend.llm import (
    generate_answer,
    generate_summary,
    generate_interview_questions,
    generate_skills,
)


# ── Internal helpers ───────────────────────────────────────────────────────────

def _get_all_chunks(document_id: str, query: str, top_k: int = 15) -> List[Dict[str, Any]]:
    """
    Retrieve up to top_k relevant chunks. If fewer than top_k exist
    (short resume), retrieve everything that is stored.
    """
    return retrieve(document_id, query, top_k=top_k)


def _assert_exists(document_id: str) -> None:
    if not document_exists(document_id):
        raise FileNotFoundError(
            f"No resume indexed for document_id='{document_id}'. "
            "Please upload the resume first via POST /upload."
        )


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
        raise ValueError("Could not extract any readable text from the uploaded file. "
                         "Ensure the file is not scanned/image-only.")

    # Step 2: Chunk text
    chunks = chunk_text(raw_text)

    # Step 3: Embed + Store in FAISS
    store_chunks(document_id, chunks)

    return {
        "document_id": document_id,
        "chunk_count": len(chunks),
        "preview": raw_text[:300].strip(),
    }


def answer_question(document_id: str, question: str, top_k: int = 5) -> Dict[str, Any]:
    """
    Retrieve relevant chunks and generate an LLM answer.

    Args:
        document_id: The resume to query.
        question:    User's natural-language question.
        top_k:       Number of context chunks to retrieve (default 5).

    Returns:
        Dict with 'answer' (str) and 'sources' (list of snippet strings).
    """
    _assert_exists(document_id)

    # Similarity search – retrieve top-k context chunks
    relevant_chunks = _get_all_chunks(document_id, question, top_k=top_k)

    # LLM generation
    answer = generate_answer(question, relevant_chunks)

    return {
        "answer": answer,
        "sources": [c["text"][:200] + "…" for c in relevant_chunks],
        "chunk_count": len(relevant_chunks),
    }


def summarize_resume(document_id: str) -> str:
    """
    Generate a structured professional summary for the full resume.

    Returns broad context by querying across multiple key topics.
    """
    _assert_exists(document_id)
    chunks = _get_all_chunks(
        document_id,
        query="skills experience education projects summary achievements",
        top_k=20,
    )
    return generate_summary(chunks)


def get_interview_questions(document_id: str) -> str:
    """Generate 10 tailored interview questions based on the resume."""
    _assert_exists(document_id)
    chunks = _get_all_chunks(
        document_id,
        query="technical skills projects work experience achievements",
        top_k=20,
    )
    return generate_interview_questions(chunks)


def extract_skills(document_id: str) -> str:
    """Extract and categorise technical skills from the resume."""
    _assert_exists(document_id)
    chunks = _get_all_chunks(
        document_id,
        query="technical skills programming languages frameworks databases tools cloud",
        top_k=20,
    )
    return generate_skills(chunks)
