

# Risk Overview Page - Functional Correctness Audit

## Audit Scope

Reviewed: page (`RiskManagement.tsx`), components (`DailyLossTracker.tsx`, `RiskSummaryCard.tsx`, `RiskProfileSummaryCard.tsx`, `CorrelationMatrix.tsx`, `RiskEventLog.tsx`, `RiskAlertBanner.tsx`, `RiskSettingsForm.tsx`, `MarginHistoryTab.tsx`), hooks (`use-risk-profile.ts`, `use-risk-events.ts`, `use-trading-gate.ts`, `use-binance-daily-pnl.ts`), types (`risk.ts`), constants (`risk-thresholds.ts`), utilities (`correlation-utils.ts`, `symbol-utils.ts`), and cross-domain dependencies (`use-combined-balance.ts`, `use-unified-daily-pnl.ts`, `use-mode-visibility.ts`).

---

## Issues Found

### 1. RiskSummaryCard `correlationWarning` useMemo Missing `showExchangeData` Dependency (Accuracy - HIGH)

**File:** `src/components/risk/RiskSummaryCard.tsx` (line 34)

The `correlationWarning` memo uses `showExchangeData` in its guard condition (line 31) but it is NOT included in the dependency array:

```typescript
const correlationWarning = useMemo((): CorrelationWarning | null => {
  if (!showExchangeData || !connectionStatus?.isConnected || positions.length < 2) return null;
  // ...
}, [positions, connectionStatus]); // Missing: showExchangeData
```

When a user switches from Live to Paper mode, `showExchangeData` changes from `true` to `false`, but the memo does not re-evaluate. The correlation warning from the Live context persists in the Paper mode dashboard, showing Live-specific risk data in a Paper context. This violates the data isolation policy.

**Fix:** Add `showExchangeData` to the dependency array:
```typescript
}, [positions, connectionStatus, showExchangeData]);
```

---

### 2. Risk Snapshot Error Toast Leaks Internal Error Messages (Security - HIGH)

**File:** `src/hooks/use-risk-profile.ts` (line 189)

The `useUpdateDailyRiskSnapshot` mutation exposes raw error messages:

```typescript
onError: (error) => {
  toast.error(`Failed to update risk snapshot: ${error.message}`);
},
```

This can leak internal Supabase error details (constraint violations, connection errors, RLS denials) directly to the user. The project security standard requires generic client messages with server-side logging only.

**Fix:**
```typescript
onError: (error) => {
  console.error('[RiskSnapshot] Update failed:', error);
  toast.error('Failed to update risk snapshot. Please try again.');
},
```

---

### 3. Page Missing Top-Level ErrorBoundary (Comprehensiveness - MEDIUM)

**File:** `src/pages/RiskManagement.tsx`

No ErrorBoundary wraps the page content. Sub-components like `DailyLossTracker`, `CorrelationMatrix`, and `RiskEventLog` all process live data that could throw on unexpected shapes (e.g., malformed event dates, null balance). All other audited pages now have ErrorBoundaries with key-based retry.

**Fix:** Add ErrorBoundary with `retryKey` pattern:
```typescript
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useState } from "react";

const [retryKey, setRetryKey] = useState(0);

<ErrorBoundary title="Risk Management" onRetry={() => setRetryKey(k => k + 1)}>
  <div key={retryKey} className="space-y-6">
    {/* existing content */}
  </div>
</ErrorBoundary>
```

---

## Verified Correct (No Issues)

The following were explicitly verified and found functionally sound:

