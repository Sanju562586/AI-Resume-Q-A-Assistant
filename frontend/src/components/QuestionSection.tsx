/**
 * src/components/QuestionSection.tsx
 * Question input bar + quick-chips + feature action buttons.
 */
"use client";

import React, { useRef, useState } from "react";

interface Props {
  onAsk: (question: string) => void;
  onSummary: () => void;
  onInterviewQuestions: () => void;
  onSkills: () => void;
  loading: boolean;
}

const QUICK_QUESTIONS = [
  "What are my strongest technical skills?",
  "What projects have I built?",
  "Describe my work experience.",
  "What databases have I used?",
  "What cloud technologies do I know?",
];

export default function QuestionSection({
  onAsk,
  onSummary,
  onInterviewQuestions,
  onSkills,
  loading,
}: Props) {
  const [question, setQuestion] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (q) {
      onAsk(q);
    }
  };

  const handleQuick = (q: string) => {
    setQuestion(q);
    onAsk(q);
    inputRef.current?.focus();
  };

  return (
    <div className="question-section">
      {/* Section header */}
      <div className="section-header">
        <div className="section-icon" aria-hidden="true">💬</div>
        <h2 className="section-title">Ask About Your Resume</h2>
      </div>

      {/* Quick question chips */}
      <div className="quick-chips" role="group" aria-label="Quick question shortcuts">
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            id={`chip-${q.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
            className="chip"
            onClick={() => handleQuick(q)}
            disabled={loading}
            title={q}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Free-form input */}
      <form className="ask-form" onSubmit={handleSubmit}>
        <div className="ask-input-wrapper">
          <span className="ask-input-icon" aria-hidden="true">🔍</span>
          <input
            ref={inputRef}
            id="question-input"
            className="ask-input"
            type="text"
            placeholder="e.g. What are my backend skills? Or generate interview questions…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Ask a question about your resume"
          />
        </div>
        <button
          id="ask-btn"
          className="btn-primary"
          type="submit"
          disabled={loading || !question.trim()}
          aria-label="Ask question"
        >
          {loading ? <span className="btn-spinner" aria-label="Loading" /> : <>Ask →</>}
        </button>
      </form>

      {/* Feature action buttons */}
      <div className="feature-grid" role="group" aria-label="AI analysis features">
        <button
          id="btn-summary"
          className="btn-feature btn-feature-summary"
          onClick={onSummary}
          disabled={loading}
          aria-label="Generate professional resume summary"
        >
          <span className="feature-icon">📋</span>
          <span className="feature-label">Generate Summary</span>
          <span className="feature-desc">Professional profile overview</span>
        </button>

        <button
          id="btn-interview"
          className="btn-feature btn-feature-interview"
          onClick={onInterviewQuestions}
          disabled={loading}
          aria-label="Generate tailored interview questions"
        >
          <span className="feature-icon">🎯</span>
          <span className="feature-label">Interview Questions</span>
          <span className="feature-desc">10 tailored questions</span>
        </button>

        <button
          id="btn-skills"
          className="btn-feature btn-feature-skills"
          onClick={onSkills}
          disabled={loading}
          aria-label="Extract and categorise technical skills"
        >
          <span className="feature-icon">🛠️</span>
          <span className="feature-label">Extract Skills</span>
          <span className="feature-desc">Categorised tech stack</span>
        </button>
      </div>
    </div>
  );
}
