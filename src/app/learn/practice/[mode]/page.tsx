"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { MODE_LABELS, STRUCTURE_LABELS } from "@/lib/config";

interface QuestionItem {
  id: string;
  mode: string;
  structure: string;
  title: string;
  completed: boolean;
}

export default function PracticeListPage() {
  const params = useParams();
  const mode = params.mode as string;
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/questions?mode=${mode}`);
        const data = await res.json();
        setQuestions(data.questions ?? []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [mode]);

  const filtered =
    filter === "all"
      ? questions
      : questions.filter((q) => q.structure === filter);

  const modeLabel = MODE_LABELS[mode] ?? mode;

  return (
    <div className="space-y-4">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <Link
          href="/learn"
          className="p-2 rounded-lg hover:bg-black/5 transition-colors"
          title="Quay lại"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
          {modeLabel}
        </h1>
      </div>

      {/* Structure filter */}
      <div className="tab-bar">
        {[
          { key: "all", label: "Tất cả" },
          { key: "tuan_tu", label: "Tuần tự" },
          { key: "re_nhanh", label: "Rẽ nhánh" },
          { key: "lap", label: "Lặp" },
        ].map((item) => (
          <button
            key={item.key}
            className={`tab-item ${filter === item.key ? "active" : ""}`}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Question list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <span className="text-4xl block mb-3">📝</span>
          <p className="font-semibold mb-1">Chưa có câu hỏi</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Quay lại sau nhé! 🤖
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q, i) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/learn/practice/${mode}/${q.id}`}>
                <div className="card card-interactive p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                      style={{
                        background: q.completed
                          ? "rgba(16,185,129,0.1)"
                          : "rgba(124,58,237,0.1)",
                        color: q.completed
                          ? "var(--color-success)"
                          : "var(--color-primary)",
                      }}
                    >
                      {q.completed ? "✓" : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {q.title}
                      </p>
                      <span
                        className="badge badge-primary mt-1"
                      >
                        {STRUCTURE_LABELS[q.structure] ?? q.structure}
                      </span>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)" }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
