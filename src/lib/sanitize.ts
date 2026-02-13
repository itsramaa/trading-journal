/**
 * Input Sanitization Utility
 * Centralized input sanitization for edge functions and client-side validation.
 * Prevents XSS, SQL injection fragments, and invalid input from reaching the system.
 */

/**
 * Strip HTML tags from a string
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize a general text input — strip HTML, trim, and limit length.
 */
export function sanitizeText(input: unknown, maxLength = 1000): string {
  if (typeof input !== 'string') return '';
  return stripHtml(input).trim().slice(0, maxLength);
}

/**
 * Sanitize a trading pair string (e.g., "BTCUSDT")
 * Only allows alphanumeric, dash, slash, underscore.
 */
export function sanitizePair(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[^a-zA-Z0-9\-_\/]/g, '').toUpperCase().slice(0, 20);
}

/**
 * Sanitize a numeric input — returns number or fallback.
 */
export function sanitizeNumber(input: unknown, fallback = 0): number {
  if (typeof input === 'number' && isFinite(input)) return input;
  if (typeof input === 'string') {
    const parsed = parseFloat(input);
    if (isFinite(parsed)) return parsed;
  }
  return fallback;
}

/**
 * Sanitize a UUID string
 */
export function sanitizeUuid(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(input) ? input : null;
}

/**
 * Sanitize an enum value — must be one of allowed values.
 */
export function sanitizeEnum<T extends string>(input: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof input === 'string' && (allowed as readonly string[]).includes(input)) {
    return input as T;
  }
  return fallback;
}

/**
 * Sanitize edge function request body.
 * Returns a sanitized copy of the payload with only expected fields.
 */
export function sanitizePayload<T extends Record<string, unknown>>(
  body: unknown,
  schema: Record<keyof T, 'string' | 'number' | 'boolean' | 'uuid' | 'text'>
): Partial<T> {
  if (typeof body !== 'object' || body === null) return {};
  
  const result: Record<string, unknown> = {};
  const raw = body as Record<string, unknown>;

  for (const [key, type] of Object.entries(schema)) {
    const val = raw[key];
    if (val === undefined || val === null) continue;

    switch (type) {
      case 'string':
        result[key] = sanitizeText(val, 500);
        break;
      case 'text':
        result[key] = sanitizeText(val, 5000);
        break;
      case 'number':
        result[key] = sanitizeNumber(val);
        break;
      case 'boolean':
        result[key] = typeof val === 'boolean' ? val : false;
        break;
      case 'uuid':
        result[key] = sanitizeUuid(val);
        break;
    }
  }

  return result as Partial<T>;
}
