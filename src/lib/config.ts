/** Points awarded per mode */
export const POINTS = {
  sap_xep: 1,
  dien_khuyet: 3,
  tu_do: 10,
} as const;

/** Mode display names */
export const MODE_LABELS: Record<string, string> = {
  sap_xep: "Sắp xếp (Full gợi ý)",
  dien_khuyet: "Điền khuyết",
  tu_do: "Tự do",
};

/** Structure display names */
export const STRUCTURE_LABELS: Record<string, string> = {
  tuan_tu: "Tuần tự",
  re_nhanh: "Rẽ nhánh",
  lap: "Lặp",
};

/** Rate limits */
export const GEMINI_LIMITS = {
  /** Max Gemini judge calls per student per question per day */
  perQuestionPerDay: 3,
  /** Max Gemini judge calls per student per day total */
  perStudentPerDay: 30,
} as const;

/** Submit rate limit: max submissions per student per minute */
export const SUBMIT_RATE_LIMIT = 10;
