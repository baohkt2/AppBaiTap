import type { Question, SapXepAnswer, DienKhuyetAnswer } from "./schema";

/**
 * Normalize text for comparison: remove diacritics, lowercase,
 * collapse whitespace, remove trailing punctuation.
 */
export function normalizeForGrading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[đĐ]/g, (c) => (c === "đ" ? "d" : "D"))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?]+$/, "")
    .trim();
}

/**
 * Grade sap_xep mode: check if every blank node has correct card text.
 * Returns { correct, wrongNodeIds }.
 */
export function gradeSapXep(
  question: Question,
  answer: SapXepAnswer
): { correct: boolean; wrongNodeIds: string[] } {
  const wrongNodeIds: string[] = [];

  for (const blankId of question.blanks) {
    const node = question.nodes.find((n) => n.id === blankId);
    if (!node) continue;

    const studentText = answer[blankId];
    if (!studentText || normalizeForGrading(studentText) !== normalizeForGrading(node.text)) {
      wrongNodeIds.push(blankId);
    }
  }

  return {
    correct: wrongNodeIds.length === 0,
    wrongNodeIds,
  };
}

/**
 * Grade dien_khuyet mode: check if each blank matches text or accepted list.
 * Returns { correct, wrongNodeIds, needsJudge } where needsJudge contains
 * node IDs that didn't match locally but could be judged by Gemini.
 */
export function gradeDienKhuyet(
  question: Question,
  answer: DienKhuyetAnswer
): {
  correct: boolean;
  wrongNodeIds: string[];
  needsJudge: { nodeId: string; studentText: string; accepted: string[] }[];
} {
  const wrongNodeIds: string[] = [];
  const needsJudge: { nodeId: string; studentText: string; accepted: string[] }[] = [];

  for (const blankId of question.blanks) {
    const node = question.nodes.find((n) => n.id === blankId);
    if (!node) continue;

    const studentText = answer[blankId] ?? "";
    if (!studentText.trim()) {
      wrongNodeIds.push(blankId);
      continue;
    }

    const normalizedStudent = normalizeForGrading(studentText);
    const acceptedList = node.accepted ?? [node.text];

    const matched = acceptedList.some(
      (a) => normalizeForGrading(a) === normalizedStudent
    );

    if (!matched) {
      // Doesn't match locally – needs Gemini judge
      needsJudge.push({
        nodeId: blankId,
        studentText,
        accepted: acceptedList,
      });
    }
  }

  // If there are nodes needing judge, we can't determine correctness yet
  const correct =
    wrongNodeIds.length === 0 && needsJudge.length === 0;

  return { correct, wrongNodeIds, needsJudge };
}
