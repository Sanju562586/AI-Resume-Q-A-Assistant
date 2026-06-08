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

// ── Helpers ────────────────────────────────────────────────────────────────────
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "An unexpected error occurred.");
  }
  return res.json() as Promise<T>;
}

// ── API calls ──────────────────────────────────────────────────────────────────
export async function uploadResume(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: form,
  });
  return handleResponse<UploadResponse>(res);
}

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
