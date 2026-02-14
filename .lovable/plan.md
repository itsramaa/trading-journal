

# Risk Overview Page - Functional Correctness Audit (Round 2)

## Audit Scope

Full re-audit of: page (`RiskManagement.tsx`), components (`DailyLossTracker.tsx`, `RiskSummaryCard.tsx`, `RiskProfileSummaryCard.tsx`, `CorrelationMatrix.tsx`, `RiskEventLog.tsx`, `RiskAlertBanner.tsx`, `RiskSettingsForm.tsx`, `MarginHistoryTab.tsx`), hooks (`use-risk-profile.ts`, `use-risk-events.ts`, `use-trading-gate.ts`, `use-binance-daily-pnl.ts`, `use-unified-daily-pnl.ts`), types (`risk.ts`), constants (`risk-thresholds.ts`), utilities (`correlation-utils.ts`, `symbol-utils.ts`), and cross-domain dependencies.

All three issues from Round 1 have been verified as fixed:
- `showExchangeData` dependency added to `RiskSummaryCard.tsx` memo -- confirmed at line 34
- Error toast sanitized in `use-risk-profile.ts` -- confirmed at lines 188-191
- ErrorBoundary added to `RiskManagement.tsx` -- confirmed at lines 54-153

---

## New Issues Found

### 1. `text-warning` Color Token Undefined -- Correlation Warning Invisible (Clarity - HIGH)

**File:** `src/components/risk/RiskSummaryCard.tsx` (lines 188, 190, 196)

The correlation warning section uses `text-warning` and `border-warning/30` CSS classes:
```typescript
<Link2 className="h-4 w-4 text-warning mt-0.5 shrink-0" />
<span className="text-sm font-medium text-warning">
<Badge ... className="ml-1.5 text-xs border-warning/30 text-warning">
```

However, `text-warning` is NOT defined in the project's CSS theme. The project standard uses `text-[hsl(var(--chart-4))]` for warning indicators (per the UX Consistency Standard). Because the `warning` color token does not exist, these elements inherit the parent text color (muted-foreground), making the correlation warning visually indistinguishable from normal text. Users cannot tell this is a warning.

**Fix:** Replace all `text-warning` with `text-[hsl(var(--chart-4))]` and `border-warning/30` with `border-[hsl(var(--chart-4))]/30`:
```typescript
<Link2 className="h-4 w-4 text-[hsl(var(--chart-4))] mt-0.5 shrink-0" />
<span className="text-sm font-medium text-[hsl(var(--chart-4))]">
<Badge ... className="ml-1.5 text-xs border-[hsl(var(--chart-4))]/30 text-[hsl(var(--chart-4))]">
```

---

### 2. Two Sliders Missing `aria-label` in RiskSettingsForm (Clarity - MEDIUM)

**File:** `src/components/risk/RiskSettingsForm.tsx` (lines 133-142, 152-158)

The first three sliders (Risk per Trade, Max Daily Loss, Max Weekly Drawdown) have proper `aria-label` attributes. The last two sliders (Max Position Size, Max Concurrent Positions) do NOT:

```typescript
// Line 134 - Missing aria-label
<Slider
  value={[maxPositionSize]}
  onValueChange={([value]) => onMaxPositionSizeChange(value)}
  min={10}
  max={100}
  step={5}
/>

// Line 153 - Missing aria-label
<Slider
  value={[maxConcurrentPositions]}
  onValueChange={([value]) => onMaxConcurrentPositionsChange(value)}
  min={1}
  max={10}
  step={1}
/>
```

This inconsistency makes two of the five risk settings inaccessible to screen readers.

**Fix:** Add `aria-label` to both:
```typescript
aria-label={`Max position size: ${maxPositionSize}%`}
```
```typescript
aria-label={`Max concurrent positions: ${maxConcurrentPositions}`}
```

---

### 3. Dead Constant: `CORRELATION_THRESHOLDS.DEFAULT_FALLBACK` Never Used (Code Quality - LOW)

**File:** `src/lib/constants/risk-thresholds.ts` (line 26)

The constant `DEFAULT_FALLBACK: 0.3` is defined in `CORRELATION_THRESHOLDS` but never imported or used anywhere in the codebase. The actual fallback in `correlation-utils.ts` line 78 returns `0` for unknown pairs:

```typescript
return CRYPTO_CORRELATIONS[key1] ?? CRYPTO_CORRELATIONS[key2] ?? 0;
```

