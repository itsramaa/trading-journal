# Edge Function Error Handling Guide

This document describes the standardized error handling patterns used across all Edge Functions in the Trading Journey application.

## Overview

All Edge Functions use shared utilities from `supabase/functions/_shared/` for:
- **Retry logic** with exponential backoff
- **Standardized error responses**
- **Consistent CORS handling**

## Shared Utilities

### `_shared/retry.ts`

Provides retry logic with exponential backoff and jitter.

```typescript
import { withRetry, fetchWithRetry, DEFAULT_RETRY_CONFIG } from "../_shared/retry.ts";

// Basic usage
const result = await withRetry(
  () => someAsyncOperation(),
  { maxRetries: 3 }
);

// Fetch with automatic retry on 429/5xx
const response = await fetchWithRetry(url, options, { maxRetries: 3 });
```

### `_shared/error-response.ts`

Provides standardized error formatting.

```typescript
import { 
  createErrorResponse, 
  createSuccessResponse, 
  handleCors,
  logError 
} from "../_shared/error-response.ts";

// In your handler
const corsResponse = handleCors(req);
if (corsResponse) return corsResponse;

try {
  // ... logic
  return createSuccessResponse(data);
} catch (error) {
  logError('function-name', error, { context: 'additional info' });
  return createErrorResponse(error, 500);
}
```

## Error Categories

| Code | Category | Retryable | User Action | Frontend Handling |
|------|----------|-----------|-------------|-------------------|
| `CREDENTIALS_NOT_CONFIGURED` | Not Configured | ❌ No | Configure API keys | Show configuration prompt |
| `RATE_LIMITED` | Rate Limited | ✅ Yes | Wait, auto-retry | Show toast, auto-retry with backoff |
| `AUTH_FAILED` | Authentication | ❌ No | Re-login or re-enter API keys | Redirect to login or settings |
| `NETWORK_ERROR` | Network | ✅ Yes | Auto-retry | Show retry button |
| `TIMEOUT` | Timeout | ✅ Yes | Auto-retry | Show retry button |
| `VALIDATION_ERROR` | Validation | ❌ No | Fix input | Show form errors |
| `NOT_FOUND` | Not Found | ❌ No | Check resource exists | Show 404 message |
| `PERMISSION_DENIED` | Permission | ❌ No | Upgrade plan or check access | Show upgrade prompt |
| `INTERNAL_ERROR` | Server Error | ✅ Yes | Auto-retry, contact support | Show error with retry |
| `BINANCE_API_ERROR` | Binance Error | Depends | Check Binance status | Show specific error |
| `AI_GATEWAY_ERROR` | AI Error | ✅ Yes | Auto-retry | Show retry with delay |
| `INSUFFICIENT_DATA` | Data Error | ❌ No | Provide more data | Show data requirements |

### CREDENTIALS_NOT_CONFIGURED (New)

This is a special case where the user hasn't configured their API credentials yet.
This is **NOT an error** - it's a valid domain state that should be handled gracefully.

**Edge Function Response:**
```json
{
  "success": false,
  "code": "CREDENTIALS_NOT_CONFIGURED",
  "error": "Binance API credentials not configured",
  "message": "Please configure your Binance API key and secret in Settings → Exchange to use this feature."
}
```

**Important Notes:**
- Returns HTTP 200 (not 4xx/5xx) because this is a valid state, not an error
- Frontend hooks should check for this code and expose `isConfigured: false`
- Components should show a helpful empty state with CTA to Settings page
- Do NOT treat this as an error that needs retry

**Frontend Handling:**
```typescript
// In useBinanceConnectionStatus hook
const result = await callBinanceApi('validate');

if (result.code === 'CREDENTIALS_NOT_CONFIGURED') {
  return {
    isConnected: false,
    isConfigured: false,  // Key distinction
    error: result.error,
  };
}
```

**UI Component Pattern:**
```tsx
import { BinanceNotConfiguredState } from '@/components/binance/BinanceNotConfiguredState';

function MyWidget() {
  const { data: status } = useBinanceConnectionStatus();
  
  if (!status?.isConfigured) {
    return <BinanceNotConfiguredState />;
  }
  
  // ... render widget
}
```

