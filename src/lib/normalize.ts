/**
 * Normalize Vietnamese text for comparison.
 * Used to generate deterministic student IDs from name + class.
 */

/**
 * Remove Vietnamese diacritics and normalize text.
 * NFD decomposition removes combining marks, but doesn't handle đ/Đ.
 */
function removeDiacritics(str: string): string {
  return str
    .replace(/[đĐ]/g, (c) => (c === "đ" ? "d" : "D"))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normalize a student name: trim, collapse whitespace, lowercase, remove diacritics.
 */
export function normalizeName(name: string): string {
  return removeDiacritics(name.trim().replace(/\s+/g, " ").toLowerCase());
}

/**
 * Normalize a class identifier: trim, lowercase, remove ALL whitespace, remove diacritics.
 */
export function normalizeClass(cls: string): string {
  return removeDiacritics(cls.trim().toLowerCase().replace(/\s+/g, ""));
}

/**
 * Generate a deterministic student ID from name and class.
 */
export function normalizeKey(name: string, cls: string): string {
  return `${normalizeName(name)}|${normalizeClass(cls)}`;
}

/**
 * Capitalize the first letter of each word in a Vietnamese name.
 */
export function capitalizeWords(str: string): string {
  return str
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(^|\s)\S/g, (match) => match.toUpperCase());
}
