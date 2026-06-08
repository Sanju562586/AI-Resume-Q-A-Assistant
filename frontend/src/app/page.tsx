/**
 * src/app/page.tsx
 * Main application page – orchestrates upload → Q&A flow.
 */
"use client";

import React, { useState, useCallback } from "react";
import HeroSection from "@/components/HeroSection";
import UploadSection from "@/components/UploadSection";
import UploadSuccess from "@/components/UploadSuccess";
import QuestionSection from "@/components/QuestionSection";
import AnswerDisplay from "@/components/AnswerDisplay";
import {
  askQuestion,
  getResumeSummary,
  getInterviewQuestions,
  getSkills,
  type UploadResponse,
} from "@/lib/api";

type Mode = "answer" | "summary" | "interview" | "skills" | null;

export default function HomePage() {
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [question, setQuestion] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetAll = useCallback(() => {
    setUploadData(null);
    setAnswer(null);
    setSources([]);
    setQuestion("");
    setMode(null);
    setError(null);
  }, []);

  const handleUploadSuccess = useCallback((data: UploadResponse) => {
    setUploadData(data);
    setAnswer(null);
    setSources([]);
    setMode(null);
    setError(null);
  }, []);

  const handleAsk = useCallback(
    async (q: string) => {
      if (!uploadData) return;
      setLoading(true);
      setError(null);
      setMode("answer");
      setQuestion(q);
      setAnswer(null);
      setSources([]);
      try {
        const res = await askQuestion(uploadData.document_id, q);
        setAnswer(res.answer);
        setSources(res.sources);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to get answer.");
        setMode(null);
      } finally {
        setLoading(false);
      }
    },
    [uploadData]
  );

  const handleSummary = useCallback(async () => {
    if (!uploadData) return;
    setLoading(true);
    setError(null);
    setMode("summary");
    setAnswer(null);
    setSources([]);
    try {
      const res = await getResumeSummary(uploadData.document_id);
      setAnswer(res.result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate summary.");
      setMode(null);
    } finally {
      setLoading(false);
    }
  }, [uploadData]);

  const handleInterviewQuestions = useCallback(async () => {
    if (!uploadData) return;
    setLoading(true);
    setError(null);
    setMode("interview");
    setAnswer(null);
    setSources([]);
    try {
      const res = await getInterviewQuestions(uploadData.document_id);
      setAnswer(res.result);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Failed to generate interview questions."
      );
      setMode(null);
    } finally {
      setLoading(false);
    }
  }, [uploadData]);

  const handleSkills = useCallback(async () => {
    if (!uploadData) return;
    setLoading(true);
    setError(null);
    setMode("skills");
    setAnswer(null);
    setSources([]);
    try {
      const res = await getSkills(uploadData.document_id);
      setAnswer(res.result);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Failed to extract skills."
      );
      setMode(null);
    } finally {
      setLoading(false);
    }
  }, [uploadData]);

  return (
    <main className="page-root">
      {/* Background ambient orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      <div className="container">
        <HeroSection />

        <div className="card">
          {!uploadData ? (
            <UploadSection onUploadSuccess={handleUploadSuccess} />
          ) : (
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

              {error && <p className="global-error">⚠ {error}</p>}

              <AnswerDisplay
                mode={mode}
                answer={answer}
                sources={sources}
                question={question}
                loading={loading}
              />
            </>
          )}
        </div>

        <footer className="page-footer">
          <p>
            AI Resume Q&amp;A · FastAPI + FAISS + Gemini + Next.js
          </p>
        </footer>
      </div>
    </main>
  );
}
