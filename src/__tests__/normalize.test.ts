import { describe, it, expect } from "vitest";
import {
  normalizeKey,
  normalizeName,
  normalizeClass,
  capitalizeWords,
} from "../lib/normalize";

describe("normalizeName", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeName("  Nguyễn  Văn   Đạt  ")).toBe("nguyen van dat");
  });

  it("removes Vietnamese diacritics", () => {
    expect(normalizeName("Trần Thị Hương")).toBe("tran thi huong");
  });

  it("handles đ/Đ correctly (NFD doesn't decompose đ)", () => {
    expect(normalizeName("Đặng Đình Đạo")).toBe("dang dinh dao");
  });

  it("lowercases everything", () => {
    expect(normalizeName("NGUYỄN VĂN A")).toBe("nguyen van a");
  });
});

describe("normalizeClass", () => {
  it("removes all whitespace and lowercases", () => {
    expect(normalizeClass("6 a 1")).toBe("6a1");
    expect(normalizeClass("6A1")).toBe("6a1");
    expect(normalizeClass(" 6 A 1 ")).toBe("6a1");
  });

  it("handles diacritics in class names", () => {
    expect(normalizeClass("6Đ")).toBe("6d");
  });
});

describe("normalizeKey", () => {
  it("produces same id for different casings of same name", () => {
    const id1 = normalizeKey("Nguyễn Văn Đạt", "6A1");
    const id2 = normalizeKey("nguyen  van dat", "6a1");
    expect(id1).toBe(id2);
  });

  it("produces same id for different whitespace in class", () => {
    const id1 = normalizeKey("Trần A", "6A1");
    const id2 = normalizeKey("Trần A", "6 a1");
    expect(id1).toBe(id2);
  });

  it("different names produce different ids", () => {
    const id1 = normalizeKey("Nguyễn Văn A", "6A1");
    const id2 = normalizeKey("Nguyễn Văn B", "6A1");
    expect(id1).not.toBe(id2);
  });

  it("format is nameKey|classKey", () => {
    const id = normalizeKey("Nguyễn A", "6B2");
    expect(id).toBe("nguyen a|6b2");
  });
});

describe("capitalizeWords", () => {
  it("capitalizes first letter of each word", () => {
    expect(capitalizeWords("nguyễn văn a")).toBe("Nguyễn Văn A");
  });

  it("handles extra whitespace", () => {
    expect(capitalizeWords("  trần   thị  b  ")).toBe("Trần Thị B");
  });
});
