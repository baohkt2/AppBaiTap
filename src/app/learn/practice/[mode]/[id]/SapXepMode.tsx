"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import FlowDiagram from "@/components/FlowDiagram";
import { useStudent } from "@/app/learn/layout";

interface Card {
  cardId: string;
  text: string;
}

interface MaskedQuestion {
  nodes?: Array<{ id: string; shape: string; text: string }>;
  edges?: Array<{ from: string; to: string; label?: string }>;
  blanks?: string[];
  cards?: Card[];
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

export default function SapXepMode({ question, questionId }: Props) {
  const { refreshStudent } = useStudent();
  const blanks = question.blanks ?? [];
  const cards = useMemo(() => question.cards ?? [], [question.cards]);

  // placements: nodeId → cardId
  const [placements, setPlacements] = useState<Record<string, string>>({});
  // selectedCard: cardId currently selected (tap-to-place mode)
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const getCardText = useCallback(
    (cardId: string) => cards.find((c) => c.cardId === cardId)?.text ?? "",
    [cards]
  );

  // Cards not yet placed
  const availableCards = cards.filter(
    (c) => !Object.values(placements).includes(c.cardId)
  );

  // All blanks filled?
  const allFilled = blanks.every((b) => placements[b]);

  // Handle tapping a card in the tray
  function handleCardTap(cardId: string) {
    if (result?.correct) return;
    setResult(null);
    if (selectedCard === cardId) {
      setSelectedCard(null);
    } else {
      setSelectedCard(cardId);
    }
  }

  // Handle tapping a blank node
  function handleBlankTap(nodeId: string) {
    if (result?.correct) return;
    setResult(null);

    const currentCard = placements[nodeId];

    if (currentCard) {
      // Remove card from this blank
      setPlacements((prev) => {
        const next = { ...prev };
        delete next[nodeId];
        return next;
      });
      return;
    }

    if (selectedCard) {
      // Place selected card into this blank
      // First remove it from any other blank
      setPlacements((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (next[key] === selectedCard) delete next[key];
        }
        next[nodeId] = selectedCard;
        return next;
      });
      setSelectedCard(null);
    }
  }

  // Build display nodes with placed card texts
  const displayNodes = (question.nodes ?? []).map((n) => {
    if (blanks.includes(n.id) && placements[n.id]) {
      return { ...n, text: getCardText(placements[n.id]) };
    }
    return n;
  });

  const [failCount, setFailCount] = useState(0);
  const [showModelAnswer, setShowModelAnswer] = useState(false);

  async function handleSubmit() {
    if (!allFilled || submitting) return;
    setSubmitting(true);
    setResult(null);

    // Build answer: nodeId → cardText
    const answer: Record<string, string> = {};
    for (const [nodeId, cardId] of Object.entries(placements)) {
      answer[nodeId] = getCardText(cardId);
    }

    try {
      const res = await fetch(`/api/questions/${questionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
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
            const placed = placements[nodeId];
            const isWrong = result?.wrongNodeIds?.includes(nodeId);
            const node = displayNodes.find(n => n.id === nodeId);
            return (
              <div 
                className="w-full h-full flex items-center justify-center p-1"
                onClick={() => handleBlankTap(nodeId)}
                title={placed ? "Bấm đúp hoặc nhấn vào để gỡ thẻ" : "Kéo thẻ thả vào đây"}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (result?.correct) return;
                  const cardId = e.dataTransfer.getData("cardId");
                  if (cardId) {
                    setResult(null);
                    setPlacements((prev) => {
                      const next = { ...prev };
                      for (const key of Object.keys(next)) {
                        if (next[key] === cardId) delete next[key];
                      }
                      next[nodeId] = cardId;
                      return next;
                    });
                    setSelectedCard(null);
                  }
                }}
                onDoubleClick={() => handleBlankTap(nodeId)}
                style={{
                  cursor: "pointer",
                  borderRadius: "6px",
                  border: "2px dashed",
                  borderColor: isWrong
                    ? "var(--color-error)"
                    : placed
                      ? "transparent"
                      : "var(--border-light)",
                  background: isWrong
                    ? "rgba(239,68,68,0.1)"
                    : placed
                      ? "transparent"
                      : "rgba(255,255,255,0.8)",
                  boxShadow: placed ? "none" : "inset 0 2px 4px rgba(0,0,0,0.05)",
                  pointerEvents: result?.correct ? "none" : "auto",
                }}
              >
                {placed ? (
                  <span className="text-[11px] font-bold text-center px-1 select-none" style={{ color: "var(--text-primary)" }}>
                    {node?.text}
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-400 select-none">
                    Thả/Chạm
                  </span>
                )}
              </div>
            );
          }}
        />
      </div>

      {/* Card tray */}
      <div className="card p-4">
        <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
          🃏 Kéo thẻ thả vào ô trống (hoặc chạm để chọn rồi chạm ô trống):
        </p>
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {availableCards.map((card) => (
              <motion.div
                key={card.cardId}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <button
                  onClick={() => handleCardTap(card.cardId)}
                  draggable={!result?.correct}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("cardId", card.cardId);
                  }}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all cursor-grab active:cursor-grabbing"
                  style={{
                    borderColor:
                      selectedCard === card.cardId
                        ? "var(--color-accent)"
                        : "var(--border-light)",
                    background:
                      selectedCard === card.cardId
                        ? "rgba(249,115,22,0.08)"
                        : "white",
                    boxShadow:
                      selectedCard === card.cardId
                        ? "0 0 0 3px rgba(249,115,22,0.2)"
                        : "var(--shadow-sm)",
                    touchAction: "none",
                    transform: selectedCard === card.cardId ? "scale(0.95)" : "scale(1)",
                  }}
                >
                  {card.text}
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {availableCards.length === 0 && (
            <p className="text-xs italic" style={{ color: "var(--text-secondary)" }}>
              Đã đặt hết thẻ! Chạm ô bên trên để gỡ thẻ.
            </p>
          )}
        </div>
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
                <p className="font-bold text-sm">{result.message}</p>
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
