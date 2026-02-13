/**
 * Shared Input Sanitization for Edge Functions
 * Centralized sanitization to prevent XSS and injection across all functions.
 */

/**
 * Strip HTML tags and trim a string input.
 */
export function sanitizeString(str: unknown, maxLength: number = 500): string {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().slice(0, maxLength);
}

/**
 * Safely parse a number, returning fallback for invalid values.
 */
export function safeNumber(input: unknown, fallback = 0): number {
  if (typeof input === 'number' && isFinite(input)) return input;
  if (typeof input === 'string') {
    const parsed = parseFloat(input);
    if (isFinite(parsed)) return parsed;
  }
  return fallback;
}

/**
 * Validate and sanitize a UUID string.
 */
export function sanitizeUuid(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return re.test(input) ? input : null;
}

/**
 * Sanitize an array of items, applying a transform to each, with max length limit.
 */
export function sanitizeArray<T>(
  input: unknown,
  transform: (item: unknown) => T,
  maxItems: number = 50
): T[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, maxItems).map(transform);
}
