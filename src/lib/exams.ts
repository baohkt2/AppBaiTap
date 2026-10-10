import "server-only";

import { randomUUID } from "crypto";
import { examQuestionSchema, examSchema, type Exam, type ExamQuestion } from "./schema";

type DbClient = {
  from: (table: string) => QueryBuilder;
};

type QueryResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

type QueryBuilder = {
  select(columns: string): QueryBuilder;
  insert(values: unknown): QueryResult<null>;
  update(values: unknown): QueryBuilder;
  delete(): QueryBuilder;
  eq(column: string, value: string): QueryBuilder;
  order(column: string, options: { ascending: boolean }): QueryBuilder;
  maybeSingle(): QueryResult<unknown>;
  single(): QueryResult<unknown>;
};

type ExamRow = {
  id: string;
  title: string;
  description: string | null;
  time_limit: number | null;
  max_score: number | null;
  status: "draft" | "published";
  created_at: string | null;
};

type LegacyExamRow = {
  id: string;
  data: unknown;
  status: string;
  created_at: string | null;
};

type ExamQuestionRow = {
  id: string;
  exam_id: string;
  type: "mcq" | "essay";
  difficulty: "nhan_biet" | "thong_hieu" | "van_dung";
  content: string;
  options: unknown;
  correct_answer: string;
  explanation: string | null;
  score_weight: number | null;
  order_index: number | null;
};

export type ExamSummary = {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  timeLimit: number | null;
  maxScore: number;
  questionCount: number;
  createdAt: string | null;
};

export type LoadedExam = {
  id: string;
  status: "draft" | "published";
  createdAt: string | null;
  exam: Exam;
};

function normalizeQuestion(row: ExamQuestionRow): ExamQuestion {
  const parsed = examQuestionSchema.safeParse({
    id: row.id,
    type: row.type,
    difficulty: row.difficulty,
    content: row.content,
    options: Array.isArray(row.options) ? row.options : undefined,
    correctAnswer: row.correct_answer,
    explanation: row.explanation ?? undefined,
    scoreWeight: Number(row.score_weight ?? 1),
  });

  if (!parsed.success) {
    throw new Error(`Dữ liệu câu hỏi đề thi không hợp lệ: ${parsed.error.issues[0]?.message ?? "unknown"}`);
  }

  return parsed.data;
}

function normalizeExam(row: ExamRow, questionRows: ExamQuestionRow[]): LoadedExam {
  const exam = examSchema.parse({
    title: row.title,
    description: row.description ?? undefined,
    timeLimit: row.time_limit ?? null,
    maxScore: Number(row.max_score ?? 10),
    questions: questionRows
      .slice()
      .sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0))
      .map(normalizeQuestion),
  });

  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at ?? null,
    exam,
  };
}

export async function saveExamDraft(db: DbClient, exam: Exam) {
  const examId = `exam-${randomUUID()}`;

  const { error: examError } = await db.from("exams").insert({
    id: examId,
    title: exam.title,
    description: exam.description ?? null,
    time_limit: exam.timeLimit,
    max_score: exam.maxScore,
    status: "draft",
  });

  if (examError) {
    throw new Error(examError.message);
  }

  const questionRows = exam.questions.map((question, index) => ({
    id: question.id,
    exam_id: examId,
    type: question.type,
    difficulty: question.difficulty,
    content: question.content,
    options: question.type === "mcq" ? question.options ?? [] : null,
    correct_answer: question.correctAnswer,
    explanation: question.explanation ?? null,
    score_weight: question.scoreWeight,
    order_index: index,
  }));

  const { error: questionsError } = await db.from("exam_questions").insert(questionRows);
  if (questionsError) {
    await db.from("exams").delete().eq("id", examId);
    throw new Error(questionsError.message);
  }

  return examId;
}

export async function loadExamById(db: DbClient, examId: string, includeDraft = false): Promise<LoadedExam | null> {
  const { data: examRowRaw, error: examError } = await db
    .from("exams")
    .select("id, title, description, time_limit, max_score, status, created_at")
    .eq("id", examId)
    .maybeSingle();

  const examRow = examRowRaw as ExamRow | null;

  if (!examError && examRow) {
    if (!includeDraft && examRow.status !== "published") {
      return null;
    }

    const { data: questionRowsRaw, error: questionError } = await db
      .from("exam_questions")
      .select("id, type, difficulty, content, options, correct_answer, explanation, score_weight, order_index")
      .eq("exam_id", examId)
      .order("order_index", { ascending: true });

    const questionRows = (questionRowsRaw ?? []) as ExamQuestionRow[];

    if (questionError) {
      throw new Error(questionError.message);
    }

    return normalizeExam(examRow, questionRows);
  }

  const { data: legacyRowRaw, error: legacyError } = await db
    .from("questions")
    .select("id, data, status, created_at")
    .eq("id", examId)
    .eq("mode", "exam")
    .maybeSingle();

  const legacyRow = legacyRowRaw as LegacyExamRow | null;

  if (legacyError || !legacyRow) {
    return null;
  }

  if (!includeDraft && legacyRow.status !== "approved") {
    return null;
  }

  const parsed = examSchema.safeParse(legacyRow.data);
  if (!parsed.success) {
    throw new Error("Dữ liệu đề thi cũ không hợp lệ");
  }

  return {
    id: legacyRow.id,
    status: "published",
    createdAt: legacyRow.created_at ?? null,
    exam: parsed.data,
  };
}

export async function listExamSummaries(db: DbClient, includeDraft = false): Promise<ExamSummary[]> {
  const { data: examRowsRaw, error: examError } = await db
    .from("exams")
    .select("id, title, description, status, time_limit, max_score, created_at")
    .order("created_at", { ascending: false });

  const examRows = (examRowsRaw ?? []) as ExamRow[];

  if (examError) {
    throw new Error(examError.message);
  }

  const { data: questionRowsRaw } = await db.from("exam_questions").select("exam_id");
  const questionRows = (questionRowsRaw ?? []) as Array<{ exam_id: string }>;
  const countMap = new Map<string, number>();
  for (const row of questionRows ?? []) {
    countMap.set(row.exam_id, (countMap.get(row.exam_id) ?? 0) + 1);
  }

  return examRows
    .filter((row) => includeDraft || row.status === "published")
    .map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      status: row.status,
      timeLimit: row.time_limit ?? null,
      maxScore: Number(row.max_score ?? 10),
      questionCount: countMap.get(row.id) ?? 0,
      createdAt: row.created_at ?? null,
    }));
}