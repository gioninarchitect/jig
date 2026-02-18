/**
 * JIG Craft Cannabis - Frontend Utilities
 */

/**
 * Capitalize the first letter of a string.
 * Returns empty string for null/undefined/empty input.
 */
export function capitalize(s: string | undefined | null): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Format a number as South African Rand.
 * Returns 'R0.00' for null/undefined/NaN input.
 */
export function formatRand(n: number | undefined | null): string {
  const v = typeof n === 'number' && !Number.isNaN(n) ? n : 0;
  return `R${v.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

/**
 * Safe number — returns 0 for undefined/null/NaN.
 */
export function safeNum(n: number | undefined | null): number {
  return typeof n === 'number' && !Number.isNaN(n) ? n : 0;
}
