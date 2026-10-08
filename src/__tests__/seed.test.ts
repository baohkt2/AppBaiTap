import { describe, it, expect } from "vitest";
import { validateFlowchart } from "../lib/flowchart/validate";
import { questionSchema } from "../lib/schema";
import seedData from "../../data/seed-questions.json";

describe("seed-questions.json", () => {
  const questions = seedData as unknown[];

  it("has at least 9 questions", () => {
    expect(questions.length).toBeGreaterThanOrEqual(9);
  });

  for (let i = 0; i < (seedData as unknown[]).length; i++) {
    const raw = (seedData as unknown[])[i];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const id = (raw as any).id ?? `index-${i}`;

    it(`question "${id}" passes zod schema`, () => {
      const result = questionSchema.safeParse(raw);
      if (!result.success) {
        throw new Error(
          `Schema validation failed: ${JSON.stringify(result.error.issues, null, 2)}`
        );
      }
    });

    it(`question "${id}" passes validateFlowchart`, () => {
      const parsed = questionSchema.parse(raw);
      const errors = validateFlowchart(parsed);
      if (errors.length > 0) {
        throw new Error(
          `Flowchart validation errors:\n${errors.join("\n")}`
        );
      }
    });
  }
});
