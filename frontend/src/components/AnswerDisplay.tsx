/**
 * src/components/AnswerDisplay.tsx
 * Renders the AI-generated answer with proper markdown, copy button, and sources.
 * Uses react-markdown for safe, rich markdown rendering.
 */
"use client";

import React, { useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Mode = "answer" | "summary" | "interview" | "skills" | null;

interface Props {
  mode: Mode;
  answer: string | null;
  sources?: string[];
  question?: string;
  loading: boolean;
}

const MODE_CONFIG: Record<
  NonNullable<Mode>,
  { label: string; dotColor: string; loadingMsg: string }
> = {
  answer:    { label: "💬 Answer",             dotColor: "dot-violet", loadingMsg: "Searching resume and generating answer…" },
  summary:   { label: "📋 Resume Summary",     dotColor: "dot-cyan",   loadingMsg: "Analysing resume and generating summary…" },
  interview: { label: "🎯 Interview Questions", dotColor: "dot-pink",   loadingMsg: "Crafting tailored interview questions…" },
  skills:    { label: "🛠️ Technical Skills",   dotColor: "dot-green",  loadingMsg: "Extracting and categorising skills…" },
};

export default function AnswerDisplay({
  mode,
  answer,
  sources,
  question,
  loading,
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!answer) return;
    try {
      await navigator.clipboard.writeText(answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = answer;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [answer]);

  // Don't render if there's nothing to show
  if (!loading && !answer) return null;

  const cfg = mode ? MODE_CONFIG[mode] : MODE_CONFIG.answer;
  const loadingMsg = cfg.loadingMsg;

  return (
    <div
      id="answer-display"
      className="answer-card"
      role="region"
      aria-label="AI response"
      aria-live="polite"
    >
      {/* Header */}
      <div className="answer-header">
        <div className="answer-header-left">
          <span className="answer-mode-badge">
            <span className={`answer-mode-dot ${cfg.dotColor}`} aria-hidden="true" />
            {cfg.label}
          </span>
          {question && mode === "answer" && (
            <p className="answer-question" title={question}>
              &ldquo;{question}&rdquo;
            </p>
          )}
        </div>

        {/* Copy button – only show when answer is ready */}
        {answer && !loading && (
          <button
            className={`btn-copy ${copied ? "btn-copy-success" : ""}`}
            onClick={handleCopy}
            title="Copy to clipboard"
            aria-label={copied ? "Copied!" : "Copy answer to clipboard"}
          >
            {copied ? "✓ Copied" : "⎘ Copy"}
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="answer-loading" aria-busy="true">
          <div className="dot-pulse" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="loading-label">{loadingMsg}</p>
        </div>
      ) : (
        <>
          {/* Markdown-rendered answer body */}
          <div className="answer-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {answer ?? ""}
            </ReactMarkdown>
          </div>

          {/* Context sources (only for Q&A mode) */}
          {sources && sources.length > 0 && mode === "answer" && (
            <details className="sources-section">
              <summary className="sources-summary">
                <span>📎</span>
                Context sources used ({sources.length})
              </summary>
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
