

# Risk Calculator Page: Deep UX Analysis & Fixes

## Scope & Coverage

Analyzed files:
- `src/pages/PositionCalculator.tsx` (283 lines, page orchestrator)
- `src/components/risk/PositionSizeCalculator.tsx` (237 lines, legacy standalone component)
- `src/components/risk/calculator/CalculatorInputs.tsx` (inputs sub-component)
- `src/components/risk/calculator/CalculatorResults.tsx` (results sub-component)
- `src/components/risk/calculator/ContextWarnings.tsx` (market context warnings)
- `src/components/risk/calculator/RiskAdjustmentBreakdown.tsx` (context-aware risk breakdown)
- `src/components/risk/calculator/VolatilityStopLoss.tsx` (volatility tab)
- `src/components/risk/calculator/QuickReferenceR.tsx` (R-value reference badges)
- `src/components/risk/calculator/index.ts` (barrel export)
- `src/components/risk/index.ts` (risk barrel export)
- `src/lib/calculations/position-sizing.ts` (calculation engine)
- `src/lib/constants/risk-thresholds.ts` (shared constants)

## Issues Found

### 1. Uncontrolled Tabs -- No URL Persistence

**Line 35**: `const [activeTab, setActiveTab] = useState("calculator")` uses local state instead of URL search params. This means:
- Deep links like `/calculator?tab=volatility` do not work
- The "Apply" button in VolatilityStopLoss calls `setActiveTab("calculator")` which works, but the tab state is lost on page refresh
- Inconsistent with the controlled `useSearchParams` pattern now established on AI Insights, Performance, Risk, and Import pages

**Fix**: Replace `useState` with `useSearchParams`. The `handleApplyStopLoss` function already calls `setActiveTab("calculator")` which will naturally translate to `setSearchParams({ tab: 'calculator' })`.

### 2. `PositionSizeCalculator` Component is Dead Code (237 Lines)

The standalone `PositionSizeCalculator` component in `src/components/risk/PositionSizeCalculator.tsx` duplicates 90% of the page logic (same hooks, same state, same calculations). It is exported from `src/components/risk/index.ts` but **never imported by any page or component**. It also:
- Uses a hardcoded `10000` fallback balance instead of the centralized `DEFAULT_RISK_VALUES.FALLBACK_BALANCE` constant
- Has hardcoded default prices (`50000`/`49000`) instead of using `CALCULATOR_INPUT_DEFAULTS`
- Maintains its own `selectedSymbol` state instead of using `MarketContext`
- Lacks `ContextWarnings` and `RiskAdjustmentBreakdown` that the page includes

**Fix**: Remove the dead component file and its export from the barrel file.

### 3. Hardcoded Colors in VolatilityStopLoss -- `text-warning` Does Not Exist

**Line 38**: `getRiskLevelColor` returns `'text-warning'` for the `high` volatility level, but `text-warning` is not defined in the project's CSS. This means the text renders with no applied color (falls back to inherited color), which is a visual bug.

Additionally:
- Line 35: `'text-blue-500'` for `low` volatility should use a semantic chart token
- Line 159: `bg-warning/10 text-warning` on the recommendation message also uses the non-existent `warning` token

**Fix**: Replace with semantic tokens:
- `text-blue-500` (low) -> `text-[hsl(var(--chart-5))]`
- `text-warning` (high) -> `text-[hsl(var(--chart-4))]`
- `bg-warning/10 text-warning` -> `bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))]`

### 4. VolatilityStopLoss Returns `null` on No Data Instead of Empty State

**Line 104-106**: When `volatility` or `stopLossSuggestions` is null (e.g., no Binance data in Paper mode), the component returns `null`, causing the entire Volatility tab to appear empty with no feedback. This is especially problematic in Paper mode where Binance API data may not be available.

**Fix**: Instead of returning `null`, render an informational empty state card explaining that volatility data requires market data connection, maintaining layout stability.

### 5. Mode Consistency (No Structural Issues)

The page uses `useBestAvailableBalance()` which already handles Paper/Live mode (Paper accounts sum vs Binance wallet). `ContextWarnings` uses `useModeFilteredTrades()` for correlated position checks. No `showExchangeData` guards prevent feature access. Both modes see the same layout. This is correct.

However, Binance-specific UI labels are hardcoded in `CalculatorInputs.tsx`:
- Line 52: Badge shows "Binance" text
- Line 70: Text shows "From Binance wallet" vs "From paper trading account(s)"

These are **correct** behavior -- they describe data source, not mode. No fix needed.

---

## Implementation Plan

### File: `src/pages/PositionCalculator.tsx`
1. Replace `useState("calculator")` with `useSearchParams` for URL-persistent tab state (`useSearchParams` is not currently imported -- add it from `react-router-dom`, which is already imported via `Link`)

### File: `src/components/risk/calculator/VolatilityStopLoss.tsx`
1. Replace `text-blue-500` with `text-[hsl(var(--chart-5))]`
2. Replace `text-warning` with `text-[hsl(var(--chart-4))]`
3. Replace `bg-warning/10 text-warning` with `bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))]`
4. Replace `return null` on no data with an empty state card

### File: `src/components/risk/PositionSizeCalculator.tsx`
1. Delete file (dead code, never imported)

### File: `src/components/risk/index.ts`
1. Remove `PositionSizeCalculator` export

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/pages/PositionCalculator.tsx` | Controlled tabs via `useSearchParams` |
| `src/components/risk/calculator/VolatilityStopLoss.tsx` | Fix broken `text-warning` color; replace hardcoded colors with semantic tokens; add empty state |
| `src/components/risk/PositionSizeCalculator.tsx` | Delete (dead code, 237 lines) |
| `src/components/risk/index.ts` | Remove dead export |