- **Daily loss calculation (Binance)**: `lossUsedPercent = (|currentPnl| / lossLimit) * 100` only when `currentPnl < 0`; otherwise 0 -- mathematically correct, prevents positive PnL from registering as "loss used"
- **Daily loss calculation (Paper)**: Same formula applied to snapshot data with `Math.min(0, snapshot.current_pnl)` guard -- correct
- **Remaining budget**: `lossLimit + Math.min(0, currentPnl)` then `Math.max(0, ...)` -- cannot go negative, correct
- **Progress bar clamping**: `Math.min(100, riskStatus.loss_used_percent)` prevents visual overflow -- correct
- **Threshold consistency**: `RISK_THRESHOLDS` (70/90) from `types/risk.ts` and `DAILY_LOSS_THRESHOLDS` (70/90/100) from `risk-thresholds.ts` are aligned; `DailyLossTracker` uses the former, `useTradingGate` uses the latter -- values match
- **Mode isolation (DailyLossTracker)**: Binance data skipped when `isPaper` is true (line 210) -- correct
- **Mode isolation (CorrelationMatrix)**: Uses `useModeFilteredTrades` for open positions -- only shows mode-appropriate trades
- **Mode isolation (RiskEventLog)**: Liquidations/Margin tabs disabled in Paper mode via `useModeVisibility` -- correct
- **Trading gate logic**: Checks thresholds in severity order (disabled > AI blocked > danger > warning) -- correct priority
- **AI quality gate**: Requires minimum `SAMPLE_COUNT` (3) trades before enforcing -- prevents false blocking on insufficient data
- **Risk event deduplication**: Checks `event_type + event_date + user_id` before inserting -- prevents duplicate daily events
- **Correlation matrix**: Uses centralized `getCorrelation` from `correlation-utils.ts`; `getBaseSymbol` from `symbol-utils.ts` -- single source of truth
- **Correlation auto-expand**: High correlation pairs (`>=0.7`) trigger auto-expand -- correct UX behavior
- **Risk profile upsert**: Check-then-update/insert pattern with `maybeSingle()` -- safe
- **Risk profile defaults**: `DEFAULT_RISK_PROFILE` values used in insert -- matches spec (2%, 5%, 10%, 40%, 0.75, 3)
- **Audit logging**: Risk profile updates logged via `logAuditEvent` -- correct
- **URL tab persistence**: `useSearchParams` for tab state -- correct
- **Loading states**: `MetricsGridSkeleton` for page; loading card states for `DailyLossTracker`; skeleton rows for `RiskEventLog`
- **Empty states**: All components handle zero-data states (no profile, no events, no positions, no liquidations) with meaningful CTAs
- **Semantic colors**: `text-profit` / `text-loss` / `text-[hsl(var(--chart-4))]` used consistently for ok/danger/warning states
- **ARIA**: Slider components in `RiskSettingsForm` have `aria-label`; InfoTooltips on all key metrics
- **Currency formatting**: `useCurrencyConversion` used in `DailyLossTracker` for all monetary values
- **RiskAlertBanner**: Non-dismissable when disabled (only warnings can be dismissed) -- correct security behavior
- **Liquidation display**: Properly shows symbol, side, quantity, avg price, timestamps -- complete
- **MarginHistoryTab**: Symbol selector defaults to first active position; handles no-positions and no-history states
- **RiskSettingsForm**: Pure presentational component with proper prop interface -- clean separation of concerns
- **Security (RLS)**: All queries scoped by `user_id` via RLS; risk_profiles, risk_events, daily_risk_snapshots all have user-scoped policies

---

## Summary

| # | File | Issue | Criteria | Severity |
|---|------|-------|----------|----------|
| 1 | `RiskSummaryCard.tsx` line 34 | `showExchangeData` missing from `correlationWarning` useMemo deps -- stale correlation data across mode switches | Accuracy, Data Integrity | High |
| 2 | `use-risk-profile.ts` line 189 | Raw `error.message` exposed to user in toast | Security | High |
| 3 | `RiskManagement.tsx` | Missing top-level ErrorBoundary | Comprehensiveness | Medium |

Total: 3 files, 3 fixes.

## Technical Details

### Fix 1: Add missing dependency to RiskSummaryCard memo

In `src/components/risk/RiskSummaryCard.tsx` line 34, change:
```typescript
}, [positions, connectionStatus]);
```
To:
```typescript
}, [positions, connectionStatus, showExchangeData]);
```

### Fix 2: Sanitize risk snapshot error toast

In `src/hooks/use-risk-profile.ts` lines 188-190, replace:
```typescript
onError: (error) => {
  toast.error(`Failed to update risk snapshot: ${error.message}`);
},
```
With:
```typescript
onError: (error) => {
  console.error('[RiskSnapshot] Update failed:', error);
  toast.error('Failed to update risk snapshot. Please try again.');
},
```

### Fix 3: Add ErrorBoundary to RiskManagement page

Import `ErrorBoundary` from `@/components/ui/error-boundary` and `useState` from React. Add `retryKey` state and wrap the main content `div` with the standard pattern used in all other audited pages.

