import { z } from "zod";

/** Node shape types */
export const shapeSchema = z.enum(["terminator", "process", "decision"]);

/** A single flowchart node */
export const nodeSchema = z.object({
  id: z.string().min(1),
  shape: shapeSchema,
  text: z.string().min(1).max(40),
  /** Accepted alternative answers for blank nodes (dien_khuyet mode) */
  accepted: z.array(z.string()).optional(),
});

/** A single flowchart edge */
export const edgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
});

/** Question mode */
export const modeSchema = z.enum(["sap_xep", "dien_khuyet", "tu_do"]);

/** Structure type */
export const structureSchema = z.enum(["tuan_tu", "re_nhanh", "lap"]);

/** Full question schema */
export const questionSchema = z.object({
  id: z.string().min(1),
  lesson: z.number().int().default(16),
  mode: modeSchema,
  structure: structureSchema,
  title: z.string().min(1),
  scenario: z.string().min(1),
  nodes: z.array(nodeSchema).min(3).max(9),
  edges: z.array(edgeSchema).min(2),
  blanks: z.array(z.string()),
  distractors: z.array(z.string()).default([]),
  explanation: z.string().min(1),
});

/** Infer TypeScript types from schemas */
export type FlowNode = z.infer<typeof nodeSchema>;
export type FlowEdge = z.infer<typeof edgeSchema>;
export type QuestionMode = z.infer<typeof modeSchema>;
export type StructureType = z.infer<typeof structureSchema>;
export type Question = z.infer<typeof questionSchema>;

/** Schema for student answer in sap_xep mode */
export const sapXepAnswerSchema = z.record(z.string(), z.string());

/** Schema for student answer in dien_khuyet mode */
export const dienKhuyetAnswerSchema = z.record(z.string(), z.string());

/** Schema for student answer in tu_do mode */
export const tuDoAnswerSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: z.string().min(1),
        shape: shapeSchema,
        text: z.string().min(1).max(60),
      })
    )
    .max(12),
  edges: z
    .array(
      z.object({
        from: z.string().min(1),
        to: z.string().min(1),
        label: z.string().optional(),
      })
    ),
});

export type SapXepAnswer = z.infer<typeof sapXepAnswerSchema>;
export type DienKhuyetAnswer = z.infer<typeof dienKhuyetAnswerSchema>;
export type TuDoAnswer = z.infer<typeof tuDoAnswerSchema>;

/** ==================== EXAM SYSTEM SCHEMAS ==================== */

export const examQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["mcq", "essay"]),
  difficulty: z.enum(["nhan_biet", "thong_hieu", "van_dung"]),
  content: z.string().min(1),
  options: z.array(z.string()).optional(), // Only for mcq
  correctAnswer: z.string().min(1), // Index or text for mcq, rubrics/keywords for essay
  explanation: z.string().optional(),
  scoreWeight: z.number().default(1),
});

export const examStatusSchema = z.enum(["draft", "published"]);

export const examSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  timeLimit: z.number().nullable(), // in minutes, null means unlimited
  maxScore: z.number().default(10),
  questions: z.array(examQuestionSchema).min(1),
});

export type ExamQuestion = z.infer<typeof examQuestionSchema>;
export type Exam = z.infer<typeof examSchema>;
export type ExamStatus = z.infer<typeof examStatusSchema>;

export const examSubmissionSchema = z.object({
  examId: z.string().min(1),
  answers: z.record(z.string(), z.string()), // questionId -> answer
});

export type ExamSubmission = z.infer<typeof examSubmissionSchema>;
