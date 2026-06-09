# 🧠 AI Resume Q&A Assistant: Under the Hood

This document provides an in-depth look into the internal workings of the **AI Resume Q&A Assistant**. It breaks down the system architecture, the user flow, and the specific operations that occur at each stage of the Retrieval-Augmented Generation (RAG) pipeline.

---

## 🏗️ High-Level Architecture

The application operates on a modern full-stack architecture:
- **Frontend**: A React application built with Next.js that handles the UI, file uploads, and displaying conversational AI responses.
- **Backend**: A FastAPI application in Python that orchestrates file processing, semantic search, and communication with the Large Language Model (LLM).

The core of the intelligence lies in the **RAG Pipeline**, which bridges the gap between the static resume document and the generative capabilities of the LLM.

---

## 🌊 The End-to-End Flow

The lifecycle of a resume in this system is split into two primary phases:
1. **Ingestion Phase**: Uploading, processing, and indexing the resume.
2. **Query Phase**: Asking questions and generating insights based on the indexed data.

Here is what happens stage by stage.

---

## 📥 Phase 1: Ingestion

When a user uploads a resume via the frontend interface, the backend kicks off the ingestion process.

### Stage 1: Document Upload & Parsing (`document_loader.py`)
- **What happens:** The user uploads a file (`.pdf`, `.docx`, or `.txt`). The file is saved temporarily to the server's disk (usually an `uploads/` folder).
- **How it works:** 
  - For **PDFs**, the system uses libraries like `pdfplumber` to extract plain text layer by layer, page by page.
  - For **DOCX** files, `python-docx` is utilized to read paragraphs and extract raw text.
  - For **TXT** files, it performs a direct read with appropriate character encoding (typically UTF-8).
- **Output:** A single, continuous string of plain text representing the entire resume.

### Stage 2: Text Chunking (`chunker.py`)
- **What happens:** LLMs and embedding models have "context windows" (token limits). Furthermore, searching a massive block of text isn't efficient. Therefore, the plain text is split into smaller, manageable pieces called "chunks."
- **How it works:** The system uses `langchain-text-splitters` to recursively split the text. 
  - **Chunk Size:** Often set to ~500–1000 characters.
  - **Chunk Overlap:** An overlap (e.g., 100 characters) is maintained between consecutive chunks so that context is not lost if a sentence is split down the middle.
- **Output:** An array of text chunks.

### Stage 3: Embedding Generation (`embeddings.py`)
- **What happens:** The text chunks need to be converted into a mathematical representation so the computer can understand their "meaning."
- **How it works:** Each chunk is passed through a dense embedding model (e.g., `BAAI/bge-small-en-v1.5` via `sentence-transformers`). This neural network outputs a high-dimensional vector (an array of floating-point numbers) for each chunk. Text with similar semantic meaning will have vectors that sit close to each other in this multidimensional space.
- **Output:** A list of numerical vectors corresponding to each text chunk.

### Stage 4: Vector Storage (`vector_store.py`)
- **What happens:** The generated vectors must be stored in a way that allows for blazing-fast similarity searches later.
- **How it works:** The system uses **FAISS** (Facebook AI Similarity Search). A local FAISS index is created for the specific resume document. The vectors are added to this index, and the index is saved to disk (e.g., in a `faiss_store/` directory) keyed by a unique `document_id`.
- **Output:** A persistent, searchable vector database on disk.

---

## 🔍 Phase 2: Querying & Generation

Once the resume is ingested, the user can ask questions or request structured summaries.

### Stage 5: User Query & Initial Retrieval (`rag_pipeline.py`)
- **What happens:** The user types a question (e.g., *"How many years of React experience does this candidate have?"*).
- **How it works:** 
  1. The user's question is passed through the same embedding model used in Stage 3 to generate a **query vector**.
  2. The system loads the FAISS index for the active resume.
  3. FAISS performs a **Cosine Similarity** or **L2 Distance** search, comparing the query vector against all chunk vectors in the index.
  4. It retrieves the top *K* most similar chunks (e.g., top 10 or 20).
- **Output:** A broad list of "Candidate Chunks" that likely contain the answer.

### Stage 6: Cross-Encoder Reranking (`reranker.py`)
- **What happens:** Initial vector search is fast but sometimes lacks precision because it compares the question and the document chunk independently. Reranking fixes this by comparing them *together*.
- **How it works:** The system uses a **Cross-Encoder model** (e.g., `ms-marco-MiniLM-L-6-v2`).
  - It takes pairs of text: `(User Question, Candidate Chunk)`.
  - It scores how relevant the chunk actually is to the specific question.
  - The top *K* candidates are resorted based on this highly accurate relevance score, and the absolute best ones (e.g., top 3–5) are kept.
- **Output:** A highly precise, filtered list of "Context Chunks."

### Stage 7: LLM Generation (`llm.py`)
- **What happens:** The final, human-readable answer is generated.
- **How it works:** The system constructs a strict **Prompt Template**. 
  - The template provides the LLM (e.g., Google Gemini or OpenAI GPT) with instructions.
  - The precise "Context Chunks" from Stage 6 are injected into the prompt as the *only* source of truth.
  - The user's question is appended.
  - The LLM reads the context, synthesizes the information, and generates a natural language response.
- **Output:** The final answer, which is streamed or sent back to the Next.js frontend to be displayed to the user.

---

## 🧹 Cleanup Stage (Optional but Recommended)
- **What happens:** If a user uploads a new resume or manually clears their session, the backend triggers a deletion workflow.
- **How it works:** The system deletes the temporary file from `uploads/` and removes the FAISS index files from `faiss_store/` associated with that specific `document_id`. This ensures data privacy and keeps the disk clean.
