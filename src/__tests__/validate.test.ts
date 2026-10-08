import { describe, it, expect } from "vitest";
import { validateFlowchart } from "../lib/flowchart/validate";
import type { Question } from "../lib/schema";

function makeBaseQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: "test-001",
    lesson: 16,
    mode: "sap_xep",
    structure: "tuan_tu",
    title: "Test",
    scenario: "Test scenario",
    nodes: [
      { id: "n1", shape: "terminator", text: "Bắt đầu" },
      { id: "n2", shape: "process", text: "Bước 1" },
      { id: "n3", shape: "process", text: "Bước 2" },
      { id: "n4", shape: "terminator", text: "Kết thúc" },
    ],
    edges: [
      { from: "n1", to: "n2" },
      { from: "n2", to: "n3" },
      { from: "n3", to: "n4" },
    ],
    blanks: ["n2", "n3"],
    distractors: ["Nhiễu"],
    explanation: "Test explanation",
    ...overrides,
  };
}

describe("validateFlowchart", () => {
  it("accepts a valid tuan_tu sap_xep question", () => {
    const errors = validateFlowchart(makeBaseQuestion());
    expect(errors).toEqual([]);
  });

  it("rejects duplicate node IDs", () => {
    const q = makeBaseQuestion({
      nodes: [
        { id: "n1", shape: "terminator", text: "Bắt đầu" },
        { id: "n1", shape: "process", text: "Bước" },
        { id: "n2", shape: "terminator", text: "Kết thúc" },
      ],
    });
    const errors = validateFlowchart(q);
    expect(errors.some((e) => e.includes("trùng"))).toBe(true);
  });

  it("rejects missing Bắt đầu node", () => {
    const q = makeBaseQuestion({
      nodes: [
        { id: "n1", shape: "terminator", text: "Khởi động" },
        { id: "n2", shape: "process", text: "Bước" },
        { id: "n3", shape: "terminator", text: "Kết thúc" },
      ],
      edges: [
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3" },
      ],
      blanks: ["n2"],
      distractors: ["Nhiễu"],
    });
    const errors = validateFlowchart(q);
    expect(errors.some((e) => e.includes("Bắt đầu"))).toBe(true);
  });

  it("rejects node text over 40 chars", () => {
    const q = makeBaseQuestion({
      nodes: [
        { id: "n1", shape: "terminator", text: "Bắt đầu" },
        { id: "n2", shape: "process", text: "A".repeat(41) },
        { id: "n3", shape: "terminator", text: "Kết thúc" },
      ],
      edges: [
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3" },
      ],
      blanks: ["n2"],
      distractors: ["Nhiễu"],
    });
    const errors = validateFlowchart(q);
    expect(errors.some((e) => e.includes("40 ký tự"))).toBe(true);
  });

  it("rejects orphan nodes (not reachable from start)", () => {
    const q = makeBaseQuestion({
      nodes: [
        { id: "n1", shape: "terminator", text: "Bắt đầu" },
        { id: "n2", shape: "process", text: "Bước 1" },
        { id: "n3", shape: "process", text: "Mồ côi" },
        { id: "n4", shape: "terminator", text: "Kết thúc" },
      ],
      edges: [
        { from: "n1", to: "n2" },
        { from: "n2", to: "n4" },
        // n3 is not connected
      ],
      blanks: ["n2", "n3"],
      distractors: ["Nhiễu"],
    });
    const errors = validateFlowchart(q);
    expect(errors.some((e) => e.includes("không tới được"))).toBe(true);
  });

  it("rejects tuan_tu with a decision node", () => {
    const q = makeBaseQuestion({
      nodes: [
        { id: "n1", shape: "terminator", text: "Bắt đầu" },
        { id: "n2", shape: "decision", text: "Kiểm tra?" },
        { id: "n3", shape: "process", text: "Nhánh A" },
        { id: "n4", shape: "process", text: "Nhánh B" },
        { id: "n5", shape: "terminator", text: "Kết thúc" },
      ],
      edges: [
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3", label: "Đúng" },
        { from: "n2", to: "n4", label: "Sai" },
        { from: "n3", to: "n5" },
        { from: "n4", to: "n5" },
      ],
      blanks: ["n2", "n3", "n4"],
      distractors: ["Nhiễu"],
    });
    const errors = validateFlowchart(q);
    expect(errors.some((e) => e.includes("tuần tự"))).toBe(true);
  });

  it("accepts valid re_nhanh structure", () => {
    const q: Question = {
      id: "rn-001",
      lesson: 16,
      mode: "sap_xep",
      structure: "re_nhanh",
      title: "Test rẽ nhánh",
      scenario: "Test",
      nodes: [
        { id: "n1", shape: "terminator", text: "Bắt đầu" },
        { id: "n2", shape: "decision", text: "Điều kiện?" },
        { id: "n3", shape: "process", text: "Nhánh A" },
        { id: "n4", shape: "process", text: "Nhánh B" },
        { id: "n5", shape: "process", text: "Tiếp tục" },
        { id: "n6", shape: "terminator", text: "Kết thúc" },
      ],
      edges: [
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3", label: "Đúng" },
        { from: "n2", to: "n4", label: "Sai" },
        { from: "n3", to: "n5" },
        { from: "n4", to: "n5" },
        { from: "n5", to: "n6" },
      ],
      blanks: ["n2", "n3", "n4", "n5"],
      distractors: ["Nhiễu", "Rác"],
      explanation: "Test",
    };
    const errors = validateFlowchart(q);
    expect(errors).toEqual([]);
  });

  it("rejects re_nhanh with a cycle", () => {
    const q: Question = {
      id: "rn-bad",
      lesson: 16,
      mode: "sap_xep",
      structure: "re_nhanh",
      title: "Test",
      scenario: "Test",
      nodes: [
        { id: "n1", shape: "terminator", text: "Bắt đầu" },
        { id: "n2", shape: "decision", text: "Check?" },
        { id: "n3", shape: "process", text: "Step" },
        { id: "n4", shape: "terminator", text: "Kết thúc" },
      ],
      edges: [
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3", label: "Đúng" },
        { from: "n2", to: "n4", label: "Sai" },
        { from: "n3", to: "n2" }, // cycle!
      ],
      blanks: ["n2", "n3"],
      distractors: ["X"],
      explanation: "Test",
    };
    const errors = validateFlowchart(q);
    expect(errors.some((e) => e.includes("vòng lặp"))).toBe(true);
  });

  it("accepts valid lap structure with cycle", () => {
    const q: Question = {
      id: "lp-001",
      lesson: 16,
      mode: "sap_xep",
      structure: "lap",
      title: "Test lặp",
      scenario: "Test",
      nodes: [
        { id: "n1", shape: "terminator", text: "Bắt đầu" },
        { id: "n2", shape: "process", text: "Làm việc" },
        { id: "n3", shape: "decision", text: "Xong chưa?" },
        { id: "n4", shape: "terminator", text: "Kết thúc" },
      ],
      edges: [
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3" },
        { from: "n3", to: "n2", label: "Đúng" },
        { from: "n3", to: "n4", label: "Sai" },
      ],
      blanks: ["n2", "n3"],
      distractors: ["Rác"],
      explanation: "Test",
    };
    const errors = validateFlowchart(q);
    expect(errors).toEqual([]);
  });

  it("rejects lap without a cycle", () => {
    const q: Question = {
      id: "lp-bad",
      lesson: 16,
      mode: "sap_xep",
      structure: "lap",
      title: "Test",
      scenario: "Test",
      nodes: [
        { id: "n1", shape: "terminator", text: "Bắt đầu" },
        { id: "n2", shape: "decision", text: "Check?" },
        { id: "n3", shape: "process", text: "A" },
        { id: "n4", shape: "process", text: "B" },
        { id: "n5", shape: "terminator", text: "Kết thúc" },
      ],
      edges: [
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3", label: "Đúng" },
        { from: "n2", to: "n4", label: "Sai" },
        { from: "n3", to: "n5" },
        { from: "n4", to: "n5" },
      ],
      blanks: ["n2", "n3", "n4"],
      distractors: ["X"],
      explanation: "Test",
    };
    const errors = validateFlowchart(q);
    expect(errors.some((e) => e.includes("quay ngược"))).toBe(true);
  });

  it("rejects decision node without Đúng/Sai labels", () => {
    const q: Question = {
      id: "bad-labels",
      lesson: 16,
      mode: "sap_xep",
      structure: "re_nhanh",
      title: "Test",
      scenario: "Test",
      nodes: [
        { id: "n1", shape: "terminator", text: "Bắt đầu" },
        { id: "n2", shape: "decision", text: "Check?" },
        { id: "n3", shape: "process", text: "A" },
        { id: "n4", shape: "process", text: "B" },
        { id: "n5", shape: "terminator", text: "Kết thúc" },
      ],
      edges: [
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3", label: "Yes" },
        { from: "n2", to: "n4", label: "No" },
        { from: "n3", to: "n5" },
        { from: "n4", to: "n5" },
      ],
      blanks: ["n2", "n3", "n4"],
      distractors: ["X"],
      explanation: "Test",
    };
    const errors = validateFlowchart(q);
    expect(errors.some((e) => e.includes("Đúng") && e.includes("Sai"))).toBe(true);
  });

  it("validates dien_khuyet mode constraints", () => {
    const q = makeBaseQuestion({
      mode: "dien_khuyet",
      blanks: ["n2"],
      distractors: [],
      nodes: [
        { id: "n1", shape: "terminator", text: "Bắt đầu" },
        { id: "n2", shape: "process", text: "Bước", accepted: ["bước"] },
        { id: "n3", shape: "process", text: "Bước 2" },
        { id: "n4", shape: "terminator", text: "Kết thúc" },
      ],
    });
    const errors = validateFlowchart(q);
    // Should complain: blanks < 2, accepted < 2
    expect(errors.some((e) => e.includes("2-4 ô trống"))).toBe(true);
  });
});
