export type ExamQuestionScoreLike = {
  id?: string;
  type?: "mcq" | "essay" | string;
  scoreWeight?: number | string;
  correctAnswer?: string | number;
};

export type ExamScoreLike = {
  maxScore?: number | string;
  questions?: ExamQuestionScoreLike[];
};

export function computeExamTotal(
  exam: ExamScoreLike | null | undefined,
  questions: ExamQuestionScoreLike[] = [],
  answers: Record<string, unknown> = {},
  gradedByQuestion: Record<string, { score?: number }> = {}
): number {
  const questionList = questions.length > 0 ? questions : exam?.questions ?? [];

  if (questionList.length === 0) {
    return 0;
  }

  let earned = 0;

  for (const question of questionList) {
    const id = String(question.id ?? "");
    if (!id) continue;

    const scoreWeight = Number(question.scoreWeight ?? 0);

    if (question.type === "mcq") {
      const selected = String(answers[id] ?? "");
      const correctAnswer = String(question.correctAnswer ?? "");
      if (selected === correctAnswer) {
        earned += scoreWeight;
      }
      continue;
    }

    const gradedEntry = gradedByQuestion[id];
    if (gradedEntry && typeof gradedEntry.score === "number") {
      earned += Math.max(0, Math.min(Number(gradedEntry.score), scoreWeight));
    }
  }

  const rawMax = questionList.reduce((sum, question) => sum + Number(question.scoreWeight ?? 0), 0);
  const examMaxScore = exam && exam.maxScore !== undefined && exam.maxScore !== null ? Number(exam.maxScore) : rawMax;
  const maxScore = examMaxScore > 0 ? examMaxScore : rawMax;

  if (!maxScore || !rawMax) {
    return Number(earned.toFixed(2));
  }

  return Number(((earned / rawMax) * maxScore).toFixed(2));
}
