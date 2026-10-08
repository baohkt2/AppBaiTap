"use client";

import { useState } from "react";
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
  return (
    <div className="card p-8 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        <span className="text-6xl block mb-4">🚧</span>
      </motion.div>
      <h2
        className="text-lg font-bold mb-2"
        style={{ color: "var(--text-primary)" }}
      >
        Sắp ra mắt!
      </h2>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Phần lý thuyết đang được xây dựng. Quay lại sau nhé! 🤖
      </p>
    </div>
  );
}


