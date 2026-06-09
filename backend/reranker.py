"""
backend/reranker.py
Cross-encoder reranker for improving chunk relevance after FAISS retrieval.

Pipeline (Two-Stage Retrieval):
  Stage 1 – FAISS (bi-encoder):    Fast approximate nearest-neighbour search.
                                    Retrieves a large candidate pool (top-20).
  Stage 2 – Cross-encoder (this):  Accurate pairwise relevance scoring.
                                    Picks the truly best top-n from the pool.

Why cross-encoders beat bi-encoders for reranking
  A bi-encoder embeds query and chunk independently, then compares vectors.
  A cross-encoder sees both together (query + chunk concatenated), letting
  attention heads model fine-grained interactions — far more accurate for
  relevance, at the cost of higher latency (acceptable for small pools).

Model: cross-encoder/ms-marco-MiniLM-L-6-v2
  • Trained on MS MARCO passage-ranking dataset
  • ~22 MB download, ~6 ms per pair on CPU
  • Strong relevance signal for short Q-A style pairs
"""
import logging
from typing import List, Dict, Any

from sentence_transformers import CrossEncoder

logger = logging.getLogger("ai_resume_qa.reranker")

_MODEL_NAME = "cross-encoder/ms-marco-MiniLM-L-6-v2"
_reranker: CrossEncoder | None = None


# ── Model loading ──────────────────────────────────────────────────────────────

def _get_reranker() -> CrossEncoder:
    """Lazy-load the cross-encoder singleton (thread-safe for read access)."""
    global _reranker
    if _reranker is None:
        logger.info("Loading cross-encoder '%s'…", _MODEL_NAME)
        _reranker = CrossEncoder(_MODEL_NAME)
        logger.info("Cross-encoder loaded.")
    return _reranker


# ── Public API ─────────────────────────────────────────────────────────────────

def rerank(
    query: str,
    chunks: List[Dict[str, Any]],
    top_n: int = 5,
) -> List[Dict[str, Any]]:
    """
    Rerank retrieved chunks using a cross-encoder relevance model.

    Args:
        query:  The user's question or search topic.
        chunks: Candidate chunk dicts from FAISS — each must have a "text" key.
        top_n:  Maximum number of chunks to return after reranking.

    Returns:
        Up to ``top_n`` chunks sorted by cross-encoder score (highest first).
        Each returned chunk gains a "rerank_score" float field.

    Notes:
        • If ``chunks`` is empty, returns it unchanged.
        • If ``len(chunks) <= top_n``, all chunks are returned (still scored
          and sorted by relevance, so order may differ from FAISS order).
    """
    if not chunks:
        return chunks

    reranker = _get_reranker()

    # Build (query, passage) pairs for the cross-encoder
    pairs = [(query, chunk["text"]) for chunk in chunks]

    # predict() returns a numpy array of raw logit scores
    scores = reranker.predict(pairs, show_progress_bar=False)

    # We define "relevant for sure" as having a cross-encoder score > 0.0
    confident_chunks = []
    other_chunks = []
    
    for chunk, score in zip(chunks, scores):
        entry = dict(chunk)
        entry["rerank_score"] = float(score)
        if entry["rerank_score"] > 0.0:
            confident_chunks.append(entry)
        else:
            # Keep original FAISS retrieval order for fallback
            other_chunks.append(entry)

    # Sort confident chunks descending by cross-encoder score
    confident_chunks.sort(key=lambda c: c["rerank_score"], reverse=True)

    # Take up to top_n from the confident chunks
    result = confident_chunks[:top_n]

    # If we haven't filled the top_n slots, pad with the remaining chunks from FAISS
    if len(result) < top_n:
        slots_to_fill = top_n - len(result)
        result.extend(other_chunks[:slots_to_fill])

    logger.debug(
        "Reranked %d → %d chunks | confident=%d | top score=%.3f",
        len(chunks),
        len(result),
        len(confident_chunks),
        result[0]["rerank_score"] if result else 0.0,
    )

    return result
