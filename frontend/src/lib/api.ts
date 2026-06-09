/**
 * src/lib/api.ts
 * Typed API client for the FastAPI backend.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface UploadResponse {
  document_id: string;
  filename: string;
  chunk_count: number;
  preview: string;
  message: string;
}

export interface AskResponse {
  document_id: string;
  question: string;
  answer: string;
  sources: string[];
}

export interface TextResponse {
  document_id: string;
  result: string;
}

export interface DocumentsResponse {
  documents: string[];
  count: number;
}

export interface DeleteResponse {
  message: string;
  document_id: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "An unexpected error occurred.");
  }
  return res.json() as Promise<T>;
}

// ── API calls ──────────────────────────────────────────────────────────────────

/** Upload a resume file; returns the document ID and metadata. */
export async function uploadResume(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: form,
  });
  return handleResponse<UploadResponse>(res);
}

/** Ask a free-form question about an uploaded resume. */
export async function askQuestion(
  documentId: string,
  question: string
): Promise<AskResponse> {
  const res = await fetch(`${BASE_URL}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_id: documentId, question }),
  });
  return handleResponse<AskResponse>(res);
}

/** Generate a structured professional summary of the resume. */
export async function getResumeSummary(
  documentId: string
): Promise<TextResponse> {
  const res = await fetch(`${BASE_URL}/summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_id: documentId }),
  });
  return handleResponse<TextResponse>(res);
}

/** Generate 10 tailored interview questions based on the resume. */
export async function getInterviewQuestions(
  documentId: string
): Promise<TextResponse> {
  const res = await fetch(`${BASE_URL}/interview-questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_id: documentId }),
  });
  return handleResponse<TextResponse>(res);
}

/** Extract and categorise all technical skills from the resume. */
export async function getSkills(
  documentId: string
): Promise<TextResponse> {
  const res = await fetch(`${BASE_URL}/skills`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_id: documentId }),
  });
  return handleResponse<TextResponse>(res);
}

/** List all currently indexed document IDs on the server. */
export async function listDocuments(): Promise<DocumentsResponse> {
  const res = await fetch(`${BASE_URL}/documents`);
  return handleResponse<DocumentsResponse>(res);
}

/**
 * Delete a resume's vector index and uploaded file from the server.
 * Call this when the user chooses to upload a different resume.
 */
export async function deleteDocument(
  documentId: string
): Promise<DeleteResponse> {
  const res = await fetch(`${BASE_URL}/document/${documentId}`, {
    method: "DELETE",
  });
  return handleResponse<DeleteResponse>(res);
}