import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "AI Resume Q&A Assistant",
  description:
    "Upload your resume and ask questions powered by FAISS vector search and Gemini AI. Get instant answers about your skills, experience, and achievements.",
  keywords: ["resume", "AI", "Q&A", "FAISS", "Gemini", "RAG"],
  openGraph: {
    title: "AI Resume Q&A Assistant",
    description: "AI-powered resume analysis with FAISS + Gemini",
    type: "website",
  },
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
