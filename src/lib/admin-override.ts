import { POINTS } from "@/lib/config";

export function normalizeAcceptedValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, (char) => (char === "đ" ? "d" : "D"))
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function mergeAcceptedValues(existing: unknown, incoming: string): string[] {
  const values = Array.isArray(existing) ? existing.map((item) => String(item)) : [];
  const nextValues = [...values, incoming]
    .map((item) => item.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const merged: string[] = [];

  for (const value of nextValues) {
    const normalized = normalizeAcceptedValue(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    merged.push(value);
  }

  return merged;
}

export function applyManualAttemptOverride({
  mode,
  correct,
  existingCorrect,
  existingPoints,
  addToAccepted,
  acceptedValues,
}: {
  mode?: string;
  correct: boolean;
  existingCorrect?: boolean;
  existingPoints?: number;
  addToAccepted?: string;
  acceptedValues?: unknown;
}) {
  const normalizedMode = (mode ?? "").trim();
  const effectiveCorrect = Boolean(correct);
  const modePoints = normalizedMode in POINTS ? POINTS[normalizedMode as keyof typeof POINTS] : 0;
  const points = effectiveCorrect ? modePoints : 0;

  const accepted = addToAccepted ? mergeAcceptedValues(acceptedValues, addToAccepted) : Array.isArray(acceptedValues) ? acceptedValues.map((value) => String(value)) : [];

  return {
    correct: effectiveCorrect,
    points,
    modePoints,
    previousCorrect: Boolean(existingCorrect),
    previousPoints: Number(existingPoints ?? 0),
    accepted,
  };
}
