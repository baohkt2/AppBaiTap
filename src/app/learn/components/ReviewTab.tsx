"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Leaderboard from "./Leaderboard";

type SubTab = "algorithm" | "theory" | "leaderboard";

export default function ReviewTab() {
  const [subTab, setSubTab] = useState<SubTab>("algorithm");

  return (
    <div className="space-y-4">
      {/* Sub-tab bar */}
      <div className="tab-bar">
        <button
          className={`tab-item ${subTab === "algorithm" ? "active" : ""}`}
          onClick={() => setSubTab("algorithm")}
        >
          🧩 Thuật toán
        </button>
        <button
          className={`tab-item ${subTab === "theory" ? "active" : ""}`}
          onClick={() => setSubTab("theory")}
        >
          📚 Lý thuyết
        </button>
        <button
          className={`tab-item ${subTab === "leaderboard" ? "active" : ""}`}
          onClick={() => setSubTab("leaderboard")}
        >
          🏆 Xếp hạng
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={subTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {subTab === "algorithm" && <AlgorithmSection />}
          {subTab === "theory" && <TheorySection />}
          {subTab === "leaderboard" && <Leaderboard />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function AlgorithmSection() {
  const modes = [
    {
      key: "sap_xep",
      title: "Sắp xếp",
      subtitle: "Full gợi ý",
      description: "Kéo thẻ nội dung vào đúng vị trí trên sơ đồ khối",
      emoji: "🧩",
      points: 1,
      gradient: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
    },
    {
      key: "dien_khuyet",
      title: "Điền khuyết",
      subtitle: "",
      description: "Tự gõ nội dung vào các ô trống trên sơ đồ",
      emoji: "✏️",
      points: 3,
      gradient: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)",
    },
    {
      key: "tu_do",
      title: "Tự do",
      subtitle: "",
      description: "Tự vẽ sơ đồ khối từ đầu theo đề bài",
      emoji: "🎨",
      points: 10,
      gradient: "linear-gradient(135deg, #f97316 0%, #fdba74 100%)",
    },
  ];

  return (
    <div className="grid gap-4">
      {modes.map((mode, i) => (
        <motion.div
          key={mode.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Link
            href={`/learn/practice/${mode.key}`}
            className="block"
          >
            <div className="card card-interactive p-5">
              <div className="flex items-start gap-4">
                <div
                  className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                  style={{
                    background: mode.gradient,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                >
                  {mode.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-base">{mode.title}</h3>
                    {mode.subtitle && (
                      <span className="badge badge-primary">{mode.subtitle}</span>
                    )}
                  </div>
                  <p
                    className="text-sm mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {mode.description}
                  </p>
                  <div className="flex items-center gap-1 text-sm font-semibold"
                    style={{ color: "var(--color-accent)" }}>
                    <span>⭐</span>
                    <span>+{mode.points} điểm/câu</span>
                  </div>
                </div>
                <div
                  className="shrink-0 self-center"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

function TheorySection() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/questions?mode=exam");
        const data = await res.json();
        if (!cancelled) {
          setExams(data.questions ?? []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => <div key={i} className="h-32 bg-white/60 animate-pulse rounded-2xl" />)}
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div className="card p-8 text-center">
        <span className="text-6xl block mb-4">📝</span>
        <h2 className="text-lg font-bold mb-2 text-gray-800">Chưa có Đề thi nào!</h2>
        <p className="text-sm text-gray-500">Giáo viên hiện chưa tạo đề thi hoặc bài tập lý thuyết nào.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {exams.map((exam, i) => (
        <motion.div
          key={exam.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Link href={`/learn/exams/${exam.id}`} className="block">
            <div className="card card-interactive p-5 bg-white border border-gray-100 hover:border-indigo-200">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md">
                  📝
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-base text-gray-800 line-clamp-1">{exam.title}</h3>
                    {exam.completed && <span className="badge bg-emerald-100 text-emerald-800">Đã làm</span>}
                  </div>
                  <p className="text-sm text-gray-500 mb-3 line-clamp-1">{exam.description}</p>
                  
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg">
                       ⏱ {exam.timeLimit ? `${exam.timeLimit} phút` : "Không giới hạn"}
                    </span>
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg">
                       📋 {exam.questionCount} câu hỏi
                    </span>
                    <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg">
                       🏆 {exam.maxScore} điểm
                    </span>
                  </div>
                </div>
                <div className="shrink-0 self-center text-gray-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}


