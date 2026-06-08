"""
backend/embeddings.py
Wraps sentence-transformers for generating dense vector embeddings.
"""
from typing import List
from sentence_transformers import SentenceTransformer

# Model is downloaded once and cached by sentence-transformers
_MODEL_NAME = "BAAI/bge-small-en-v1.5"
_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    """Lazy-load the embedding model (singleton)."""
    global _model
    if _model is None:
        _model = SentenceTransformer(_MODEL_NAME)
    return _model


def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Convert a list of text strings into dense float vectors.

    Args:
        texts: List of text chunks to embed.

    Returns:
        List of embedding vectors (list of floats).
    """
    model = _get_model()
    embeddings = model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
    return embeddings.tolist()


def embed_query(query: str) -> List[float]:
    """
    Embed a single query string.

    Args:
        query: The user's question.

    Returns:
        A single embedding vector.
    """
    model = _get_model()
    return model.encode([query], show_progress_bar=False, convert_to_numpy=True)[0].tolist()


def embedding_dimension() -> int:
    """Return the dimensionality of the embedding model output."""
    return _get_model().get_sentence_embedding_dimension()
