/**
 * src/components/UploadSuccess.tsx
 * Displays resume metadata and text preview after successful upload.
 */
"use client";

import React from "react";
import type { UploadResponse } from "@/lib/api";

interface Props {
  data: UploadResponse;
  onReset: () => void;
}

export default function UploadSuccess({ data, onReset }: Props) {
  // Derive file extension for display
  const ext = data.filename.split(".").pop()?.toUpperCase() ?? "FILE";

  return (
    <div className="upload-success" role="status" aria-label="Resume uploaded successfully">
      <div className="success-header">
        <div className="success-icon-wrap" aria-hidden="true">✅</div>

        <div className="success-text">
          <h3 className="success-title">Resume Uploaded &amp; Indexed</h3>
          <p className="success-filename" title={data.filename}>
            {data.filename}
          </p>
        </div>

        <button
          className="btn-reset"
          onClick={onReset}
          title="Upload a different resume"
          aria-label="Upload a different resume"
        >
          ↩ Change
        </button>
      </div>

      <div className="success-meta">
        <div className="meta-chip">
          <span className="meta-label">File Type</span>
          <span className="meta-value">{ext}</span>
        </div>
        <div className="meta-chip">
          <span className="meta-label">Chunks Indexed</span>
          <span className="meta-value-highlight">{data.chunk_count}</span>
        </div>
        <div className="meta-chip">
          <span className="meta-label">Vector DB</span>
          <span className="meta-value">FAISS</span>
        </div>
        <div className="meta-chip">
          <span className="meta-label">Embedding Model</span>
          <span className="meta-value">BGE-small</span>
        </div>
        <div className="meta-chip">
          <span className="meta-label">LLM</span>
          <span className="meta-value">Gemini 2.5</span>
        </div>
      </div>

      {data.preview && (
        <details className="preview-section">
          <summary>
            <span>👁</span>
            Preview extracted text
            <span className="preview-chevron">›</span>
          </summary>
          <pre className="preview-text">{data.preview}…</pre>
        </details>
      )}
    </div>
  );
}