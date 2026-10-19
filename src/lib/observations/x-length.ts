/**
 * X's weighted character count: most Latin text counts 1, every other code
 * point counts 2 (so "₹" and "−" cost two). Shared by the server-side copy
 * guard and the Market Desk editor's counter.
 */
export function xLength(s: string): number {
  let n = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    const light = c <= 4351 || (c >= 8192 && c <= 8205) || (c >= 8208 && c <= 8223) || (c >= 8242 && c <= 8247);
    n += light ? 1 : 2;
  }
  return n;
}

export const X_LIMIT = 280;
