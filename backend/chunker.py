"""
backend/chunker.py
Splits resume text into overlapping chunks suitable for embedding.

Strategy: RecursiveCharacterTextSplitter from LangChain, which tries to
split on paragraph breaks → line breaks → sentences → words → characters,
preserving as much semantic context as possible per chunk.
"""
from typing import List

from langchain.text_splitter import RecursiveCharacterTextSplitter

# ── Configuration ─────────────────────────────────────────────────────────────
CHUNK_SIZE = 500        # characters per chunk
CHUNK_OVERLAP = 100     # overlap between consecutive chunks

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    separators=["\n\n", "\n", ".", " ", ""],
    length_function=len,
)


def chunk_text(text: str) -> List[str]:
    """
    Split resume text into overlapping chunks.

    Args:
        text: Full extracted resume text.

    Returns:
        List of non-empty text chunk strings.

    Raises:
        ValueError: If no chunks can be produced from the text.
    """
    if not text or not text.strip():
        raise ValueError("Cannot chunk empty text.")

    raw_chunks = _splitter.split_text(text)
    chunks = [c.strip() for c in raw_chunks if c.strip()]

    if not chunks:
        raise ValueError("Chunking produced no usable text segments.")

    return chunks


def chunk_with_metadata(text: str, document_id: str) -> List[dict]:
    """
    Split text and attach metadata to each chunk.

    Args:
        text:        Full resume text.
        document_id: ID of the uploaded document.

    Returns:
        List of dicts: {chunk_id, text, source, char_start, char_end}
    """
    chunks = chunk_text(text)
    result = []
    offset = 0
    for i, chunk in enumerate(chunks):
        start = text.find(chunk, offset)
        end = start + len(chunk) if start != -1 else offset + len(chunk)
        result.append({
            "chunk_id": i,
            "text": chunk,
            "source": document_id,
            "char_start": max(start, 0),
            "char_end": end,
        })
        if start != -1:
            offset = start + 1   # advance past this hit
    return result
