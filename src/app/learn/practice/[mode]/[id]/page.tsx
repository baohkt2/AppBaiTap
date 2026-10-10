"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import SapXepMode from "./SapXepMode";
import DienKhuyetMode from "./DienKhuyetMode";
import TuDoMode from "./TuDoMode";

interface MaskedQuestion {
  id: string;
  mode: string;
  structure: string;
  title: string;
  scenario: string;
  nodes?: Array<{ id: string; shape: string; text: string }>;
  edges?: Array<{ from: string; to: string; label?: string }>;
  blanks?: string[];
  cards?: Array<{ cardId: string; text: string }>;
}

export default function QuestionPage() {
  const params = useParams();
  const router = useRouter();
  const mode = params.mode as string;
  const id = params.id as string;
  const [question, setQuestion] = useState<MaskedQuestion | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/questions/${id}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Lỗi tải câu hỏi");
          return;
        }
        setQuestion(data.question);
        setCompleted(data.completed);
      } catch {
        setError("Lỗi kết nối");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="skeleton h-64 rounded-xl" />
        <div className="skeleton h-20 rounded-xl" />
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="card p-8 text-center">
        <span className="text-4xl block mb-3">😕</span>
        <p className="font-semibold">{error || "Không tìm thấy câu hỏi"}</p>
        <Link href={`/learn/practice/${mode}`} className="btn btn-outline btn-sm mt-4 inline-flex">
          ← Quay lại
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 relative z-50">
        <div className="flex items-center gap-1 relative z-[99999]">
          <a
            href={`/learn/practice/${mode}`}
            className="p-3 rounded-lg hover:bg-black/5 transition-colors shrink-0 cursor-pointer block"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </a>
          <a
            href={`/learn`}
            className="p-3 rounded-lg hover:bg-black/5 transition-colors shrink-0 cursor-pointer block"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </a>
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-bold truncate">{question.title}</h1>
          {completed && (
            <span className="badge badge-success text-xs">✓ Đã hoàn thành</span>
          )}
        </div>
      </div>

      {/* Scenario */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl"
        style={{ background: "rgba(124,58,237,0.05)" }}
      >
        <span className="text-2xl shrink-0">🤖</span>
        <p className="text-sm leading-relaxed">{question.scenario}</p>
      </div>

      {/* Mode-specific UI */}
      {question.mode === "sap_xep" && (
        <SapXepMode question={question} questionId={id} />
      )}
      {question.mode === "dien_khuyet" && (
        <DienKhuyetMode question={question} questionId={id} />
      )}
      {question.mode === "tu_do" && (
        <TuDoMode question={question} questionId={id} />
      )}
    </div>
  );
}
