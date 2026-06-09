import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "AI Resume Q&A Assistant – Powered by FAISS + Gemini",
  description:
    "Upload your resume and ask natural-language questions. Get instant, accurate answers powered by FAISS vector search, BGE embeddings, and Google Gemini AI.",
  keywords: ["resume", "AI", "Q&A", "FAISS", "Gemini", "RAG", "embeddings", "interview"],
  authors: [{ name: "AI Resume Q&A" }],
  openGraph: {
    title: "AI Resume Q&A Assistant",
    description: "AI-powered resume analysis – FAISS + BGE Embeddings + Gemini",
    type: "website",
  },
  metadataBase: new URL("http://localhost:3000"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
