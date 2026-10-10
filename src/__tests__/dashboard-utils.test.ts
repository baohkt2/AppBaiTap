import { describe, expect, it } from "vitest";
import { bucketScores, fillMissingDays, percentChange, resolveRange } from "../lib/admin/dashboard-utils";
import { dashboardQuerySchema, dashboardResponseSchema } from "../lib/admin/dashboard-schema";

describe("dashboard utils", () => {
  it("resolves current and previous period based on range", () => {
    const now = new Date("2026-05-15T12:00:00+07:00");
    const result = resolveRange("7d", now);
    expect(result.start.getTime()).toBeLessThanOrEqual(result.end.getTime());
    expect(result.previousStart.getTime()).toBeLessThan(result.start.getTime());
    expect(result.previousStart.getTime()).toBeLessThan(result.end.getTime());
  });

  it("fills missing days with zeroes", () => {
    const result = fillMissingDays([
      { date: "2026-05-09", value: 2 },
      { date: "2026-05-11", value: 1 },
    ], new Date("2026-05-09T00:00:00+07:00"), new Date("2026-05-11T00:00:00+07:00"));

    expect(result).toHaveLength(3);
    expect(result[1].value).toBe(0);
  });

  it("calculates change with zero previous value safely", () => {
    expect(percentChange(5, 0)).toBe(100);
    expect(percentChange(0, 0)).toBe(0);
  });

  it("buckets score ranges correctly", () => {
    const result = bucketScores([0, 1, 11, 31, 61, 999]);
    expect(result[0].count).toBe(1);
    expect(result[1].count).toBe(1);
    expect(result[2].count).toBe(1);
    expect(result[3].count).toBe(1);
    expect(result[4].count).toBe(2);
  });

  it("accepts valid dashboard payloads and rejects invalid ones", () => {
    const query = dashboardQuerySchema.parse({ range: "7d", class: "all" });
    expect(query.range).toBe("7d");

    const payload = {
      summary: {
        activeStudents: 1,
        totalStudents: 2,
        practiceCount: 3,
        practiceAccuracy: 50,
        examCount: 4,
        averageExamScore: 70,
        pendingQuestions: 5,
        geminiToday: 6,
      },
      dailyActivity: [{ date: "2026-05-09", practice: 1, exams: 2 }],
      hardestQuestions: [{ id: "q1", title: "Câu 1", mode: "sap_xep", attempts: 2, correctRate: 50 }],
      topStudents: [{ id: "s1", name: "A", className: "6A", total: 10 }],
      recentActivity: [{ id: "r1", kind: "practice", studentName: "A", className: "6A", title: "Câu 1", score: 1, createdAt: "2026-05-09T00:00:00Z" }],
      alerts: [{ id: "a1", type: "late", label: "Nộp muộn", count: 1 }],
      meta: {
        generatedAt: "2026-05-09T00:00:00Z",
        range: "7d",
        class: "all",
        capabilities: {
          hasSubmissions: true,
          hasExamStarts: false,
          hasLateFlags: true,
          hasAdminActions: false,
        },
      },
    };

    expect(() => dashboardResponseSchema.parse(payload)).not.toThrow();
    expect(() => dashboardResponseSchema.parse({ ...payload, summary: undefined })).toThrow();
  });
});
