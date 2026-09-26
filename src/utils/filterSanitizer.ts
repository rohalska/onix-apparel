/**
 * Sanitizer for Retail API filter string expressions to prevent query injection
 * when constructing queries for Google Cloud Discovery Engine / Retail API.
 */
export function sanitizeFilterValue(val: unknown): string {
  if (typeof val !== 'string') return '';
  // Strip quotes, backslashes, parentheses, brackets, and semicolon characters
  return val.replace(/["'\\;()\[\]{}]/g, '').trim().slice(0, 50);
}
