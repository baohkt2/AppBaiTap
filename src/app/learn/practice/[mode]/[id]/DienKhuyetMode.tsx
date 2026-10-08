"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import FlowDiagram from "@/components/FlowDiagram";
import { useStudent } from "@/app/learn/layout";

interface MaskedQuestion {
  nodes?: Array<{ id: string; shape: string; text: string }>;
  edges?: Array<{ from: string; to: string; label?: string }>;
  blanks?: string[];
}

interface Props {
  question: MaskedQuestion;
  questionId: string;
}

interface SubmitResult {
  correct: boolean;
  pointsAwarded: number;
  totalPoints: number;
  wrongNodeIds?: string[];
  message: string;
  explanation?: string;
  modelAnswer?: {
    nodes: Array<{ id: string; shape: string; text: string }>;
    edges: Array<{ from: string; to: string; label?: string }>;
  };
}

export default function DienKhuyetMode({ question, questionId }: Props) {
  const { refreshStudent } = useStudent();
  const blanks = question.blanks ?? [];

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const allFilled = blanks.every((b) => (answers[b] ?? "").trim().length > 0);

  // Build display nodes
  const displayNodes = (question.nodes ?? []).map((n) => {
    if (blanks.includes(n.id) && answers[n.id]?.trim()) {
      return { ...n, text: answers[n.id] };
    }
    return n;
  });

  function handleInputChange(nodeId: string, value: string) {
    setResult(null);
    setAnswers((prev) => ({ ...prev, [nodeId]: value }));
  }

  function focusInput(nodeId: string) {
    const el = inputRefs.current.get(nodeId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }
  }

  const [failCount, setFailCount] = useState(0);
  const [showModelAnswer, setShowModelAnswer] = useState(false);

  async function handleSubmit() {
    if (!allFilled || submitting) return;
    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch(`/api/questions/${questionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: answers }),
      });
      const data: SubmitResult = await res.json();
      setResult(data);

      if (data.correct) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        refreshStudent();
      } else {
        setFailCount(c => c + 1);
      }
    } catch {
      setResult({
        correct: false,
        pointsAwarded: 0,
        totalPoints: 0,
        message: "Lỗi kết nối, thử lại nhé",
      });
      setFailCount(c => c + 1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Flow diagram */}
      <div className="card p-4 overflow-x-auto">
        <FlowDiagram
          nodes={displayNodes}
          edges={question.edges ?? []}
          blanks={blanks}
          wrongNodeIds={result?.wrongNodeIds ?? []}
          renderBlank={(nodeId) => {
            const isWrong = result?.wrongNodeIds?.includes(nodeId);
            return (
              <div className="w-full h-full flex items-center justify-center px-1">
                <input
                  ref={(el) => {
                    if (el) inputRefs.current.set(nodeId, el);
                  }}
                  type="text"
                  className="w-full text-center bg-transparent border-b-2 outline-none focus:border-primary transition-colors font-medium text-[11px]"
                  placeholder="Nhập..."
                  value={answers[nodeId] ?? ""}
                  onChange={(e) => handleInputChange(nodeId, e.target.value)}
                  onFocus={() => focusInput(nodeId)}
                  maxLength={40}
                  disabled={result?.correct}
                  style={{
                    borderColor: isWrong ? "var(--color-error)" : "var(--border-light)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            );
          }}
        />
      </div>

      {/* Result message */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="card p-4"
            style={{
              borderLeft: `4px solid ${result.correct ? "var(--color-success)" : "var(--color-error)"}`,
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{result.correct ? "🎉" : "💪"}</span>
              <div>
                <p className="font-bold text-sm whitespace-pre-line">{result.message}</p>
                {result.explanation && (
                  <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                    💡 {result.explanation}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!allFilled || submitting || result?.correct}
          className="btn btn-primary flex-1"
        >
          {submitting ? "Đang kiểm tra..." : result?.correct ? "✓ Đã hoàn thành" : "Kiểm tra 🔍"}
        </button>
        
        {(result?.correct || failCount >= 3) && (
          <button 
            onClick={() => setShowModelAnswer(true)} 
            className="btn btn-outline"
          >
            💡 Xem đáp án mẫu
          </button>
        )}
      </div>

      <AnimatePresence>
        {showModelAnswer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          >
            <div className="card p-5 w-full max-w-2xl max-h-[90vh] flex flex-col">
              <h3 className="font-bold mb-3 text-lg">Đáp án mẫu</h3>
              <div className="flex-1 overflow-auto bg-gray-50 rounded-lg p-2">
                <FlowDiagram
                  nodes={result?.modelAnswer?.nodes ?? question.nodes ?? []}
                  edges={result?.modelAnswer?.edges ?? question.edges ?? []}
                />
              </div>
              <button 
                onClick={() => setShowModelAnswer(false)} 
                className="btn btn-primary w-full mt-4"
              >
                Đóng
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
