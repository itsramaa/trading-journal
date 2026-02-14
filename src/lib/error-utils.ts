/**
 * Error normalization utilities
 * Ensures consistent Error objects across components
 */

/**
 * Normalize any error value into a proper Error instance.
 * Handles react-query errors which can be Error | null | unknown.
 */
export function normalizeError(error: unknown): Error | null {
  if (!error) return null;
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  return new Error(String(error));
}
