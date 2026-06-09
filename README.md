# 🤖 AI Resume Q&A Assistant

An intelligent resume analysis tool powered by **FastAPI**, **FAISS**, **BGE embeddings**, and **Google Gemini**. Upload a resume and ask natural-language questions — get instant, accurate answers.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📤 **Resume Upload** | PDF, DOCX, TXT (up to 10 MB) |
| 🔍 **Q&A** | Ask any question about the resume |
| 📝 **Summary** | Auto-generated professional summary |
| 🛠️ **Skills Extraction** | Categorised technical skills list |
| 🎯 **Interview Questions** | 10 tailored interview questions |
| 🕐 **Conversation History** | Expandable log of every Q&A in the session |
| ⚡ **Vector Search** | FAISS + BGE-small embeddings |
| 🧠 **LLM** | Google Gemini 2.5 Flash (OpenAI fallback) |
| 🗑️ **Document Cleanup** | Delete indexed documents via API |

---

## 🏗️ Architecture

```
Next.js Frontend
      │
      ▼ REST API
FastAPI Backend
      │
      ├── Document Loader (PDF/DOCX/TXT)
      ├── Chunker (500 chars, 100 overlap)
      ├── BGE Embeddings (sentence-transformers)
      ├── FAISS Vector Store (per-document index)
      └── Gemini LLM (Q&A / Summary / Skills / Interview Qs)
```

---

## 🚀 Quick Start

### 1. Clone & navigate

```bash
git clone https://github.com/Sanju562586/AI-Resume-Q-A-Assistant.git
cd AI-Resume-Q-A-Assistant
```

### 2. Set up environment

```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

Get a free Gemini API key at: https://aistudio.google.com/app/apikey

### 3. Install backend dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the backend

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Backend API docs: http://localhost:8000/docs

### 5. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000

---

## 📡 API Reference

### `POST /upload`
Upload a resume file (PDF, DOCX, or TXT).

**Request:** `multipart/form-data` with `file` field  
**Response:**
```json
{
  "document_id": "uuid-string",
  "filename": "resume.pdf",
  "chunk_count": 24,
  "preview": "John Doe\nSoftware Engineer...",
  "message": "Resume uploaded and indexed successfully."
}
```

---

### `POST /ask`
Ask a question about an uploaded resume.

**Request:**
```json
{
  "document_id": "uuid-string",
  "question": "What are the candidate's strongest backend skills?"
}
```

**Response:**
```json
{
  "document_id": "uuid-string",
  "question": "What are the candidate's strongest backend skills?",
  "answer": "The candidate's strongest backend skills are Java, Spring Boot, and PostgreSQL...",
  "sources": ["Skills: Java, Spring Boot..."]
}
```

---

### `POST /summary`
Generate a structured professional summary.

**Request:** `{ "document_id": "uuid-string" }`  
**Response:** `{ "document_id": "...", "result": "## Profile Overview\n..." }`

---

### `POST /skills`
Extract and categorise technical skills.

**Request:** `{ "document_id": "uuid-string" }`  
**Response:** `{ "document_id": "...", "result": "## Programming Languages\n• Java\n• Python..." }`

---

### `POST /interview-questions`
Generate 10 tailored interview questions.

**Request:** `{ "document_id": "uuid-string" }`  
**Response:** `{ "document_id": "...", "result": "1. Explain how you designed...\n2. ..." }`

---

### `GET /health`
Health check.

**Response:** `{ "status": "ok", "service": "AI Resume Q&A API", "version": "1.0.0" }`

---

### `GET /documents`
List all currently indexed document IDs.

**Response:**
```json
{
  "documents": ["uuid-1", "uuid-2"],
  "count": 2
}
```

---

### `DELETE /document/{document_id}`
Delete a resume's vector index and the uploaded file.

**Response:**
```json
{
  "message": "Document 'uuid-string' deleted successfully.",
  "document_id": "uuid-string"
}
```

---

## 📁 Project Structure

```
AI-Resume-Q&A-Assistant/
├── backend/
│   ├── __init__.py          # Package exports
│   ├── main.py              # FastAPI app + routes
│   ├── document_loader.py   # PDF/DOCX/TXT text extraction
│   ├── chunker.py           # Text splitting (500 chars, 100 overlap)
│   ├── embeddings.py        # BGE-small embeddings (sentence-transformers)
│   ├── vector_store.py      # FAISS index management
│   ├── rag_pipeline.py      # RAG orchestration
│   └── llm.py               # Gemini/OpenAI LLM wrapper
├── frontend/                # Next.js frontend
├── uploads/                 # Uploaded files (gitignored)
├── faiss_store/             # FAISS indices (gitignored)
├── requirements.txt
├── pyproject.toml
├── .env.example
└── README.md
```

---

## 🔧 Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes* | — | Google Gemini API key |
| `OPENAI_API_KEY` | No | — | OpenAI key (fallback) |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000` | CORS origins |

*Either `GEMINI_API_KEY` or `OPENAI_API_KEY` is required.

---

## 📦 Tech Stack

- **Backend:** FastAPI, Python 3.10+
- **Embeddings:** `BAAI/bge-small-en-v1.5` via sentence-transformers
- **Vector DB:** FAISS (local, per-document)
- **LLM:** Google Gemini 2.5 Flash / OpenAI GPT-4o-mini
- **Document Parsing:** pdfplumber, python-docx
- **Frontend:** Next.js 14, TypeScript

---

## 📄 License

MIT License © 2026
