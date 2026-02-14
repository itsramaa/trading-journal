

# AI Insights Page: Deep UX Analysis & Fixes

## Scope & Coverage

Analyzed files:
- `src/pages/AIInsights.tsx` (581 lines, orchestrator)
- `src/components/analytics/PredictiveInsights.tsx` (predictions tab)
- `src/components/analytics/contextual/ContextualPerformance.tsx` (contextual tab)
- `src/components/analytics/EmotionalPatternAnalysis.tsx` (contextual tab)
- `src/components/analytics/session/SessionInsights.tsx` (patterns tab, session section)
- `src/lib/constants/ai-analytics.ts` (shared constants)

## Issues Found

### 1. Uncontrolled Tabs - No URL Persistence

**Line 392**: `<Tabs defaultValue="patterns">` uses uncontrolled state. This means:
- Deep links like `/ai-insights?tab=predictions` do not work
- Navigating away and back always resets to "Pattern Analysis"
- Inconsistent with controlled tab pattern established on Performance, DailyPnL, Risk, and Import pages

**Fix**: Replace with controlled `Tabs` using `useSearchParams` from `react-router-dom` (already imported). Bind `value` and `onValueChange` to the `tab` search parameter.

### 2. Session Insights Conditionally Hidden Instead of Empty State

**Line 509**: `{contextualData?.bySession && (` hides the entire Session Insights section when contextual data is absent. The section silently disappears with no feedback, unlike Predictions and Contextual tabs which both render proper empty states.

The `SessionInsights` component already has its own internal empty state (line 148-166 of SessionInsights.tsx) for insufficient trades. The guard on line 509 prevents users from ever seeing that helpful feedback.

**Fix**: Always render `<SessionInsights>`. Pass `bySession` with a fallback empty record so the component's built-in empty state handles the "no data" scenario naturally.

### 3. `useTradingStrategies` Fetched But Never Used (Dead Code)

**Line 78**: `const { data: strategies = [] } = useTradingStrategies();` is declared but `strategies` is never referenced anywhere in the 581-line component. This triggers an unnecessary database query on every page load, wasting bandwidth and adding latency.

**Fix**: Remove the import and hook call.

### 4. Hardcoded Colors in ContextualPerformance FEAR_GREED_LABELS

**Lines 39-43 of ContextualPerformance.tsx**: Uses raw Tailwind colors (`text-red-500`, `text-orange-500`, `text-emerald-500`, `text-green-500`) for Fear/Greed zone labels. Per the project's semantic design system memory (`semantic-financial-colors`), financial indicators should use design tokens.

**Fix**: Replace with semantic chart tokens:
- `text-red-500` (Extreme Fear) -> `text-loss`
- `text-orange-500` (Fear) -> `text-[hsl(var(--chart-4))]`
- `text-muted-foreground` (Neutral) -> unchanged (already correct)
- `text-emerald-500` (Greed) -> `text-[hsl(var(--chart-2))]`
- `text-green-500` (Extreme Greed) -> `text-profit`

### 5. Mode Consistency (No Issues Found)

All sub-components use `useModeFilteredTrades()` or `useContextualAnalytics()` which already handle Paper/Live isolation via `trade_mode` filtering. No `showExchangeData` guards exist. Layout, flow, and component availability are identical in both modes. This is correct and no fix is needed.

---

## Implementation Plan

### File: `src/pages/AIInsights.tsx`
1. Add `useSearchParams` usage for controlled tab state (`patterns`, `predictions`, `contextual`)
2. Remove unused `useTradingStrategies` import and hook call
3. Remove conditional guard on `SessionInsights`; always render it with a safe fallback for `bySession`

### File: `src/components/analytics/contextual/ContextualPerformance.tsx`
1. Replace hardcoded Fear/Greed zone colors with semantic design tokens

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/pages/AIInsights.tsx` | Controlled tabs via `useSearchParams`; remove dead `useTradingStrategies`; always render SessionInsights with empty-state fallback |
| `src/components/analytics/contextual/ContextualPerformance.tsx` | Replace 4 hardcoded Tailwind colors in `FEAR_GREED_LABELS` with semantic tokens |

