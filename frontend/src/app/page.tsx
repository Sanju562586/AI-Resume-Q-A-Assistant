/**
 * src/app/page.tsx
 * Main application page – orchestrates the upload → Q&A flow.
 *
 * State machine:
 *   idle          → user sees UploadSection
 *   uploadData set → user sees Q&A controls + AnswerDisplay + ConversationHistory
 */
"use client";

import React, { useCallback, useRef, useState } from "react";
import HeroSection from "@/components/HeroSection";
import UploadSection from "@/components/UploadSection";
import UploadSuccess from "@/components/UploadSuccess";
import QuestionSection from "@/components/QuestionSection";
import AnswerDisplay from "@/components/AnswerDisplay";
import ConversationHistory, {
  type HistoryEntry,
  type HistoryMode,
} from "@/components/ConversationHistory";
import {
  askQuestion,
  getResumeSummary,
  getInterviewQuestions,
  getSkills,
  deleteDocument,
  type UploadResponse,
} from "@/lib/api";

type Mode = HistoryMode | null;

/** Generate a lightweight unique ID without a library dependency. */
function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function HomePage() {
  // ── Upload state ─────────────────────────────────────────────────────────────
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);

  // ── Current answer panel ──────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [question, setQuestion] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Conversation history ──────────────────────────────────────────────────────
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const answerRef = useRef<HTMLDivElement>(null);

  // Smooth-scroll to the answer panel after it loads
  const scrollToAnswer = useCallback(() => {
    setTimeout(() => {
      answerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  }, []);

  // ── Reset – clears state AND removes the document from the server ─────────────
  const resetAll = useCallback(() => {
    if (uploadData) {
      // Fire-and-forget: silently delete the indexed document from the server
      deleteDocument(uploadData.document_id).catch(() => {});
    }
    setUploadData(null);
    setAnswer(null);
    setSources([]);
    setQuestion("");
    setMode(null);
    setError(null);
    setHistory([]);
  }, [uploadData]);

  const handleUploadSuccess = useCallback((data: UploadResponse) => {
    setUploadData(data);
    setAnswer(null);
    setSources([]);
    setMode(null);
    setError(null);
    // Keep history when re-uploading within the same session? No – clear it.
    setHistory([]);
  }, []);

  // ── Generic action wrapper ────────────────────────────────────────────────────
  /**
   * Handles loading state, error state, and appending the result to history.
   *
   * @param newMode       The analysis mode being invoked.
   * @param fn            Async function that calls the API.
   * @param questionText  The user's question (only for "answer" mode).
   */
  const runAction = useCallback(
    async (
      newMode: NonNullable<Mode>,
      fn: () => Promise<{ answer?: string; result?: string; sources?: string[] }>,
      questionText?: string
    ) => {
      if (!uploadData) return;

      setLoading(true);
      setError(null);
      setMode(newMode);
      setAnswer(null);
      setSources([]);

      try {
        const res = await fn();
        const text = res.answer ?? res.result ?? "";
        const srcs = res.sources ?? [];

        setAnswer(text);
        setSources(srcs);
        scrollToAnswer();

        // Append to conversation history
        const entry: HistoryEntry = {
          id: uid(),
          mode: newMode,
          question: newMode === "answer" ? questionText : undefined,
          answer: text,
          sources: srcs,
          timestamp: new Date(),
        };
        setHistory((prev) => [...prev, entry]);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "An error occurred.");
        setMode(null);
      } finally {
        setLoading(false);
      }
    },
    [uploadData, scrollToAnswer]
  );

  // ── Action handlers ───────────────────────────────────────────────────────────
  const handleAsk = useCallback(
    (q: string) => {
      setQuestion(q);
      runAction("answer", () => askQuestion(uploadData!.document_id, q), q);
    },
    [uploadData, runAction]
  );

  const handleSummary = useCallback(() => {
    runAction("summary", () => getResumeSummary(uploadData!.document_id));
  }, [uploadData, runAction]);

  const handleInterviewQuestions = useCallback(() => {
    runAction("interview", () => getInterviewQuestions(uploadData!.document_id));
  }, [uploadData, runAction]);

  const handleSkills = useCallback(() => {
    runAction("skills", () => getSkills(uploadData!.document_id));
  }, [uploadData, runAction]);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <main className="page-root">
      {/* Ambient background orbs */}
      <div className="bg-orb bg-orb-1" aria-hidden="true" />
      <div className="bg-orb bg-orb-2" aria-hidden="true" />
      <div className="bg-orb bg-orb-3" aria-hidden="true" />

      <div className="container">
        <HeroSection />

        <div className="card">
          {!uploadData ? (
            /* ── Upload state ── */
            <UploadSection onUploadSuccess={handleUploadSuccess} />
          ) : (
            /* ── Q&A state ── */
            <>
              <UploadSuccess data={uploadData} onReset={resetAll} />

              <div className="divider" />

              <QuestionSection
                onAsk={handleAsk}
                onSummary={handleSummary}
                onInterviewQuestions={handleInterviewQuestions}
                onSkills={handleSkills}
                loading={loading}
              />

              {/* Inline error message */}
              {error && (
                <p className="global-error" role="alert">
                  <span>⚠</span>
                  {error}
                </p>
              )}

              {/* Current answer panel – auto-scrolled into view */}
              <div ref={answerRef}>
                <AnswerDisplay
                  mode={mode}
                  answer={answer}
                  sources={sources}
                  question={question}
                  loading={loading}
                />
              </div>

              {/* Conversation history – previous interactions */}
              {history.length > 0 && (
                <>
                  <div className="divider" />
                  <ConversationHistory
                    entries={history}
                    onClear={handleClearHistory}
                  />
                </>
              )}
            </>
          )}
        </div>

        <footer className="page-footer" aria-label="Site footer">
          <div className="footer-inner">
            <span>🤖 AI Resume Q&amp;A</span>
            <span className="footer-sep">·</span>
            <span>FastAPI + FAISS + BGE + Gemini</span>
            <span className="footer-sep">·</span>
            <span>Next.js 14</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
