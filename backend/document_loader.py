"""
backend/document_loader.py
Extract plain text from PDF, DOCX, and TXT resume files.
"""
import os
import pdfplumber
from docx import Document


def extract_text(file_path: str) -> str:
    """
    Extract readable text from a resume file.

    Supports:
        - PDF  (.pdf)  via pdfplumber
        - DOCX (.docx) via python-docx
        - TXT  (.txt)  via built-in open()

    Args:
        file_path: Absolute path to the uploaded resume file.

    Returns:
        Extracted text as a single string.

    Raises:
        ValueError: If the file extension is not supported.
        FileNotFoundError: If the file does not exist.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf":
        return _extract_pdf(file_path)
    elif ext == ".docx":
        return _extract_docx(file_path)
    elif ext == ".txt":
        return _extract_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: '{ext}'. Allowed: .pdf, .docx, .txt")


# ── Private helpers ────────────────────────────────────────────────────────────

def _extract_pdf(file_path: str) -> str:
    pages = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text.strip())
    return "\n\n".join(pages)


def _extract_docx(file_path: str) -> str:
    doc = Document(file_path)
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs)


def _extract_txt(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()
