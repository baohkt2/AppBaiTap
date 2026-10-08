"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LessonTab from "./components/LessonTab";
import ReviewTab from "./components/ReviewTab";

type Tab = "lesson" | "review";

export default function LearnPage() {
  const [activeTab, setActiveTab] = useState<Tab>("lesson");

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="tab-bar">
        <button
          className={`tab-item ${activeTab === "lesson" ? "active" : ""}`}
          onClick={() => setActiveTab("lesson")}
        >
          📖 Bài học
        </button>
        <button
          className={`tab-item ${activeTab === "review" ? "active" : ""}`}
          onClick={() => setActiveTab("review")}
        >
          ✏️ Ôn tập
        </button>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "lesson" ? <LessonTab /> : <ReviewTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
