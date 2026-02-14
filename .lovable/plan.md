

# Backtest Page: Deep UX Analysis & Fixes

## Scope & Coverage

Analyzed files (all read in full):
- `src/pages/Backtest.tsx` (48 lines, page orchestrator)
- `src/components/strategy/BacktestRunner.tsx` (465 lines, run tab)
- `src/components/strategy/BacktestResults.tsx` (392 lines, results display)
- `src/components/strategy/BacktestComparison.tsx` (397 lines, compare tab)
- `src/components/strategy/BacktestDisclaimer.tsx` (168 lines, disclaimer alert)
- `src/components/strategy/BacktestSessionBreakdown.tsx` (381 lines, session analysis)
- `src/hooks/use-backtest.ts` (CRUD hooks)
- `src/hooks/use-backtest-export.ts` (CSV/PDF export)
- `src/types/backtest.ts` (type definitions)
- `src/lib/constants/backtest-config.ts` (shared constants)

## Issues Found

### 1. Uncontrolled Page-Level Tabs -- No URL Persistence

**Backtest.tsx line 24**: `<Tabs defaultValue="run">` uses uncontrolled state. This means:
- Deep links like `/backtest?tab=compare` do not work
- Navigating away and back always resets to "Run Backtest"
- Inconsistent with the `useSearchParams` pattern now established on AI Insights, Performance, Risk Calculator, and Strategies pages

Note: `BacktestRunner` already uses `useSearchParams` internally (line 49) but only to read `?strategy=` for pre-selecting a strategy -- it does not control the page tabs.

**Fix**: Add `useSearchParams` to `Backtest.tsx` for controlled tab state (`run` | `compare`).

### 2. Broken `text-warning` Color Token in BacktestDisclaimer

**BacktestDisclaimer.tsx** uses `text-warning`, `border-warning/50`, and `bg-warning/5` extensively (lines 47-48, 101-102, 158). The CSS variable `--warning` does not exist in the project stylesheets. This means:
- The AlertTriangle icon has no applied color (invisible or inherited)
- The border and background tints are not rendered
- This is the exact same class of bug fixed in VolatilityStopLoss

Affected lines:
- Line 47: `border-warning/50 bg-warning/5`
- Line 48: `text-warning`
- Line 101: `border-warning/50 bg-warning/5`
- Line 102: `text-warning`
- Line 158: `text-warning`

**Fix**: Replace with semantic chart token `chart-4` (orange/amber, used for warnings throughout the app):
- `text-warning` -> `text-[hsl(var(--chart-4))]`
- `border-warning/50` -> `border-[hsl(var(--chart-4))]/50`
- `bg-warning/5` -> `bg-[hsl(var(--chart-4))]/5`

### 3. Mode Consistency (No Structural Issues)

BacktestRunner correctly uses `useTradeMode()` to hide Binance balance in Paper mode (line 86-87). This is a data-source label, not a structural difference. Both modes have identical feature access, layout, and flow. No fix needed.

### 4. Other Observations (No Fix Needed)

- **BacktestResults inner tabs** (`defaultValue="equity"` on line 249): These are sub-tabs within a transient result view -- URL persistence would be counterproductive since results are ephemeral state.
- **BacktestComparison**: Clean implementation with proper loading skeleton, empty state, and semantic colors (`text-profit`/`text-loss`). No issues.
- **BacktestSessionBreakdown**: Uses semantic design tokens (`chart-1` through `chart-4`, `profit`/`loss`). No issues.
- **Export hooks**: Pure utility, no UI concerns.

---

## Implementation Plan

### File: `src/pages/Backtest.tsx`
1. Import `useSearchParams` from `react-router-dom`
2. Replace `<Tabs defaultValue="run">` with controlled `value`/`onValueChange` bound to URL search params

### File: `src/components/strategy/BacktestDisclaimer.tsx`
1. Replace all 5 occurrences of `text-warning` with `text-[hsl(var(--chart-4))]`
2. Replace all `border-warning/50` with `border-[hsl(var(--chart-4))]/50`
3. Replace all `bg-warning/5` with `bg-[hsl(var(--chart-4))]/5`

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/pages/Backtest.tsx` | Controlled tabs via `useSearchParams` |
| `src/components/strategy/BacktestDisclaimer.tsx` | Replace 5 broken `warning` color references with semantic `chart-4` token |

