/**
 * src/components/UploadSuccess.tsx
 * Shows resume metadata after successful upload.
 */
"use client";

import React from "react";
import type { UploadResponse } from "@/lib/api";

interface Props {
  data: UploadResponse;
  onReset: () => void;
}

export default function UploadSuccess({ data, onReset }: Props) {
  return (
    <div className="upload-success">
      <div className="success-header">
        <span className="success-icon">✅</span>
        <div>
          <h3 className="success-title">Resume Uploaded Successfully</h3>
          <p className="success-filename">{data.filename}</p>
        </div>
        <button className="btn-reset" onClick={onReset} title="Upload a different resume">
          ↩ Change
        </button>
      </div>

      <div className="success-meta">
        <div className="meta-chip">
          <span className="meta-label">Chunks indexed</span>
          <span className="meta-value">{data.chunk_count}</span>
        </div>
        <div className="meta-chip">
          <span className="meta-label">Vector DB</span>
          <span className="meta-value">FAISS</span>
        </div>
        <div className="meta-chip">
          <span className="meta-label">Embeddings</span>
          <span className="meta-value">all-MiniLM-L6-v2</span>
        </div>
      </div>

      {data.preview && (
        <details className="preview-section">
          <summary>👁 Preview extracted text</summary>
          <pre className="preview-text">{data.preview}…</pre>
        </details>
      )}
    </div>
  );
}