## Per-Function Error Handling

### `binance-futures`

**Rate Limit Handling:**
- Binance rate limits: 2400 requests/minute for most endpoints
- On 429 response: Backoff for 60 seconds
- On -1015 (too many orders): Backoff for 60 seconds
- On -1003 (too many requests): Backoff for 60 seconds

**Error Scenarios:**
```
Rate limit     → Wait 60s, auto-retry
Invalid creds  → Return immediately, no retry
Network error  → Retry with exponential backoff
Partial sync   → Mark partial, retry remaining items
```

### `binance-market-data`

**Error Scenarios:**
```
Rate limit     → Wait 30s, auto-retry (public endpoints have lower limits)
Invalid symbol → Return validation error, no retry
Network error  → Retry with exponential backoff
```

### `backtest-strategy`

**Error Scenarios:**
```
Insufficient data → Return error with required data range
Timeout (>60s)    → Return partial results if available
Strategy not found → Return 404
Invalid config    → Return validation error with details
```

### `post-trade-analysis` / `trade-quality` / AI Functions

**Error Scenarios:**
```
Rate limit (429)  → Return retryable error with retryAfter header
Payment (402)     → Return payment required error
AI timeout        → Retry once, then return cached if available
Model error       → Fallback to simpler analysis or cached result
```

## Frontend Integration

### Using with React Query

```typescript
const { data, error, isError } = useQuery({
  queryKey: ['data'],
  queryFn: async () => {
    const { data, error } = await supabase.functions.invoke('my-function');
    
    if (error) throw error;
    if (!data?.success) {
      const err = new Error(data?.error || 'Unknown error');
      (err as any).code = data?.code;
      (err as any).retryable = data?.retryable;
      throw err;
    }
    
    return data.data;
  },
  retry: (failureCount, error: any) => {
    // Only retry if error is marked as retryable
    return error?.retryable && failureCount < 3;
  },
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});
```

### Displaying Errors

```typescript
// In your component
if (isError) {
  const code = (error as any)?.code;
  
  switch (code) {
    case 'RATE_LIMITED':
      return <Alert>Please wait and try again...</Alert>;
    case 'AUTH_FAILED':
      return <Redirect to="/settings" />;
    case 'PERMISSION_DENIED':
      return <UpgradePrompt />;
    default:
      return <Alert variant="destructive">{error.message}</Alert>;
  }
}
```

## Logging and Monitoring

All errors are logged with context using `logError()`:

```json
{
  "timestamp": "2026-02-01T12:00:00.000Z",
  "function": "binance-futures",
  "error": "Rate limit exceeded",
  "stack": "...",
  "context": {
    "endpoint": "/fapi/v2/account",
    "userId": "uuid"
  }
}
```

To view logs:
1. Use Supabase Edge Function Logs in Cloud View
2. Filter by function name
3. Search for error patterns

## Recovery Procedures

### Binance API Issues

1. **Rate Limited**
   - Automatic: Wait for `retryAfter` period
   - Manual: Check Binance API status, reduce request frequency

2. **Invalid Credentials**
   - User action: Go to Settings → Binance API → Re-enter credentials
   - Verify API key permissions on Binance

3. **IP Restriction Error**
   - Add Supabase Edge Function IPs to Binance whitelist
   - Or disable IP restriction on Binance

### AI Gateway Issues

1. **Rate Limited**
   - Automatic: Exponential backoff
   - Manual: Wait 60 seconds, retry

2. **Payment Required (402)**
   - User action: Add credits to Lovable workspace

3. **Model Unavailable**
   - Automatic: Fall back to cached analysis
   - Manual: Retry after 5 minutes

### Database Issues

1. **RLS Violation**
   - Check user authentication
   - Verify user owns the resource

2. **Connection Error**
   - Automatic: Retry with backoff
   - Manual: Check Supabase status

## Best Practices

1. **Always use shared utilities** for consistency
2. **Log errors with context** for debugging
3. **Include retryable flag** in responses
4. **Set appropriate retryAfter** for rate limits
5. **Gracefully degrade** when possible (return cached data)
6. **Don't expose internal errors** to users
7. **Test error scenarios** in development
