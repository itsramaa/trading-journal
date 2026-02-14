
# Risk Overview Page: Deep UX Analysis & Fixes

## Issues Found

### 1. Uncontrolled Tabs — No URL Persistence

The `Tabs` component uses `defaultValue="overview"` (uncontrolled). This means:
- Switching between Overview and History is not reflected in the URL
- Deep links to `/risk?tab=history` don't work
- Navigating away and back always resets to Overview

**Fix**: Use controlled `Tabs` with `useSearchParams`, same pattern applied to ImportTrades and TradingJournal.

### 2. CorrelationMatrix Completely Hidden in Paper Mode

Line 136: `{showExchangeData && <CorrelationMatrix />}` removes the component entirely in Paper mode. Per the mode-as-context principle, the layout should remain identical — only data and business rules change.

The CorrelationMatrix already uses `useModeFilteredTrades()` internally, which filters by current mode. In Paper mode, it will show paper trade positions (if any are open). The `showExchangeData` guard is unnecessary and breaks layout consistency.

**Fix**: Remove the `showExchangeData` conditional. The CorrelationMatrix already handles empty states gracefully ("No open positions to analyze"). Paper mode users with open paper trades should see correlation data for those positions.

### 3. Hardcoded Colors Violate Semantic Design System

Per memory `ui/semantic-financial-colors`, the platform uses `text-profit` and `text-loss` design tokens. Multiple risk components use raw Tailwind colors (`text-red-500`, `text-green-500`, `text-yellow-500`, `text-orange-500`) instead.

Affected files:
- `RiskEventLog.tsx` — 10+ instances in `eventTypeConfig` and inline classes
- `RiskSummaryCard.tsx` — 6+ instances in status icons and badges
- `RiskAlertBanner.tsx` — 8+ instances in banner styling

**Fix**: Replace hardcoded colors with semantic tokens:
- `text-red-500` -> `text-loss`
- `text-green-500` -> `text-profit`
- `text-yellow-500` -> `text-[hsl(var(--chart-4))]` (warning token already used in DailyLossTracker)
- `text-orange-500` -> `text-[hsl(var(--chart-5))]`
- Background variants similarly (e.g. `bg-red-500/20` -> `bg-loss/20`)

### 4. RiskEventLog History Tab — Liquidations/Margin Tabs Hidden Instead of Disabled-Preview in Paper Mode

The Liquidations and Margin tabs in `RiskEventLog` check `isConfigured` (Binance API connected) to disable tabs. But there's no Paper mode awareness — if a Paper mode user somehow has Binance configured, they'd see Live liquidation data in Paper context, violating data isolation.

**Fix**: Add mode awareness to `RiskEventLog`:
- In Paper mode, disable Liquidations and Margin tabs with tooltip "Available in Live mode" (same pattern as Import page)
- Keep the Risk Events tab fully functional (it queries from DB, already mode-neutral)

### 5. `navigateToSettings` Uses `window.location.href` Instead of React Router

Line 29-31 uses `window.location.href = '/settings?tab=trading'` which causes a full page reload. Other parts of the app correctly use `<Link>` or `useNavigate()`.

**Fix**: Use `useNavigate()` from react-router-dom for SPA navigation.

### 6. RiskSummaryCard Uses Hardcoded 10000 as Fallback Balance

Line 96-97: `(riskProfile.max_daily_loss_percent ?? 5) / 100 * 10000` — when there's no `riskStatus` (no trading activity), the card shows daily loss limit calculated against a hardcoded $10,000 instead of the user's actual balance.

**Fix**: Either show just the percentage (since no balance is available), or omit the dollar amount in the "no activity" state. Showing a fake $10k-based number is misleading.

---

## Implementation Plan

### File: `src/pages/RiskManagement.tsx`
1. **Controlled Tabs**: Replace `defaultValue="overview"` with controlled `value` + `onValueChange` via `useSearchParams`
2. **Remove CorrelationMatrix guard**: Change `{showExchangeData && <CorrelationMatrix />}` to always render `<CorrelationMatrix />`
3. **Fix navigation**: Replace `window.location.href` with `useNavigate()`
4. Import `useNavigate` from react-router-dom

### File: `src/components/risk/RiskEventLog.tsx`
1. **Semantic colors**: Replace all hardcoded `text-red-500`, `text-green-500`, etc. with `text-loss`, `text-profit`, `text-[hsl(var(--chart-4))]`, `text-[hsl(var(--chart-5))]`
2. **Paper mode guard**: Import `useModeVisibility`, disable Liquidations and Margin tabs when `!showExchangeData` (Paper mode), with appropriate tooltip text

### File: `src/components/risk/RiskSummaryCard.tsx`
1. **Semantic colors**: Replace hardcoded colors with design tokens (`text-profit`, `text-loss`, `text-[hsl(var(--chart-4))]`)
2. **Fix hardcoded balance**: In the "no activity" state, show only percentage instead of dollar amount based on fake $10k

### File: `src/components/risk/RiskAlertBanner.tsx`
1. **Semantic colors**: Replace `text-red-500` with `text-loss`, `text-yellow-500` with `text-[hsl(var(--chart-4))]`, and their background variants

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/pages/RiskManagement.tsx` | Controlled tabs via useSearchParams; remove CorrelationMatrix mode guard; fix navigateToSettings to use useNavigate |
| `src/components/risk/RiskEventLog.tsx` | Semantic color tokens; Paper mode disable Liquidations/Margin tabs |
| `src/components/risk/RiskSummaryCard.tsx` | Semantic color tokens; remove hardcoded $10k fallback |
| `src/components/risk/RiskAlertBanner.tsx` | Semantic color tokens |
