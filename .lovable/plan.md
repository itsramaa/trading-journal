

# Deep-Dive Analysis: Daily P&L Page

---

## 1. Page Orchestrator (`src/pages/DailyPnL.tsx`)

### A. Comprehensiveness

| Feature | Status |
|---------|--------|
| PageHeader with icon/description | Done |
| Live/Paper badge | Done |
| Export button linking to /export | Done |
| Loading skeleton | Done |
| Empty state banner (0 trades) | Done |
| Today's P&L summary (4 metrics) | Done |
| Week comparison cards (4 cards) | Done |
| Best/Worst trade cards (7 days) | Done |
| 7-Day P&L Trend bar chart | Done |
| Symbol Breakdown table (7 days) | Done |
| ErrorBoundary wrapper | **Missing** |
| `role="region"` + `aria-label` | **Missing** |

**Gaps:**

1. **No `role="region"` on root container** -- inconsistent with the ARIA standard applied to 11+ other pages (Performance, Risk, Dashboard all have it).

2. **No ErrorBoundary wrapper** -- every other analytics page (Performance, Risk, Flow & Liquidity) has a top-level `ErrorBoundary` with `retryKey`. This page has none. Must wrap the entire rendered output with `<ErrorBoundary>`.

3. **No tooltip on "Live" / "Paper" badge** (line 85-87) -- Should say: "Data source: Live uses real-time exchange data, Paper uses simulated account data."

4. **No tooltip on "Export" button** (line 88-93) -- Should say: "Export P&L analytics data to CSV or PDF from the Export page."

---

### B. Accuracy

| Check | Result |
|-------|--------|
| Daily P&L hook uses `realized_pnl ?? pnl ?? 0` | Correct |
| Weekly P&L hook uses same fallback chain | Correct |
| Week comparison uses Monday-based weeks (`weekStartsOn: 1`) | Correct |
| Symbol breakdown mode filter (Paper/Live) | Correct |
| Win rate calculation `(wins / total) * 100` | Correct |
| `ChangeIndicator` null-safe for new activity | Correct |
| `ChangeIndicator` sign-flip detection | Correct |

5. **"Realized P&L" label displays `grossPnl`** (lines 117-120): The label says "Realized P&L" but renders `dailyStats.grossPnl`. Per the `useUnifiedDailyPnl` hook, `grossPnl = totalPnl + totalFees` (i.e., P&L before fee deductions). This is actually **Gross P&L**, not Net Realized P&L. The label is misleading.
   - **Fix**: Rename the label to "Gross P&L" to accurately reflect the value being shown.

6. **Symbol Breakdown label says "7 days" but Binance source only has today's data** (lines 303-304): The `useSymbolBreakdown` hook returns `weeklyBreakdown: binanceBreakdown` with a comment "Binance daily hook only fetches 1 day, so same for now" (line 138 of the hook). For Live/Binance users, the card says "7 days" but only shows today's data.
   - **Fix**: Make the label dynamic based on source: show "(Today)" when source is `binance`, "(7 Days)" when source is `paper`.

---

### C. Clarity -- Missing Tooltips

7. **"Today's P&L" card title** (line 111) -- No tooltip. Should say: "Summary of your realized trading activity for today (UTC). Resets daily at 00:00 UTC."

8. **"Realized P&L" label** (line 117) -- After renaming to "Gross P&L", add tooltip: "Total profit/loss from closed trades today, before fee deductions."

9. **"Commission" label** (line 123) -- No tooltip. Should say: "Total trading fees (maker/taker commission) deducted from your gross P&L today."

10. **"Trades Today" label** (line 129) -- No tooltip. Should say: "Number of closed trades recorded today."

11. **"Win Rate" label** (line 133) -- No tooltip. Should say: "Percentage of today's trades that were profitable."

12. **"This Week P&L" card** (line 152) -- Already has InfoTooltip. OK.

13. **"Net (After Fees)" card title** (line 175) -- No tooltip. Should say: "Week's P&L after deducting all fees (commission + funding). Gross amount shown below."

14. **"Trades This Week" card title** (line 190) -- No tooltip. Should say: "Total closed trades this week compared to last week."

15. **"Win Rate" (week) card title** (line 205) -- No tooltip. Should say: "Percentage of winning trades this week. 'pp' = percentage points change from last week."

16. **"Best Trade (7 Days)" card title** (line 223) -- Already has InfoTooltip. OK.

17. **"Worst Trade (7 Days)" card title** (line 245) -- Already has InfoTooltip. OK.

18. **"7-Day P&L Trend" chart title** (line 267) -- No tooltip. Should say: "Daily net P&L bars for the last 7 days. Green = profitable day, Red = loss day."

19. **"Symbol Breakdown" card title** (line 303) -- No tooltip. Should say: "P&L breakdown by trading pair, sorted by absolute net impact."

20. **"Fees" column in symbol breakdown** (line 316) -- No tooltip. Should say: "Total fees (commission + funding) for this symbol during the period."

21. **"Net P&L" column in symbol breakdown** (line 320) -- No tooltip. Should say: "Profit/loss after all fee deductions for this symbol."

