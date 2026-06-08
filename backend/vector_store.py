"""
backend/vector_store.py
FAISS-backed vector store – per-document index stored on disk.

Each document gets its own FAISS flat index (IndexFlatL2) plus a companion
JSON metadata file so we can map result positions back to text chunks.

Directory layout (inside ./faiss_store/):
    faiss_store/
        {document_id}/
            index.faiss      ← FAISS binary index
            metadata.json    ← list of {chunk_id, text, source} dicts
"""
import json
import os
from typing import List, Dict, Any

import faiss
import numpy as np

from backend.embeddings import generate_embeddings, embed_query, embedding_dimension

STORE_DIR = os.path.join(os.path.dirname(__file__), "..", "faiss_store")


# ── Helpers ────────────────────────────────────────────────────────────────────

def _index_path(document_id: str) -> str:
    return os.path.join(STORE_DIR, document_id, "index.faiss")


def _meta_path(document_id: str) -> str:
    return os.path.join(STORE_DIR, document_id, "metadata.json")


def _ensure_dir(document_id: str) -> None:
    os.makedirs(os.path.join(STORE_DIR, document_id), exist_ok=True)


# ── Public API ─────────────────────────────────────────────────────────────────

def store_chunks(document_id: str, chunks: List[str]) -> None:
    """
    Embed all chunks and persist them in a FAISS index for the given document.

    Args:
        document_id: Unique identifier for the uploaded resume.
        chunks:      List of text chunks to embed and index.
    """
    _ensure_dir(document_id)

    embeddings = generate_embeddings(chunks)
    dim = embedding_dimension()

    # Build a flat L2 FAISS index (exact nearest-neighbour search)
    index = faiss.IndexFlatL2(dim)
    vectors = np.array(embeddings, dtype="float32")
    index.add(vectors)

    faiss.write_index(index, _index_path(document_id))

    metadata = [
        {"chunk_id": i, "text": chunk, "source": document_id}
        for i, chunk in enumerate(chunks)
    ]
    with open(_meta_path(document_id), "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)


def retrieve(document_id: str, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Find the top-k most semantically similar chunks for a query.

    Args:
        document_id: Resume to search against.
        query:       User's question.
        top_k:       Number of chunks to return.

    Returns:
        List of metadata dicts (chunk_id, text, source, distance).
    """
    if not os.path.exists(_index_path(document_id)):
        raise FileNotFoundError(
            f"No FAISS index found for document '{document_id}'. "
            "Please upload the resume first."
        )

    index = faiss.read_index(_index_path(document_id))

    with open(_meta_path(document_id), "r", encoding="utf-8") as f:
        metadata: List[Dict[str, Any]] = json.load(f)

    query_vec = np.array([embed_query(query)], dtype="float32")
    distances, indices = index.search(query_vec, top_k)

    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx == -1:           # FAISS returns -1 for unfilled slots
            continue
        entry = dict(metadata[idx])
        entry["distance"] = float(dist)
        results.append(entry)

    return results


def document_exists(document_id: str) -> bool:
    """Return True if a FAISS index exists for the given document."""
    return os.path.exists(_index_path(document_id))