The documented intent was for unknown pairs to default to 0.3, but the implementation returns 0. Returning 0 is actually the safer choice (no false positives), so the constant is dead code.

**Fix:** Remove `DEFAULT_FALLBACK` from the constants to prevent confusion:
```typescript
export const CORRELATION_THRESHOLDS = {
  WARNING: 0.6,
  HIGH: 0.75,
  VERY_HIGH: 0.8,
} as const;
```

---

## Verified Correct (No Issues)

All items verified in Round 1 remain correct. Additionally confirmed:

- **Round 1 Fix 1**: `showExchangeData` now in `correlationWarning` memo deps -- verified
- **Round 1 Fix 2**: Error toast now generic with `console.error` for server-side logging -- verified
- **Round 1 Fix 3**: ErrorBoundary wraps page with `retryKey` pattern -- verified
- **Daily loss math**: Both Binance and Paper paths use `(|min(0, pnl)| / lossLimit) * 100` -- correct
- **Remaining budget**: `lossLimit + min(0, pnl)` clamped to `max(0, ...)` -- correct
- **Progress clamping**: `Math.min(100, ...)` -- correct
- **Threshold alignment**: RISK_THRESHOLDS (70/90) and DAILY_LOSS_THRESHOLDS (70/90/100) match
- **Mode isolation**: DailyLossTracker skips Binance in Paper; CorrelationMatrix uses `useModeFilteredTrades`; RiskEventLog disables exchange tabs in Paper
- **Trading gate severity order**: disabled > AI blocked > danger > warning -- correct
- **AI quality gate**: Minimum SAMPLE_COUNT (3) enforced -- correct
- **Risk event deduplication**: event_type + event_date + user_id checked before insert -- correct
- **Correlation matrix**: Centralized `getCorrelation` and `getBaseSymbol` -- single source of truth
- **Risk profile upsert**: check-then-update/insert with `maybeSingle()` -- safe
- **Audit logging**: Risk profile updates logged via `logAuditEvent` -- correct
- **URL tab persistence**: `useSearchParams` -- correct
- **Loading/empty states**: All components have proper loading skeletons and empty state CTAs
- **Semantic colors**: `text-profit` / `text-loss` / `text-[hsl(var(--chart-4))]` used correctly (except Issue #1)
- **ARIA**: First 3 sliders in RiskSettingsForm have `aria-label`; InfoTooltips on all key metrics
- **Currency formatting**: `useCurrencyConversion` in DailyLossTracker and RiskSummaryCard -- correct
- **RiskAlertBanner**: Non-dismissable when disabled -- correct security behavior
- **Security (RLS)**: All queries scoped by `user_id` via RLS
- **PnL standard**: `realized_pnl ?? pnl ?? 0` fallback chain used in unified-daily-pnl -- correct

---

## Summary

| # | File | Issue | Criteria | Severity |
|---|------|-------|----------|----------|
| 1 | `RiskSummaryCard.tsx` lines 188, 190, 196 | `text-warning` undefined -- correlation warning visually invisible | Clarity | High |
| 2 | `RiskSettingsForm.tsx` lines 134, 153 | Two sliders missing `aria-label` | Clarity | Medium |
| 3 | `risk-thresholds.ts` line 26 | Dead constant `DEFAULT_FALLBACK` never used | Code Quality | Low |

Total: 3 files, 3 fixes.

## Technical Details

### Fix 1: Replace undefined `text-warning` tokens in RiskSummaryCard

In `src/components/risk/RiskSummaryCard.tsx`, replace all 4 occurrences of `text-warning` with `text-[hsl(var(--chart-4))]` and `border-warning/30` with `border-[hsl(var(--chart-4))]/30` at lines 188, 190, and 196.

### Fix 2: Add aria-label to two sliders in RiskSettingsForm

In `src/components/risk/RiskSettingsForm.tsx`:
- Line 139 (after `step={5}`): add `aria-label={\`Max position size: ${maxPositionSize}%\`}`
- Line 158 (after `step={1}`): add `aria-label={\`Max concurrent positions: ${maxConcurrentPositions}\`}`

### Fix 3: Remove dead DEFAULT_FALLBACK constant

In `src/lib/constants/risk-thresholds.ts` line 26, remove the `DEFAULT_FALLBACK: 0.3` entry from `CORRELATION_THRESHOLDS`.
