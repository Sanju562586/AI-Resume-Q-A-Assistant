/**
 * src/components/AnswerDisplay.tsx
 * Renders the AI-generated answer with sources.
 */
"use client";

import React from "react";

interface Props {
  mode: "answer" | "summary" | "interview" | null;
  answer: string | null;
  sources?: string[];
  question?: string;
  loading: boolean;
}

export default function AnswerDisplay({
  mode,
  answer,
  sources,
  question,
  loading,
}: Props) {
  if (!loading && !answer) return null;

  const modeLabel =
    mode === "summary"
      ? "📋 Resume Summary"
      : mode === "interview"
      ? "🎯 Interview Questions"
      : "💬 Answer";

  return (
    <div className="answer-card">
      <div className="answer-header">
        <span className="answer-mode-badge">{modeLabel}</span>
        {question && mode === "answer" && (
          <p className="answer-question">"{question}"</p>
        )}
      </div>

      {loading ? (
        <div className="answer-loading">
          <div className="dot-pulse">
            <span /><span /><span />
          </div>
          <p>Generating answer…</p>
        </div>
      ) : (
        <>
          <div
            className="answer-body"
            dangerouslySetInnerHTML={{
              __html: formatMarkdown(answer ?? ""),
            }}
          />

          {sources && sources.length > 0 && mode === "answer" && (
            <details className="sources-section">
              <summary>📎 Context sources ({sources.length})</summary>
              <ul className="source-list">
                {sources.map((s, i) => (
                  <li key={i} className="source-item">
                    {s}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

/** Very lightweight markdown → HTML converter for bold, lists, numbered lists */
function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^## (.+)$/gm, "<h3>$1</h3>")
    .replace(/^# (.+)$/gm, "<h2>$1</h2>")
    .replace(/^\* (.+)$/gm, "<li>$1</li>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^(\d+)\. (.+)$/gm, "<li><span class='num'>$1.</span> $2</li>")
    .replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>")
    .replace(/<\/ul>\s*<ul>/g, "")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[h|u|l])(.+)$/gm, "<p>$1</p>")
    .replace(/<p><\/p>/g, "");
}
