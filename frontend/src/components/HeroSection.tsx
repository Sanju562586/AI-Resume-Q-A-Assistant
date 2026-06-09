/**
 * src/components/HeroSection.tsx
 * Animated gradient headline with tech pills.
 */
"use client";

export default function HeroSection() {
  return (
    <header className="hero">
      <div className="hero-badge">
        <span>✨</span>
        Powered by Gemini AI + FAISS
      </div>

      <h1 className="hero-title">
        AI Resume{" "}
        <span className="hero-gradient">Q&amp;A</span>
        <br />
        Assistant
      </h1>

      <p className="hero-subtitle">
        Upload your resume. Ask anything. Get instant, accurate answers
        powered by Retrieval-Augmented Generation.
      </p>

      <div className="hero-pills">
        <div className="hero-pill">
          <span className="hero-pill-dot dot-violet" />
          FAISS Vector Search
        </div>
        <div className="hero-pill">
          <span className="hero-pill-dot dot-cyan" />
          BGE Embeddings
        </div>
        <div className="hero-pill">
          <span className="hero-pill-dot dot-pink" />
          Gemini 2.5 Flash
        </div>
        <div className="hero-pill">
          <span className="hero-pill-dot dot-green" />
          RAG Pipeline
        </div>
      </div>
    </header>
  );
}
