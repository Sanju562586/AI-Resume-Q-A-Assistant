/**
 * src/components/QuestionSection.tsx
 * Question input bar + quick-action buttons.
 */
"use client";

import React, { useState } from "react";

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
  "What cloud technologies do I know?",
  "What databases have I used?",
  "List all programming languages on my resume.",
];

export default function QuestionSection({
  onAsk,
  onSummary,
  onInterviewQuestions,
  onSkills,
  loading,
}: Props) {
  const [question, setQuestion] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      onAsk(question.trim());
    }
  };

  const handleQuick = (q: string) => {
    setQuestion(q);
    onAsk(q);
  };

  return (
    <div className="question-section">
      <h2 className="section-title">Ask a Question</h2>

      {/* Quick question chips */}
      <div className="quick-chips">
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            className="chip"
            onClick={() => handleQuick(q)}
            disabled={loading}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input form */}
      <form className="ask-form" onSubmit={handleSubmit}>
        <input
          className="ask-input"
          type="text"
          placeholder="e.g. What are my backend skills?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
        />
        <button
          className="btn-primary"
          type="submit"
          disabled={loading || !question.trim()}
        >
          {loading ? <span className="btn-spinner" /> : "Ask"}
        </button>
      </form>

      {/* Feature buttons */}
      <div className="feature-buttons">
        <button
          className="btn-feature"
          onClick={onSummary}
          disabled={loading}
        >
          📋 Generate Summary
        </button>
        <button
          className="btn-feature"
          onClick={onInterviewQuestions}
          disabled={loading}
        >
          🎯 Interview Questions
        </button>
        <button
          className="btn-feature"
          onClick={onSkills}
          disabled={loading}
        >
          🛠 Extract Skills
        </button>
      </div>
    </div>
  );
}
