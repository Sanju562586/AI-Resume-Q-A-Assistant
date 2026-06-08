/**
 * src/components/HeroSection.tsx
 * Top hero banner with animated gradient headline.
 */
"use client";

export default function HeroSection() {
  return (
    <header className="hero">
      <div className="hero-badge">✨ Powered by Gemini AI + FAISS</div>
      <h1 className="hero-title">
        AI Resume <span className="hero-gradient">Q&amp;A</span> Assistant
      </h1>
      <p className="hero-subtitle">
        Upload your resume. Ask anything. Get instant, accurate answers
        powered by Retrieval-Augmented Generation.
      </p>
      <div className="hero-stats">
        <div className="stat">
          <span className="stat-num">⚡</span>
          <span className="stat-label">Instant answers</span>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <span className="stat-num">🔍</span>
          <span className="stat-label">FAISS similarity search</span>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <span className="stat-num">🤖</span>
          <span className="stat-label">Gemini LLM</span>
        </div>
      </div>
    </header>
  );
}
