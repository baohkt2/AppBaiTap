import { z } from "zod";

export const dashboardQuerySchema = z.object({
  range: z.enum(["today", "7d", "30d", "all"]).default("7d"),
  class: z.string().default("all").transform((value) => value && value !== "all" ? value.trim() : "all"),
});

export const dashboardResponseSchema = z.object({
  summary: z.object({
    activeStudents: z.number(),
    totalStudents: z.number(),
    practiceCount: z.number(),
    practiceAccuracy: z.number(),
    examCount: z.number(),
    averageExamScore: z.number(),
    pendingQuestions: z.number(),
    geminiToday: z.number(),
  }),
  dailyActivity: z.array(z.object({ date: z.string(), practice: z.number(), exams: z.number() })),
  hardestQuestions: z.array(z.object({
    id: z.string(),
    title: z.string(),
    mode: z.string(),
    attempts: z.number(),
    correctRate: z.number(),
  })),
  topStudents: z.array(z.object({
    id: z.string(),
    name: z.string(),
    className: z.string(),
    total: z.number(),
  })),
  recentActivity: z.array(z.object({
    id: z.string(),
    kind: z.string(),
    studentName: z.string(),
    className: z.string(),
    title: z.string(),
    score: z.number().nullable(),
    createdAt: z.string(),
  })),
  alerts: z.array(z.object({
    id: z.string(),
    type: z.string(),
    label: z.string(),
    count: z.number(),
  })),
  meta: z.object({
    generatedAt: z.string(),
    range: z.string(),
    class: z.string(),
    capabilities: z.object({
      hasSubmissions: z.boolean(),
      hasExamStarts: z.boolean(),
      hasLateFlags: z.boolean(),
      hasAdminActions: z.boolean(),
    }),
  }),
});
