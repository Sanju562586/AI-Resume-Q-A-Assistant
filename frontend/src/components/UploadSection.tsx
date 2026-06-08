/**
 * src/components/UploadSection.tsx
 * Drag-and-drop + click resume uploader.
 */
"use client";

import React, { useCallback, useState } from "react";
import { uploadResume, type UploadResponse } from "@/lib/api";

interface Props {
  onUploadSuccess: (data: UploadResponse) => void;
}

export default function UploadSection({ onUploadSuccess }: Props) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      const allowed = [".pdf", ".docx", ".txt"];
      const ext = "." + file.name.split(".").pop()!.toLowerCase();
      if (!allowed.includes(ext)) {
        setError(`Unsupported file type: ${ext}. Please upload PDF, DOCX, or TXT.`);
        return;
      }
      setFileName(file.name);
      setLoading(true);
      try {
        const data = await uploadResume(file);
        onUploadSuccess(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Upload failed.");
      } finally {
        setLoading(false);
      }
    },
    [onUploadSuccess]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="upload-section">
      <div
        className={`drop-zone ${dragging ? "dragging" : ""} ${loading ? "loading" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf,.docx,.txt"
          style={{ display: "none" }}
          onChange={onFileChange}
        />

        {loading ? (
          <div className="upload-loading">
            <div className="spinner" />
            <p>Processing <strong>{fileName}</strong>…</p>
            <p className="upload-sub">Extracting text and building FAISS index</p>
          </div>
        ) : (
          <div className="upload-idle">
            <div className="upload-icon">📄</div>
            <p className="upload-title">
              {fileName ? `✅ ${fileName}` : "Drop your resume here"}
            </p>
            <p className="upload-sub">
              or <span className="upload-link">click to browse</span>
            </p>
            <p className="upload-formats">PDF · DOCX · TXT</p>
          </div>
        )}
      </div>

      {error && <p className="upload-error">⚠ {error}</p>}
    </div>
  );
}
