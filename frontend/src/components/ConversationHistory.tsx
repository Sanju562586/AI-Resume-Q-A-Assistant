/**
 * src/components/ConversationHistory.tsx
 * Shows a collapsible log of every Q&A interaction in the current session.
 * Each entry can be expanded to see the full AI response.
 */
"use client";

import React, { useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ── Types (exported so page.tsx can import them) ───────────────────────────────
export type HistoryMode = "answer" | "summary" | "interview" | "skills";

export interface HistoryEntry {
  id: string;
  mode: HistoryMode;
  question?: string;  // only for "answer" mode
  answer: string;
  sources?: string[];
  timestamp: Date;
}

// ── Mode metadata ──────────────────────────────────────────────────────────────
const MODE_META: Record<
  HistoryMode,
  { label: string; icon: string; colorClass: string }
> = {
  answer:    { label: "Q&A",            icon: "💬", colorClass: "history-mode-violet" },
  summary:   { label: "Summary",        icon: "📋", colorClass: "history-mode-cyan"   },
  interview: { label: "Interview Qs",   icon: "🎯", colorClass: "history-mode-pink"   },
  skills:    { label: "Skills",         icon: "🛠️", colorClass: "history-mode-green"  },
};

// ── Helper: strip markdown headers for plain-text preview ─────────────────────
function stripMarkdown(text: string, maxLen = 110): string {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*|__/g, "")
    .replace(/\*|_/g, "")
    .replace(/`{1,3}/g, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, maxLen);
}

// ── Component ──────────────────────────────────────────────────────────────────
interface Props {
  entries: HistoryEntry[];
  onClear: () => void;
}

export default function ConversationHistory({ entries, onClear }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCopy = useCallback(async (entry: HistoryEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(entry.answer);
    } catch {
      const el = document.createElement("textarea");
      el.value = entry.answer;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  if (entries.length === 0) return null;

  // Show most recent first
  const reversed = [...entries].reverse();

  return (
    <section className="history-section" aria-label="Conversation history">
      {/* Section header */}
      <div className="history-header">
        <div className="section-header">
          <div className="section-icon" aria-hidden="true">🕐</div>
          <h2 className="section-title">History</h2>
          <span className="history-count" aria-label={`${entries.length} entries`}>
            {entries.length}
          </span>
        </div>
        <button
          id="btn-clear-history"
          className="btn-clear-history"
          onClick={onClear}
          aria-label="Clear all history"
        >
          Clear all
        </button>
      </div>

      {/* History list */}
      <div className="history-list" role="list">
        {reversed.map((entry) => {
          const meta = MODE_META[entry.mode];
          const isExpanded = expandedIds.has(entry.id);
          const preview = entry.question ?? stripMarkdown(entry.answer);
          const isCopied = copiedId === entry.id;

          return (
            <article
              key={entry.id}
              className={`history-item${isExpanded ? " history-item--expanded" : ""}`}
              role="listitem"
            >
              {/* Collapsed header (always visible) */}
              <button
                className="history-item-header"
                onClick={() => toggle(entry.id)}
                aria-expanded={isExpanded}
                aria-controls={`history-body-${entry.id}`}
              >
                <span className="history-item-icon" aria-hidden="true">
                  {meta.icon}
                </span>

                <div className="history-item-meta">
                  <span className={`history-item-label ${meta.colorClass}`}>
                    {meta.label}
                  </span>
                  <span className="history-item-preview" title={preview}>
                    {preview}
                    {preview.length >= 110 ? "…" : ""}
                  </span>
                </div>

                <span className="history-item-time" aria-label={entry.timestamp.toLocaleTimeString()}>
                  {entry.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>

                <span className="history-chevron" aria-hidden="true">
                  {isExpanded ? "▴" : "▾"}
                </span>
              </button>

              {/* Expanded body */}
              {isExpanded && (
                <div
                  id={`history-body-${entry.id}`}
                  className="history-item-body"
                >
                  {/* Toolbar inside expanded entry */}
                  <div className="history-item-toolbar">
                    {entry.question && (
                      <p className="history-item-question">
                        &ldquo;{entry.question}&rdquo;
                      </p>
                    )}
                    <button
                      className={`btn-copy${isCopied ? " btn-copy-success" : ""}`}
                      onClick={(e) => handleCopy(entry, e)}
                      aria-label={isCopied ? "Copied!" : "Copy answer"}
                    >
                      {isCopied ? "✓ Copied" : "⎘ Copy"}
                    </button>
                  </div>

                  {/* Markdown content */}
                  <div className="answer-body history-body-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {entry.answer}
                    </ReactMarkdown>
                  </div>

                  {/* Sources (Q&A mode only) */}
                  {entry.sources && entry.sources.length > 0 && entry.mode === "answer" && (
                    <details className="sources-section">
                      <summary className="sources-summary">
                        <span>📎</span>
                        Context sources used ({entry.sources.length})
                      </summary>
                      <ul className="source-list">
                        {entry.sources.map((s, i) => (
                          <li key={i} className="source-item">
                            {s}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
