import { describe, expect, it } from "vitest";
import { computeExamTotal } from "../lib/exam-score";

describe("computeExamTotal", () => {
  it("sums MCQ and essay scores within exam maxScore", () => {
    const exam = {
      maxScore: 10,
      questions: [
        { id: "q1", type: "mcq", scoreWeight: 2, correctAnswer: "1" },
        { id: "q2", type: "essay", scoreWeight: 3, correctAnswer: "a" },
        { id: "q3", type: "mcq", scoreWeight: 5, correctAnswer: "0" },
      ],
    } satisfies {
      maxScore: number;
      questions: Array<{ id: string; type: string; scoreWeight: number; correctAnswer: string }>;
    };

    const total = computeExamTotal(
      exam,
      exam.questions,
      {
        q1: "1",
        q2: "Trả lời đúng",
        q3: "0",
      },
      { q2: { score: 3 } }
    );

    expect(total).toBe(10);
  });

  it("treats blank essay as zero and preserves partial scoring", () => {
    const exam = {
      maxScore: 5,
      questions: [
        { id: "q1", type: "mcq", scoreWeight: 2, correctAnswer: "0" },
        { id: "q2", type: "essay", scoreWeight: 3, correctAnswer: "abc" },
      ],
    } satisfies {
      maxScore: number;
      questions: Array<{ id: string; type: string; scoreWeight: number; correctAnswer: string }>;
    };

    const total = computeExamTotal(
      exam,
      exam.questions,
      {
        q1: "0",
        q2: "   ",
      },
      { q2: { score: 0 } }
    );

    expect(total).toBe(2);
  });
});
