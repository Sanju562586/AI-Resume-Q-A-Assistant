/**
 * src/components/UploadSection.tsx
 * Drag-and-drop + click resume uploader with animated states.
 */
"use client";

import React, { useCallback, useRef, useState } from "react";
import { uploadResume, type UploadResponse } from "@/lib/api";

interface Props {
  onUploadSuccess: (data: UploadResponse) => void;
}

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];
const MAX_SIZE_MB = 10;

export default function UploadSection({ onUploadSuccess }: Props) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      // Extension check
      const ext = "." + file.name.split(".").pop()!.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setError(`Unsupported file type "${ext}". Please upload a PDF, DOCX, or TXT file.`);
        return;
      }

      // Size check
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`File is too large. Maximum size is ${MAX_SIZE_MB} MB.`);
        return;
      }

      setFileName(file.name);
      setLoading(true);

      try {
        const data = await uploadResume(file);
        onUploadSuccess(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
        setFileName(null);
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

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear dragging when leaving the drop zone itself
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragging(false);
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so same file can be re-uploaded
    e.target.value = "";
  };

  const handleClick = () => {
    if (!loading) inputRef.current?.click();
  };

  return (
    <div className="upload-section">
      <div
        id="drop-zone"
        role="button"
        tabIndex={0}
        aria-label="Upload resume – click or drag and drop"
        className={`drop-zone ${dragging ? "dragging" : ""} ${loading ? "loading" : ""}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={handleClick}
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
      >
        <input
          ref={inputRef}
          id="file-input"
          type="file"
          accept=".pdf,.docx,.txt"
          style={{ display: "none" }}
          onChange={onFileChange}
          aria-hidden="true"
        />

        {loading ? (
          <div className="upload-loading">
            <div className="upload-spinner-ring" />
            <p className="upload-loading-text">
              Processing <strong>{fileName}</strong>
            </p>
            <p className="upload-loading-sub">
              Extracting text → chunking → building FAISS index…
            </p>
          </div>
        ) : (
          <div className="upload-idle">
            <div className="upload-icon-wrapper">
              {dragging ? "📥" : "📄"}
            </div>
            <p className="upload-title">
              {dragging ? "Release to upload" : "Drop your resume here"}
            </p>
            <p className="upload-sub">
              or <span className="upload-link">click to browse</span>
            </p>
            <div className="upload-formats">
              <span className="format-badge">PDF</span>
              <span className="format-badge">DOCX</span>
              <span className="format-badge">TXT</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="upload-error" role="alert">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
