"""
backend/main.py
FastAPI application – entry point.

Endpoints:
    POST   /upload                  Upload a resume (PDF/DOCX/TXT)
    POST   /ask                     Ask a question about an uploaded resume
    POST   /summary                 Get a professional resume summary
    POST   /interview-questions     Generate tailored interview questions
    POST   /skills                  Extract technical skills
    GET    /documents               List all indexed document IDs
    DELETE /document/{document_id}  Delete a resume and its vector index
    GET    /health                  Health check
"""
import logging
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import aiofiles

from backend.rag_pipeline import (
    ingest_resume,
    answer_question,
    summarize_resume,
    get_interview_questions,
    extract_skills,
    list_all_documents,
    remove_document,
)

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("ai_resume_qa")


# ── Lifespan ───────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: pre-warm the embedding model so the first upload is fast.
    Shutdown: nothing to clean up (FAISS indices are file-backed).
    """
    logger.info("🚀  Starting AI Resume Q&A API…")
    try:
        from backend.embeddings import _get_model
        _get_model()
        logger.info("✅  Bi-encoder (BAAI/bge-small-en-v1.5) loaded and ready.")
    except Exception as exc:
        logger.warning("⚠️  Could not pre-warm bi-encoder: %s", exc)

    try:
        from backend.reranker import _get_reranker
        _get_reranker()
        logger.info("✅  Cross-encoder (ms-marco-MiniLM-L-6-v2) loaded and ready.")
    except Exception as exc:
        logger.warning("⚠️  Could not pre-warm cross-encoder reranker: %s", exc)

    # Ensure upload directory exists
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    yield  # ← app runs here

    logger.info("🔴  Server shutting down.")


# ── App setup ──────────────────────────────────────────────────────────────────
# ── App setup ────────────────────────────────────────────────────────────────
UPLOADS_DIR = Path(__file__).parent.parent / "uploads"
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001",
).split(",")

app = FastAPI(
    title="AI Resume Q&A API",
    description="Upload a resume and ask questions powered by FAISS + Gemini.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic models ────────────────────────────────────────────────────────────
class AskRequest(BaseModel):
    document_id: str = Field(..., description="ID returned by /upload")
    question: str = Field(..., min_length=3, description="Question about the resume")


class DocumentRequest(BaseModel):
    document_id: str = Field(..., description="ID returned by /upload")


class UploadResponse(BaseModel):
    document_id: str
    filename: str
    chunk_count: int
    preview: str
    message: str


class AskResponse(BaseModel):
    document_id: str
    question: str
    answer: str
    sources: list[str]


class TextResponse(BaseModel):
    document_id: str
    result: str


class DocumentsResponse(BaseModel):
    documents: list[str]
    count: int


class DeleteResponse(BaseModel):
    message: str
    document_id: str


# ── Utility ────────────────────────────────────────────────────────────────────
@app.get("/health", tags=["Utility"])
async def health_check():
    """Basic health probe used by load balancers and monitoring."""
    return {"status": "ok", "service": "AI Resume Q&A API", "version": "1.0.0"}


# ── Resume management ──────────────────────────────────────────────────────────
@app.get("/documents", response_model=DocumentsResponse, tags=["Resume"])
async def get_all_documents():
    """Return all currently indexed document IDs and their count."""
    docs = list_all_documents()
    logger.info("Listed %d indexed documents.", len(docs))
    return DocumentsResponse(documents=docs, count=len(docs))


@app.post("/upload", response_model=UploadResponse, tags=["Resume"])
async def upload_resume(file: UploadFile = File(...)):
    """
    Upload a resume file (PDF, DOCX, or TXT).
    Returns a document_id used for subsequent Q&A calls.
    """
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    document_id = str(uuid.uuid4())
    save_path = UPLOADS_DIR / f"{document_id}{ext}"

    logger.info("Uploading '%s' → document_id=%s", file.filename, document_id)

    # Stream file to disk
    async with aiofiles.open(save_path, "wb") as out_file:
        content = await file.read()
        await out_file.write(content)

    try:
        result = ingest_resume(str(save_path), document_id)
    except Exception as exc:
        save_path.unlink(missing_ok=True)
        logger.error("Ingestion failed for %s: %s", document_id, exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process resume: {str(exc)}",
        )

    logger.info(
        "Indexed '%s' → %d chunks (document_id=%s)",
        file.filename, result["chunk_count"], document_id,
    )

    return UploadResponse(
        document_id=document_id,
        filename=file.filename,
        chunk_count=result["chunk_count"],
        preview=result["preview"],
        message="Resume uploaded and indexed successfully.",
    )


@app.delete("/document/{document_id}", response_model=DeleteResponse, tags=["Resume"])
async def delete_document(document_id: str):
    """
    Delete a resume's vector index and the uploaded file.
    Call this when the user chooses to upload a different resume.
    """
    deleted = remove_document(document_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No document found with id '{document_id}'.",
        )

    # Also remove the raw uploaded file (any supported extension)
    for ext in ALLOWED_EXTENSIONS:
        path = UPLOADS_DIR / f"{document_id}{ext}"
        path.unlink(missing_ok=True)

    logger.info("Deleted document_id=%s", document_id)
    return DeleteResponse(
        message=f"Document '{document_id}' deleted successfully.",
        document_id=document_id,
    )


# ── Q&A endpoints ──────────────────────────────────────────────────────────────
@app.post("/ask", response_model=AskResponse, tags=["Q&A"])
async def ask_question_endpoint(body: AskRequest):
    """
    Ask a question about an uploaded resume.
    Uses FAISS similarity search + Gemini to generate an answer.
    """
    logger.info("Q&A request → doc=%s | q='%s'", body.document_id, body.question[:60])
    try:
        result = answer_question(body.document_id, body.question)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.error("Answer generation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating answer: {str(exc)}",
        )

    return AskResponse(
        document_id=body.document_id,
        question=body.question,
        answer=result["answer"],
        sources=result["sources"],
    )


@app.post("/summary", response_model=TextResponse, tags=["Q&A"])
async def resume_summary(body: DocumentRequest):
    """Generate a structured professional summary of the uploaded resume."""
    logger.info("Summary request → doc=%s", body.document_id)
    try:
        summary = summarize_resume(body.document_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.error("Summary generation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating summary: {str(exc)}",
        )
    return TextResponse(document_id=body.document_id, result=summary)


@app.post("/interview-questions", response_model=TextResponse, tags=["Q&A"])
async def interview_questions(body: DocumentRequest):
    """Generate 10 tailored interview questions based on the resume."""
    logger.info("Interview-questions request → doc=%s", body.document_id)
    try:
        questions = get_interview_questions(body.document_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.error("Interview-question generation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating questions: {str(exc)}",
        )
    return TextResponse(document_id=body.document_id, result=questions)


@app.post("/skills", response_model=TextResponse, tags=["Q&A"])
async def skill_extraction(body: DocumentRequest):
    """Extract and categorise technical skills from the uploaded resume."""
    logger.info("Skills request → doc=%s", body.document_id)
    try:
        skills = extract_skills(body.document_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.error("Skills extraction failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error extracting skills: {str(exc)}",
        )
    return TextResponse(document_id=body.document_id, result=skills)


# ── Entry point (python -m backend.main or python start_backend.py) ────────────
if __name__ == "__main__":
    import uvicorn as _uvicorn
    _uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

