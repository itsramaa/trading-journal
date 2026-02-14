

# Economic Calendar Page - Functional Correctness Audit

## Audit Scope

Reviewed all files in the Economic Calendar domain: page (`EconomicCalendar.tsx`), component (`CalendarTab.tsx`), hook (`useEconomicCalendar.ts`), types (`features/calendar/types.ts`), edge function (`economic-calendar/index.ts`), shared constants (`_shared/constants/economic-calendar.ts`, `lib/constants/economic-calendar.ts`), cross-domain consumer (`use-economic-events.ts`), and test mocks (`handlers.ts`).

---

## Issues Found

### 1. Edge Function Missing Authentication (Security - HIGH)

**File:** `supabase/functions/economic-calendar/index.ts`

The edge function has **zero authentication**. No JWT validation, no `getClaims`, no user verification. Any anonymous request can invoke it, consuming Lovable AI credits (for AI predictions) and Forex Factory API bandwidth.

Every other edge function in the project (e.g., `market-insight`, `ai-preflight`, `trade-quality`) validates the JWT token via `getClaims` and returns 401 for unauthenticated requests. This function is the sole exception.

**Fix:** Import and use `getClaims` from the shared auth utility, returning 401 if no valid user. Pattern:

```typescript
import { getClaims } from "../_shared/auth.ts";

// Inside serve handler, after CORS check:
const claims = await getClaims(req);
if (!claims?.sub) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

---

### 2. Dead Code: `isThisWeek()` Function Never Called (Code Quality - LOW)

**File:** `supabase/functions/economic-calendar/index.ts` (lines 47-52)

The `isThisWeek()` function is defined but never invoked anywhere in the edge function or any other file. The Forex Factory endpoint already returns only this week's data, making the function unnecessary. Dead code adds maintenance burden and cognitive noise.

**Fix:** Remove the `isThisWeek` function entirely (lines 47-52).

---

### 3. Test Mock Response Shape Mismatches Real API Response (Code Quality / Accuracy - MEDIUM)

**File:** `src/test/mocks/handlers.ts` (lines 150-177)

The mock returns a response wrapped in `{ success: true, data: { events: [...] } }` with fields like `title`, `impact`, `currency` -- but the real edge function returns `{ events: [...], todayHighlight: {...}, impactSummary: {...}, lastUpdated: "..." }` with fields like `event`, `importance`, `country`. The mock:

- Wraps in `success` + `data` (real API does not)
- Uses `title` instead of `event`
- Uses `impact` instead of `importance`
- Uses `currency` instead of `country`
- Missing `todayHighlight`, `impactSummary`, `lastUpdated`

Any test relying on this mock would receive completely wrong data shapes, silently passing with empty/undefined renders.

**Fix:** Update the mock to match the `EconomicCalendarResponse` type:

```typescript
http.post(`${SUPABASE_URL}/functions/v1/economic-calendar`, async () => {
  await delay(100);
  return HttpResponse.json({
    events: [
      {
        id: "1",
        date: new Date().toISOString(),
        event: "FOMC Meeting",
        country: "United States",
        importance: "high",
        forecast: "5.25%",
        previous: "5.25%",
        actual: null,
        aiPrediction: null,
        cryptoImpact: null,
      },
      // ...
    ],
    todayHighlight: {
      event: null,
      hasEvent: false,
      timeUntil: null,
    },
    impactSummary: {
      hasHighImpact: false,
      eventCount: 0,
      riskLevel: "LOW",
      positionAdjustment: "normal",
    },
    lastUpdated: new Date().toISOString(),
  });
}),
```

---

### 4. Page Missing ErrorBoundary Wrapper (Comprehensiveness - MEDIUM)

**File:** `src/pages/EconomicCalendar.tsx`

The page renders `CalendarTab` directly with no `ErrorBoundary`. If any runtime error occurs inside CalendarTab (e.g., malformed date from API, unexpected null), the entire page crashes with a white screen. The Market Data page wraps every widget with ErrorBoundary -- this page should follow the same pattern.

**Fix:** Wrap `CalendarTab` in an ErrorBoundary with key-based retry:

```typescript
import { useState } from "react";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function EconomicCalendar() {
  const [retryKey, setRetryKey] = useState(0);
  return (
    <div className="space-y-6 overflow-x-hidden">
      <PageHeader ... />
      <ErrorBoundary
        title="Economic Calendar"
        onRetry={() => setRetryKey(k => k + 1)}
      >
        <CalendarTab key={retryKey} hideTitle />
      </ErrorBoundary>
    </div>
  );
}
```

---

## Verified Correct (No Issues)

- **Data fetching**: `useEconomicCalendar` with proper staleTime (15min), refetchInterval (30min), retry (2)
- **Error fallback in edge function**: Returns valid empty response with status 200 on failure (prevents UI crash)
- **Loading states**: Skeleton loaders for "Today's Key Release" and event list
- **Empty state**: "No upcoming events this week" when events array is empty
- **Error state**: "Failed to load" with retry button on `isError`
- **Impact Alert Banner**: Correctly gated by `hasHighImpact && riskLevel !== LOW`
- **Risk calculation**: `calculateRiskLevel` correctly maps today + week high-impact counts
- **AI predictions**: Graceful fallback (returns events unchanged) when `LOVABLE_API_KEY` is missing or AI fails
- **AI tool_choice**: Forced function calling ensures structured JSON response
- **Importance mapping**: `mapFFImpact` -> `mapImportance` chain correctly maps "High"->3->"high", "Medium"->2->"medium"
- **Country code mapping**: USD->"United States" for `isRelevantEvent` filter
- **Event sorting**: By date ascending (correct chronological order)
- **Display limit**: `MAX_EVENTS = 15` enforced via `.slice()`
- **AI prediction limit**: `MAX_AI_PREDICTIONS = 5` enforced
- **Semantic colors**: `bg-profit/10 text-profit` and `bg-loss/10 text-loss` for crypto impact badges
- **ARIA**: Event list has `role="list"` and `aria-label`, items have `role="listitem"`
- **Collapsible AI predictions**: Proper Radix Collapsible with chevron rotation
- **Today detection**: Correct ISO date comparison via `.split('T')[0]`
- **Time until calculation**: Hours + minutes with "Now" for past events
- **Cross-domain consumer** (`use-economic-events.ts`): Correctly reuses `useEconomicCalendar` (single data source), memoized with `useMemo`
- **Constants alignment**: Frontend and edge function constants are synchronized
- **Refresh button**: Disabled during `isFetching`, spinner animation
- **Footer disclaimer**: Data attribution to Forex Factory + last updated timestamp

---

## Summary

| # | File | Issue | Criteria | Severity |
|---|------|-------|----------|----------|
| 1 | `economic-calendar/index.ts` | No authentication -- edge function is completely open | Security | High |
| 2 | `economic-calendar/index.ts` | Dead code: `isThisWeek()` never called | Code Quality | Low |
| 3 | `src/test/mocks/handlers.ts` | Mock response shape mismatches real API | Code Quality, Accuracy | Medium |
| 4 | `src/pages/EconomicCalendar.tsx` | Missing ErrorBoundary wrapper | Comprehensiveness | Medium |

Total: 3 files modified, 4 issues addressed.
