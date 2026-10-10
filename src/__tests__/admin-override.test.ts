import { describe, expect, it } from "vitest";
import { applyManualAttemptOverride, mergeAcceptedValues } from "../lib/admin-override";

describe("applyManualAttemptOverride", () => {
  it("marks a wrong answer as correct and keeps the correct mode points", () => {
    const result = applyManualAttemptOverride({
      mode: "dien_khuyet",
      correct: true,
      existingCorrect: false,
      existingPoints: 0,
      addToAccepted: "mang áo mưa",
    });

    expect(result.correct).toBe(true);
    expect(result.points).toBe(3);
  });

  it("keeps a zero score when a correct answer is manually overridden to wrong", () => {
    const result = applyManualAttemptOverride({
      mode: "sap_xep",
      correct: false,
      existingCorrect: true,
      existingPoints: 1,
    });

    expect(result.correct).toBe(false);
    expect(result.points).toBe(0);
  });

  it("deduplicates accepted answers and normalizes them", () => {
    const merged = mergeAcceptedValues(["MANG ÁO Mưa", "mang ao mua", "đi học"], "Đi Học");
    expect(merged).toEqual(["MANG ÁO Mưa", "đi học"]);
  });
});
