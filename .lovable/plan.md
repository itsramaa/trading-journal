

# Daily P&L Page: Deep UX Analysis & Fixes

## Issues Found

### 1. Symbol Breakdown Completely Hidden in Paper Mode

Line 318: `{showExchangeData && symbolBreakdown.length > 0 && (` hides the entire Symbol Breakdown section in Paper mode. However, `useSymbolBreakdown` already calculates paper trade data via `paperBreakdown.weekly` — the hook fully supports Paper mode with per-symbol aggregation from `trade_entries`.

This violates mode-as-context: the layout should be identical in both modes; only data sources differ. A Paper trader who trades multiple pairs (e.g., BTCUSDT, ETHUSDT) should see their per-symbol breakdown.

**Fix**: Remove the `showExchangeData` guard. Keep only `symbolBreakdown.length > 0` so the section shows whenever there is data, regardless of mode. The Fees column inside the breakdown is valid for both modes (`trade.fees` exists on paper trades too).

### 2. Commission Column Hidden in Paper Mode — Data Exists But Not Shown

Line 152: `{showExchangeData && (` hides the Commission metric in Today's P&L card. However, `useUnifiedDailyPnl` returns `totalCommission` for Paper mode too (calculated from `trade.fees`). Paper traders who manually enter fees are denied visibility of their fee impact.

This also breaks the 4-column grid layout: Paper mode shows 3 columns (Realized P&L, Trades, Win Rate) while Live shows 4 (+ Commission). Layout inconsistency.

**Fix**: Always show the Commission column. In Paper mode, it will show the sum of `fees` from paper trades (could be 0 if no fees entered). This maintains grid parity.

### 3. Export Functions Defined But Never Used (Dead Code)

`handleExportCSV` (line 61) and `handleExportPDF` (line 82) are defined with full logic, but the UI only renders a `<Link to="/export?tab=analytics">` button (line 129). These two functions are never called — pure dead code.

Additionally, both functions pass `trades: []` (empty array), making the "Trade History" section of the export output empty.

**Fix**: Remove the dead `handleExportCSV` and `handleExportPDF` functions and their associated imports (`usePerformanceExport`). The Export button already correctly links to the dedicated Export page. This reduces bundle size and removes confusion.

### 4. ChangeIndicator Recreated on Every Render

Line 55: `const ChangeIndicator = ({ value, suffix }) => ...` is defined **inside** the component body. This means React creates a new component reference on every render, causing unnecessary unmount/remount of the elements.

**Fix**: Extract `ChangeIndicator` outside the `DailyPnL` component as a standalone function or move to a shared UI utility.

### 5. No Empty State for Zero-Activity Days

When a trader has no trades today and no trades this week, the page renders all cards with `$0.00`, `0%`, `0 trades`. There's no visual cue that data is simply absent vs. the trader actually having zero P&L. Other pages in the app use empty states for this scenario.

**Fix**: When `dailyStats.totalTrades === 0 && weeklyStats.totalTrades === 0`, show a contextual empty state banner (e.g., "No trading activity recorded yet. Start trading to see your P&L breakdown here.") above the cards, while still rendering the cards with zero values for structural consistency.

### 6. Unused Imports After Dead Code Removal

After removing `handleExportCSV`/`handleExportPDF`, the following imports become unused:
- `usePerformanceExport`
- `useSymbolBreakdown` import of `weeklyBreakdown` can stay (it's used in the symbol breakdown section)

**Fix**: Clean up imports as part of the dead code removal.

---

## Implementation Plan

### File: `src/pages/DailyPnL.tsx`

1. **Remove `showExchangeData` guard on Symbol Breakdown** (line 318): Change to `{symbolBreakdown.length > 0 && (`
2. **Remove `showExchangeData` guard on Commission column** (line 152): Always render the Commission metric
3. **Remove dead export functions**: Delete `handleExportCSV`, `handleExportPDF`, and the `usePerformanceExport` import
4. **Extract `ChangeIndicator`**: Move outside the component body to module-level
5. **Add empty state banner**: When both daily and weekly trades are 0, show a subtle info banner before the cards

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/pages/DailyPnL.tsx` | Remove `showExchangeData` guards on Commission and Symbol Breakdown; remove dead export code; extract ChangeIndicator; add empty state banner |