---

### D. Code Quality

22. **No Recharts Tooltip alias** (line 33): `Tooltip` is imported from recharts directly. When adding `InfoTooltip` and potentially Radix `Tooltip` components for the tooltips above, a naming conflict will occur. Must alias the Recharts import as `RechartsTooltip` (same pattern used in the Performance page after its fix).

23. **`symbolBreakdown` typed as `any`** (line 308): `symbolBreakdown.map((item: any) => ...)` loses type safety. The hook exports `SymbolBreakdownItem` -- should use that type instead.

24. **Missing `font-mono-numbers` class** on financial values: The Today's P&L card and week comparison cards don't use `font-mono-numbers` (or `tabular-nums`) for numerical values, unlike Account Detail and Performance pages where this is standard for alignment.

---

## 2. Hooks Analysis (All Correct -- No Changes Needed)

### `useUnifiedDailyPnl` (`src/hooks/analytics/use-unified-daily-pnl.ts`)
- PnL chain: `realized_pnl ?? pnl ?? 0` -- Correct (line 81)
- Mode isolation via `trade_mode` + fallback to `source` field -- Correct
- Source detection from `useBinanceConnectionStatus` + `useTradeMode` -- Correct
- No issues found.

### `useUnifiedWeeklyPnl` (`src/hooks/analytics/use-unified-weekly-pnl.ts`)
- PnL chain: `realized_pnl ?? pnl ?? 0` (line 104) -- Correct
- 7-day window: `subDays(today, 6)` including today -- Correct
- Best/worst trade tracking with null initialization -- Correct
- Mode filter identical to daily hook -- Correct
- No issues found.

### `useUnifiedWeekComparison` (`src/hooks/analytics/use-unified-week-comparison.ts`)
- Monday-based weeks (`weekStartsOn: 1`) -- Correct
- Null-safe percent changes (returns `null` when baseline is 0) -- Correct
- Sign-flip detection delegated to `ChangeIndicator` -- Correct
- No issues found.

### `useSymbolBreakdown` (`src/hooks/analytics/use-symbol-breakdown.ts`)
- PnL chain: `realized_pnl ?? pnl ?? 0` (line 67) -- Correct
- Mode filter consistent with other hooks -- Correct
- Binance weekly = daily data (acknowledged limitation with comment) -- Known, addressed by dynamic label fix (#6)
- No issues found.

---

## 3. Summary of All Recommendations

### Priority 1 -- Accuracy Fixes

| # | Issue | Fix |
|---|-------|-----|
| 5 | "Realized P&L" label shows `grossPnl` (before fees) | Rename label to "Gross P&L" |
| 6 | Symbol Breakdown says "7 days" but Binance source only has today's data | Make label dynamic: "(Today)" for binance, "(7 Days)" for paper |

### Priority 2 -- Missing Tooltips (Clarity)

| # | Elements | Location |
|---|----------|----------|
| 3 | Live/Paper badge | PageHeader area |
| 4 | Export button | PageHeader area |
| 7 | Today's P&L card title | Today's P&L section |
| 8 | Gross P&L label (renamed) | Today's P&L section |
| 9 | Commission label | Today's P&L section |
| 10 | Trades Today label | Today's P&L section |
| 11 | Win Rate (today) label | Today's P&L section |
| 13 | Net (After Fees) card title | Week comparison cards |
| 14 | Trades This Week card title | Week comparison cards |
| 15 | Win Rate (week) card title | Week comparison cards |
| 18 | 7-Day P&L Trend chart title | Chart section |
| 19 | Symbol Breakdown card title | Symbol table |
| 20 | Fees column header | Symbol table |
| 21 | Net P&L column header | Symbol table |

### Priority 3 -- Code Quality and Accessibility

| # | Issue | Fix |
|---|-------|-----|
| 1 | Missing `role="region"` on page root | Add `role="region"` and `aria-label="Daily P&L Analytics"` to root div |
| 2 | No ErrorBoundary wrapper | Wrap entire page content with `<ErrorBoundary>` component with `retryKey` |
| 22 | Recharts `Tooltip` naming conflict risk | Alias import as `RechartsTooltip` |
| 23 | `any` type on symbol breakdown map | Replace with `SymbolBreakdownItem` type from hook |
| 24 | Missing `font-mono-numbers` on financial values | Add class to all `text-2xl font-bold` financial value elements |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/DailyPnL.tsx` | All 24 items: add `role="region"` and `aria-label` (P3-#1), wrap with ErrorBoundary (P3-#2), rename "Realized P&L" to "Gross P&L" (P1-#5), dynamic symbol breakdown period label (P1-#6), add 14 tooltips (P2), alias Recharts Tooltip as `RechartsTooltip` (P3-#22), type symbolBreakdown with `SymbolBreakdownItem` (P3-#23), add `font-mono-numbers` to financial values (P3-#24), add tooltips to Live/Paper badge and Export button (P2-#3,#4) |

This is a single-file change since the entire Daily P&L page is self-contained in one component. The 4 supporting hooks are all accurate and require no modifications.

