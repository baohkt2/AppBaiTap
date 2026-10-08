import { describe, it, expect } from "vitest";
import { gradeSapXep, gradeDienKhuyet, normalizeForGrading } from "../lib/grading";
import type { Question } from "../lib/schema";

const sampleReNhanh: Question = {
  id: "rn-001",
  lesson: 16,
  mode: "sap_xep",
  structure: "re_nhanh",
  title: "Test",
  scenario: "Test",
  nodes: [
    { id: "n1", shape: "terminator", text: "Bắt đầu" },
    { id: "n2", shape: "decision", text: "Trời mưa?" },
    { id: "n3", shape: "process", text: "Mang áo mưa" },
    { id: "n4", shape: "process", text: "Đội nón" },
    { id: "n5", shape: "process", text: "Đi học" },
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
  distractors: ["Nhiễu"],
  explanation: "Test",
};

describe("normalizeForGrading", () => {
  it("removes diacritics and lowercases", () => {
    expect(normalizeForGrading("Mang Áo Mưa.")).toBe("mang ao mua");
  });

  it("handles đ correctly", () => {
    expect(normalizeForGrading("Đội nón")).toBe("doi non");
  });

  it("collapses whitespace", () => {
    expect(normalizeForGrading("  mang  áo  mưa  ")).toBe("mang ao mua");
  });
});

describe("gradeSapXep", () => {
  it("returns correct when all answers match", () => {
    const result = gradeSapXep(sampleReNhanh, {
      n2: "Trời mưa?",
      n3: "Mang áo mưa",
      n4: "Đội nón",
      n5: "Đi học",
    });
    expect(result.correct).toBe(true);
    expect(result.wrongNodeIds).toEqual([]);
  });

  it("returns wrong nodes on mismatch", () => {
    const result = gradeSapXep(sampleReNhanh, {
      n2: "Trời mưa?",
      n3: "Sai rồi",
      n4: "Đội nón",
      n5: "Đi học",
    });
    expect(result.correct).toBe(false);
    expect(result.wrongNodeIds).toContain("n3");
  });

  it("matches case-insensitively with diacritics", () => {
    const result = gradeSapXep(sampleReNhanh, {
      n2: "trời mưa?",
      n3: "mang ao mua",
      n4: "đội nón",
      n5: "đi học",
    });
    expect(result.correct).toBe(true);
  });
});

const sampleDienKhuyet: Question = {
  id: "dk-001",
  lesson: 16,
  mode: "dien_khuyet",
  structure: "re_nhanh",
  title: "Test",
  scenario: "Test",
  nodes: [
    { id: "n1", shape: "terminator", text: "Bắt đầu" },
    { id: "n2", shape: "decision", text: "Đèn xanh?", accepted: ["đèn xanh?", "đèn có xanh không?"] },
    { id: "n3", shape: "process", text: "Sang đường", accepted: ["sang đường", "đi sang đường"] },
    { id: "n4", shape: "process", text: "Dừng chờ" },
    { id: "n5", shape: "terminator", text: "Kết thúc" },
  ],
  edges: [
    { from: "n1", to: "n2" },
    { from: "n2", to: "n3", label: "Đúng" },
    { from: "n2", to: "n4", label: "Sai" },
    { from: "n3", to: "n5" },
    { from: "n4", to: "n5" },
  ],
  blanks: ["n2", "n3"],
  distractors: [],
  explanation: "Test",
};

describe("gradeDienKhuyet", () => {
  it("correct when all blanks match accepted", () => {
    const result = gradeDienKhuyet(sampleDienKhuyet, {
      n2: "đèn xanh?",
      n3: "đi sang đường",
    });
    expect(result.correct).toBe(true);
    expect(result.wrongNodeIds).toEqual([]);
    expect(result.needsJudge).toEqual([]);
  });

  it("marks empty answers as wrong", () => {
    const result = gradeDienKhuyet(sampleDienKhuyet, {
      n2: "",
      n3: "sang đường",
    });
    expect(result.wrongNodeIds).toContain("n2");
  });

  it("sends non-matching answers to judge", () => {
    const result = gradeDienKhuyet(sampleDienKhuyet, {
      n2: "đèn xanh?",
      n3: "băng qua đường",
    });
    expect(result.needsJudge.length).toBe(1);
    expect(result.needsJudge[0].nodeId).toBe("n3");
    expect(result.needsJudge[0].studentText).toBe("băng qua đường");
  });
});
