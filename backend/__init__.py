"""
backend package
Exports the core pipeline functions used by main.py.
"""
from backend.rag_pipeline import (
    ingest_resume,
    answer_question,
    summarize_resume,
    get_interview_questions,
    extract_skills,
    list_all_documents,
    remove_document,
)

__all__ = [
    "ingest_resume",
    "answer_question",
    "summarize_resume",
    "get_interview_questions",
    "extract_skills",
    "list_all_documents",
    "remove_document",
]
