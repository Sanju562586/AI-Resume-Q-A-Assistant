"""
backend/main.py
FastAPI application – entry point.

Endpoints:
    POST /upload            Upload a resume (PDF/DOCX/TXT)
    POST /ask               Ask a question about an uploaded resume
    POST /summary           Get a professional resume summary
    POST /interview-questions  Generate tailored interview questions
    GET  /health            Health check
"""
import os
import uuid
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
)

load_dotenv()

# ── App setup ──────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Resume Q&A API",
    description="Upload a resume and ask questions powered by FAISS + Gemini.",
    version="1.0.0",
)

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOADS_DIR = Path(__file__).parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}


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


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.get("/health", tags=["Utility"])
async def health_check():
    return {"status": "ok", "service": "AI Resume Q&A API"}


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

    # Stream file to disk
    async with aiofiles.open(save_path, "wb") as out_file:
        content = await file.read()
        await out_file.write(content)

    try:
        result = ingest_resume(str(save_path), document_id)
    except Exception as exc:
        save_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process resume: {str(exc)}",
        )

    return UploadResponse(
        document_id=document_id,
        filename=file.filename,
        chunk_count=result["chunk_count"],
        preview=result["preview"],
        message="Resume uploaded and indexed successfully.",
    )


@app.post("/ask", response_model=AskResponse, tags=["Q&A"])
async def ask_question(body: AskRequest):
    """
    Ask a question about an uploaded resume.
    Uses FAISS similarity search + Gemini to generate an answer.
    """
    try:
        result = answer_question(body.document_id, body.question)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
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
    try:
        summary = summarize_resume(body.document_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating summary: {str(exc)}",
        )
    return TextResponse(document_id=body.document_id, result=summary)


@app.post("/interview-questions", response_model=TextResponse, tags=["Q&A"])
async def interview_questions(body: DocumentRequest):
    """Generate 10 tailored interview questions based on the resume."""
    try:
        questions = get_interview_questions(body.document_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating questions: {str(exc)}",
        )
    return TextResponse(document_id=body.document_id, result=questions)


@app.post("/skills", response_model=TextResponse, tags=["Q&A"])
async def skill_extraction(body: DocumentRequest):
    """Extract technical skills from the uploaded resume."""
    try:
        skills = extract_skills(body.document_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error extracting skills: {str(exc)}",
        )
    return TextResponse(document_id=body.document_id, result=skills)
