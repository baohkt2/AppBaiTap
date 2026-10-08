import { describe, it, expect } from "vitest";
import { maskQuestion, verifyNoLeaks } from "../lib/masking";
import type { Question } from "../lib/schema";

const sampleSapXep: Question = {
  id: "sx-001",
  lesson: 16,
  mode: "sap_xep",
  structure: "tuan_tu",
  title: "Test",
  scenario: "Test",
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
  explanation: "Giải thích",
};

const sampleDienKhuyet: Question = {
  id: "dk-001",
  lesson: 16,
  mode: "dien_khuyet",
  structure: "re_nhanh",
  title: "Test",
  scenario: "Test",
  nodes: [
    { id: "n1", shape: "terminator", text: "Bắt đầu" },
    { id: "n2", shape: "decision", text: "Check?", accepted: ["check?", "kiểm tra?"] },
    { id: "n3", shape: "process", text: "A" },
    { id: "n4", shape: "terminator", text: "Kết thúc" },
  ],
  edges: [
    { from: "n1", to: "n2" },
    { from: "n2", to: "n3", label: "Đúng" },
    { from: "n2", to: "n4", label: "Sai" },
  ],
  blanks: ["n2"],
  distractors: [],
  explanation: "Secret explanation",
};

const sampleTuDo: Question = {
  id: "td-001",
  lesson: 16,
  mode: "tu_do",
  structure: "lap",
  title: "Test",
  scenario: "Vẽ sơ đồ lặp",
  nodes: [
    { id: "n1", shape: "terminator", text: "Bắt đầu" },
    { id: "n2", shape: "process", text: "Làm việc" },
    { id: "n3", shape: "decision", text: "Xong?" },
    { id: "n4", shape: "terminator", text: "Kết thúc" },
  ],
  edges: [
    { from: "n1", to: "n2" },
    { from: "n2", to: "n3" },
    { from: "n3", to: "n2", label: "Đúng" },
    { from: "n3", to: "n4", label: "Sai" },
  ],
  blanks: [],
  distractors: [],
  explanation: "Secret reference",
};

describe("maskQuestion", () => {
  it("sap_xep: removes text from blanks, returns shuffled cards", () => {
    const masked = maskQuestion(sampleSapXep);
    const blankNodes = masked.nodes?.filter((n) => sampleSapXep.blanks.includes(n.id));
    expect(blankNodes?.every((n) => n.text === "")).toBe(true);
    expect(masked.cards).toBeDefined();
    expect(masked.cards!.length).toBe(3); // 2 correct + 1 distractor
    expect(masked.cards!.every((c) => c.cardId && c.text)).toBe(true);
  });

  it("dien_khuyet: removes text from blanks, no accepted field", () => {
    const masked = maskQuestion(sampleDienKhuyet);
    const blankNode = masked.nodes?.find((n) => n.id === "n2");
    expect(blankNode?.text).toBe("");
    const json = JSON.stringify(masked);
    expect(json).not.toContain("accepted");
  });

  it("tu_do: only returns title, scenario, structure", () => {
    const masked = maskQuestion(sampleTuDo);
    expect(masked.nodes).toBeUndefined();
    expect(masked.edges).toBeUndefined();
    expect(masked.title).toBe("Test");
    expect(masked.scenario).toBe("Vẽ sơ đồ lặp");
  });

  it("never includes explanation", () => {
    for (const q of [sampleSapXep, sampleDienKhuyet, sampleTuDo]) {
      const masked = maskQuestion(q);
      expect(masked.explanation).toBeUndefined();
    }
  });
});

describe("verifyNoLeaks", () => {
  it("sap_xep: no leaks", () => {
    const masked = maskQuestion(sampleSapXep);
    const leaks = verifyNoLeaks(sampleSapXep, masked);
    expect(leaks.filter((l) => l.includes("explanation"))).toEqual([]);
  });

  it("tu_do: no node text leaks", () => {
    const masked = maskQuestion(sampleTuDo);
    const leaks = verifyNoLeaks(sampleTuDo, masked);
    expect(leaks).toEqual([]);
  });
});
