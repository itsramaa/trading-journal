/**
 * Shared Retry Utility for Edge Functions
 * Implements exponential backoff with jitter for resilient API calls
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors: number[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryableErrors: [429, 500, 502, 503, 504],
};

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
export function getRetryDelay(attempt: number, config: RetryConfig): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  
  // Add jitter (0-25% of delay) to prevent thundering herd
  const jitter = exponentialDelay * Math.random() * 0.25;
  
  // Cap at maxDelay
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}

/**
 * Check if an error is retryable based on HTTP status or error type
 */
export function isRetryableError(error: unknown, config: RetryConfig = DEFAULT_RETRY_CONFIG): boolean {
  // Check for rate limit or network errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('network') ||
      message.includes('fetch failed') ||
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('socket hang up')
    ) {
      return true;
    }
  }
  
  // Check for HTTP response with retryable status
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    return config.retryableErrors.includes(status);
  }
  
  // Check for Binance-specific error codes
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: number }).code;
    // -1015 = Too many orders
    // -1003 = Too many requests
    if (code === -1015 || code === -1003) {
      return true;
    }
  }
  
  return false;
}

/**
 * Extract retry-after header or return default delay
 */
export function getRetryAfter(response: Response): number | null {
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000; // Convert to milliseconds
    }
  }
  return null;
}

/**
 * Wrapper to execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error = new Error('Unknown error');
  
  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If it's the last attempt, throw immediately
      if (attempt === fullConfig.maxRetries) {
        throw lastError;
      }
      
      // Check if error is retryable
      if (!isRetryableError(error, fullConfig)) {
        throw lastError;
      }
      
      // Calculate delay and wait
      const delay = getRetryDelay(attempt, fullConfig);
      console.log(`[Retry] Attempt ${attempt + 1}/${fullConfig.maxRetries} failed, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Wrapper specifically for fetch calls that checks response status
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  config: Partial<RetryConfig> = {}
): Promise<Response> {
  const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  
  return withRetry(async () => {
    const response = await fetch(url, options);
    
    // Check if response status indicates we should retry
    if (fullConfig.retryableErrors.includes(response.status)) {
      // Check for retry-after header
      const retryAfter = getRetryAfter(response);
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (error as any).status = response.status;
      (error as any).retryAfter = retryAfter;
      throw error;
    }
    
    return response;
  }, config);
}
