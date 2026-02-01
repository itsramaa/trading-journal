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
  | 'TIMEOUT'
  | 'INSUFFICIENT_DATA';

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
  let errorMessage = 'An unexpected error occurred';
  let errorCode: ErrorCode = code || getErrorCodeFromStatus(statusCode);
  let retryAfter: number | undefined;
  let details: Record<string, unknown> = {};
  
  // Extract error information
  if (error instanceof Error) {
    errorMessage = error.message;
    
    // Check for specific error types
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      errorCode = 'RATE_LIMITED';
      retryAfter = 60; // Default 60 seconds
    } else if (error.message.includes('timeout')) {
      errorCode = 'TIMEOUT';
    } else if (error.message.includes('network') || error.message.includes('fetch failed')) {
      errorCode = 'NETWORK_ERROR';
    }
    
    // Check for attached properties
    if ('status' in error) {
      details.httpStatus = (error as any).status;
    }
    if ('retryAfter' in error && typeof (error as any).retryAfter === 'number') {
      retryAfter = Math.ceil((error as any).retryAfter / 1000);
    }
    if ('code' in error) {
      details.originalCode = (error as any).code;
    }
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object') {
    errorMessage = (error as any).message || (error as any).msg || JSON.stringify(error);
    if ('code' in error) {
      details.originalCode = (error as any).code;
    }
  }
  
  const responseBody: EdgeFunctionError = {
    success: false,
    error: errorMessage,
    code: errorCode,
    retryable: isErrorRetryable(errorCode),
    ...(retryAfter !== undefined && { retryAfter }),
    ...(Object.keys(details).length > 0 && { details }),
  };
  
  return new Response(JSON.stringify(responseBody), {
    status: statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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
