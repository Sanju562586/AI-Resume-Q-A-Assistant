"""
backend/rag_pipeline.py
Orchestrates the full RAG pipeline:
  Upload → Extract → Chunk → Embed → Store → Retrieve → Answer
"""
import os
from typing import List, Dict, Any

# pyrefly: ignore [missing-import]
from langchain.text_splitter import RecursiveCharacterTextSplitter

from backend.document_loader import extract_text
from backend.vector_store import store_chunks, retrieve, document_exists
from backend.llm import generate_answer, generate_summary, generate_interview_questions, generate_skills

# ── Text Splitter config ───────────────────────────────────────────────────────
_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=100,
    separators=["\n\n", "\n", ".", " ", ""],
)


def create_chunks(text: str) -> List[str]:
    """
    Split raw resume text into overlapping chunks suitable for embedding.

    Args:
        text: Full extracted resume text.

    Returns:
        List of text chunk strings.
    """
    chunks = _splitter.split_text(text)
    # Filter out empty/whitespace-only chunks
    return [c.strip() for c in chunks if c.strip()]


def ingest_resume(file_path: str, document_id: str) -> Dict[str, Any]:
    """
    Full ingestion pipeline: extract → chunk → embed → store in FAISS.

    Args:
        file_path:   Path to the uploaded resume file.
        document_id: Unique identifier for this resume.

    Returns:
        Dict with document_id, chunk_count, and a preview snippet.
    """
    # Step 1: Extract text
    raw_text = extract_text(file_path)
    if not raw_text.strip():
        raise ValueError("Could not extract any text from the uploaded file.")

    # Step 2: Chunk text
    chunks = create_chunks(raw_text)
    if not chunks:
        raise ValueError("Text extraction produced no usable chunks.")

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
        question:    User's question.
        top_k:       Number of context chunks to retrieve.

    Returns:
        Dict with answer and the source chunks used.
    """
    if not document_exists(document_id):
        raise FileNotFoundError(
            f"No resume indexed for document_id='{document_id}'. Upload first."
        )

    # Step 1: Similarity search
    relevant_chunks = retrieve(document_id, question, top_k=top_k)

    # Step 2: LLM generation
    answer = generate_answer(question, relevant_chunks)

    return {
        "answer": answer,
        "sources": [c["text"][:150] + "..." for c in relevant_chunks],
        "chunk_count": len(relevant_chunks),
    }


def summarize_resume(document_id: str) -> str:
    """Generate a professional summary for the full resume."""
    if not document_exists(document_id):
        raise FileNotFoundError(
            f"No resume indexed for document_id='{document_id}'. Upload first."
        )
    # Retrieve broad context (use a generic summary query)
    chunks = retrieve(document_id, "skills experience education projects summary", top_k=15)
    return generate_summary(chunks)


def get_interview_questions(document_id: str) -> str:
    """Generate interview questions tailored to the resume."""
    if not document_exists(document_id):
        raise FileNotFoundError(
            f"No resume indexed for document_id='{document_id}'. Upload first."
        )
    chunks = retrieve(document_id, "skills projects experience achievements", top_k=15)
    return generate_interview_questions(chunks)


def extract_skills(document_id: str) -> str:
    """Extract technical skills from the resume."""
    if not document_exists(document_id):
        raise FileNotFoundError(
            f"No resume indexed for document_id='{document_id}'. Upload first."
        )
    chunks = retrieve(document_id, "technical skills programming languages frameworks databases tools", top_k=15)
    return generate_skills(chunks)
