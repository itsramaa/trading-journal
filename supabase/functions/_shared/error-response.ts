/**
 * Standardized Error Response Utility for Edge Functions
 * Provides consistent error formatting across all functions
 */

export type ErrorCode =
  | 'RATE_LIMITED'
  | 'AUTH_FAILED'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'INTERNAL_ERROR'
  | 'BINANCE_API_ERROR'
  | 'AI_GATEWAY_ERROR'
  | 'AI_ERROR'
  | 'PAYMENT_REQUIRED'
  | 'TIMEOUT'
  | 'INSUFFICIENT_DATA';

// Error code constants for easy use
export const ErrorCode = {
  RATE_LIMITED: 'RATE_LIMITED' as ErrorCode,
  AUTH_FAILED: 'AUTH_FAILED' as ErrorCode,
  NETWORK_ERROR: 'NETWORK_ERROR' as ErrorCode,
  VALIDATION_ERROR: 'VALIDATION_ERROR' as ErrorCode,
  NOT_FOUND: 'NOT_FOUND' as ErrorCode,
  PERMISSION_DENIED: 'PERMISSION_DENIED' as ErrorCode,
  INTERNAL_ERROR: 'INTERNAL_ERROR' as ErrorCode,
  BINANCE_API_ERROR: 'BINANCE_API_ERROR' as ErrorCode,
  AI_GATEWAY_ERROR: 'AI_GATEWAY_ERROR' as ErrorCode,
  AI_ERROR: 'AI_ERROR' as ErrorCode,
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED' as ErrorCode,
  TIMEOUT: 'TIMEOUT' as ErrorCode,
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA' as ErrorCode,
} as const;

export interface EdgeFunctionError {
  success: false;
  error: string;
  code: ErrorCode;
  retryable: boolean;
  retryAfter?: number; // seconds
  details?: Record<string, unknown>;
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Map HTTP status codes to error codes
 */
function getErrorCodeFromStatus(status: number): ErrorCode {
  switch (status) {
    case 401:
      return 'AUTH_FAILED';
    case 402:
      return 'PERMISSION_DENIED'; // Payment required
    case 403:
      return 'PERMISSION_DENIED';
    case 404:
      return 'NOT_FOUND';
    case 429:
      return 'RATE_LIMITED';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'INTERNAL_ERROR';
    default:
      return 'INTERNAL_ERROR';
  }
}

/**
 * Determine if an error is retryable based on its code
 */
function isErrorRetryable(code: ErrorCode): boolean {
  return ['RATE_LIMITED', 'NETWORK_ERROR', 'INTERNAL_ERROR', 'TIMEOUT'].includes(code);
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: unknown,
  statusCode: number = 500,
  code?: ErrorCode
): Response {
  let internalMessage = 'An unexpected error occurred';
  let errorCode: ErrorCode = code || getErrorCodeFromStatus(statusCode);
  let retryAfter: number | undefined;
  
  // Extract error information for logging (never expose to client)
  if (error instanceof Error) {
    internalMessage = error.message;
    
    // Check for specific error types
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      errorCode = 'RATE_LIMITED';
      retryAfter = 60;
    } else if (error.message.includes('timeout')) {
      errorCode = 'TIMEOUT';
    } else if (error.message.includes('network') || error.message.includes('fetch failed')) {
      errorCode = 'NETWORK_ERROR';
    }
    
    if ('retryAfter' in error && typeof (error as any).retryAfter === 'number') {
      retryAfter = Math.ceil((error as any).retryAfter / 1000);
    }
  } else if (typeof error === 'string') {
    internalMessage = error;
  } else if (error && typeof error === 'object') {
    internalMessage = (error as any).message || (error as any).msg || JSON.stringify(error);
  }
  
  // Log full error details server-side only
  console.error(`[EdgeFunction Error] code=${errorCode} status=${statusCode} msg=${internalMessage}`);
  
  // Sanitize: return generic user-facing message, never implementation details
  const sanitizedMessage = getSanitizedMessage(errorCode);
  
  const responseBody: EdgeFunctionError = {
    success: false,
    error: sanitizedMessage,
    code: errorCode,
    retryable: isErrorRetryable(errorCode),
    ...(retryAfter !== undefined && { retryAfter }),
  };
  
  return new Response(JSON.stringify(responseBody), {
    status: statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Return a safe, generic error message based on error code.
 * Never expose internal implementation details to the client.
 */
function getSanitizedMessage(code: ErrorCode): string {
  switch (code) {
    case 'RATE_LIMITED': return 'Rate limit exceeded. Please try again later.';
    case 'AUTH_FAILED': return 'Authentication failed. Please sign in again.';
    case 'NETWORK_ERROR': return 'A network error occurred. Please try again.';
    case 'VALIDATION_ERROR': return 'Invalid request. Please check your input.';
    case 'NOT_FOUND': return 'The requested resource was not found.';
    case 'PERMISSION_DENIED': return 'You do not have permission to perform this action.';
    case 'BINANCE_API_ERROR': return 'Exchange API error. Please try again later.';
    case 'AI_GATEWAY_ERROR': return 'AI service temporarily unavailable. Please try again.';
    case 'AI_ERROR': return 'AI analysis failed. Please try again.';
    case 'PAYMENT_REQUIRED': return 'This feature requires an active subscription.';
    case 'TIMEOUT': return 'Request timed out. Please try again.';
    case 'INSUFFICIENT_DATA': return 'Not enough data to perform this analysis.';
    case 'INTERNAL_ERROR':
    default: return 'An unexpected error occurred. Please try again later.';
  }
}

/**
 * Create a success response with consistent formatting
 */
export function createSuccessResponse<T>(data: T, statusCode: number = 200): Response {
  return new Response(
    JSON.stringify({ success: true, data }),
    {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Handle preflight CORS requests
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

/**
 * Create a rate limit response with retry-after header
 */
export function createRateLimitResponse(retryAfterSeconds: number = 60): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
      code: 'RATE_LIMITED',
      retryable: true,
      retryAfter: retryAfterSeconds,
    } satisfies EdgeFunctionError),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}

/**
 * Log error with context for debugging
 */
export function logError(
  functionName: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  
  console.error(JSON.stringify({
    timestamp,
    function: functionName,
    error: errorMessage,
    stack,
    context,
  }));
}
