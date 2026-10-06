/**
 * @param text raw text about to leave the client
 * @returns text with invisible fingerprint characters removed
 */
export function stripInvisible(text: string): string {
  return text
    .replace(/[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\uFE00-\uFE0F]/g, '')
    .replace(/[\uE0000-\uE007F\uE0100-\uE01EF]/gu, '');
}

/**
 * @param before original text
 * @param after sanitized text
 * @returns number of characters removed
 */
export function removedCount(before: string, after: string): number {
  return before.length - after.length;
}

/**
 * @param text raw text
 * @returns one-line preview with control characters escaped, for audit logs
 */
export function preview(text: string): string {
  const escaped = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => `\\u{${c.codePointAt(0)?.toString(16)}}`);
  return escaped.length > 120 ? `${escaped.slice(0, 120)}…` : escaped;
}
