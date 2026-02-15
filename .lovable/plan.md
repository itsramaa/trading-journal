

# Deep-Dive Analysis: Performance Page

---

## 1. Page Orchestrator (`Performance.tsx`)

### A. Comprehensiveness

| Feature | Status |
|---------|--------|
| URL-driven tab state (overview/monthly/context/strategies) | Done |
| Analytics Level Selector (Overall/Type/Exchange/Account) | Done |
| Date Range filter | Done |
| Strategy multi-select filter | Done |
| Event Days Only toggle | Done |
| FilterActiveIndicator for non-overall scopes | Done |
| Export link to /export | Done |
| ErrorBoundary with retryKey | Done |
| Loading skeleton | Done |
| Empty state when 0 trades | Done |
| Badge showing active scope in header | Done |
| Balance-aware drawdown (initialBalance from accounts) | Done |

**Gaps:**

1. **No `role="region"` on root container** -- inconsistent with the ARIA standard applied to 11+ other pages (DrawdownChart, TradingHeatmapChart, EquityCurveWithEvents all have it, but the page itself does not).

2. **No tooltips on tab triggers** -- "Overview", "Monthly", "Context", "Strategies" tabs have no contextual guidance explaining what each tab contains.

3. **No tooltip on "Export" button** -- Should explain: "Export analytics data to CSV or PDF from the Export page."

4. **No tooltip on analytics scope badge** -- The badge in the header (e.g., "Account", "Exchange: Binance") has no tooltip explaining what scope filtering means.

### B. Accuracy

| Check | Result |
|-------|--------|
| `calculateTradingStats` uses standardized PnL chain | Correct (via `getTradeNetPnl`) |
| `initialBalance` derivation for drawdown | Correct -- per-account or aggregate |
| `filterTradesByDateRange` and `filterTradesByStrategies` | Correct |
| Event day filter using `market_context.events.hasHighImpactToday` | Correct |
| Analytics level filtering (type/account/exchange/overall) | Correct |
| `tradesLoading` conditional on analytics level | Correct |

No accuracy issues found in the orchestrator.

### C. Code Quality

5. **`chartFormatCurrency` wrapper** (line 153): `const chartFormatCurrency = (v: number) => formatCompact(v)` is an unnecessary wrapper -- it just re-delegates. Could pass `formatCompact` directly. Minor.

---

## 2. PerformanceFilters

### A. Comprehensiveness -- Complete

All four filter types (analytics level, date range, strategy, event day) are properly implemented.

### C. Clarity -- Missing Tooltips

6. **"Event Days Only" switch label** -- No tooltip. Should say: "Show only trades executed on days with high-impact economic events (FOMC, CPI, NFP, etc.)."

7. **"All Strategies" dropdown button** -- No tooltip. Should say: "Filter performance metrics to specific trading strategies. Select one or more to compare."

---

## 3. PerformanceSummaryCard

### A. Comprehensiveness -- Complete

Rule-based verdict, edge label, trade count badge, and 4 key stats (Net PnL, Win Rate, Expectancy, Profit Factor) are all present.

### C. Clarity -- Missing Tooltips

8. **"Performance Summary" title** -- No tooltip. Should say: "Rule-based assessment of your overall trading edge based on PnL, win rate, expectancy, and profit factor."

9. **"Edge" badge** -- No tooltip. Should say: "Edge quality rating: Strong (WR>=50%, PF>=1.5), Moderate (profitable), Low (thin edge), Negative (unprofitable)."

---

## 4. SevenDayStatsCard

### A. Comprehensiveness -- Complete

Current streak, trades count, best/worst day with adaptive labeling.

### C. Clarity -- Missing Tooltips

10. **"7-Day Stats" heading** -- No tooltip. Should say: "Quick snapshot of your last 7 days of trading activity based on closed trades."

11. **"Current Streak" label** -- No tooltip. Should say: "Consecutive wins (W) or losses (L) from your most recent trade backward."

12. **"Trades (7D)" label** -- No tooltip. Should say: "Total number of closed trades in the last 7 calendar days."

13. **"Best Day" / "Least Loss Day" label** -- No tooltip. Should say: "Day with the highest cumulative PnL in the last 7 days. Labeled 'Least Loss Day' if all days were negative."

14. **"Worst Day" / "Smallest Gain Day" label** -- No tooltip. Should say: "Day with the lowest cumulative PnL in the last 7 days. Labeled 'Smallest Gain Day' if all days were positive."

### D. Code Quality

15. **Returns `null` when no closed trades** (line 66-68): Per the UX Consistency Standard, components should render an empty state card instead of `null` to prevent layout shifts.

---

## 5. PerformanceKeyMetrics

### A. Comprehensiveness -- Complete

Win Rate, Profit Factor, Expectancy, Max Drawdown, Largest Gain/Loss, Sharpe Ratio, Avg R:R, Total Trades, Total P&L with Binance breakdown.

### B. Accuracy

All values are sourced from `stats` (calculated by `calculateTradingStats`) and displayed with correct formatting. Sharpe shows "N/A" when null, Avg R:R shows "N/A" with guidance when null.

### C. Clarity

All 10 metric cards already have `InfoTooltip` components. Well implemented.

16. **"Total Trades" card** (line 178) -- Only card without a tooltip. Should say: "Number of closed trades in the filtered dataset. More trades improve statistical reliability."

17. **"Gross (Today)" sub-label in Binance section** -- No tooltip. Should say: "Today's gross realized PnL from Binance Futures before fees."

18. **"Fees" sub-label** -- No tooltip. Should say: "Total trading fees (commission + maker/taker fees) deducted from gross PnL."

---

## 6. TradingBehaviorAnalytics

### A. Comprehensiveness -- Complete

Avg Trade Duration, Long/Short Ratio, Order Type Performance all implemented with proper empty states.

### B. Accuracy

- P&L uses `realized_pnl ?? pnl ?? 0` -- Correct.
- `hold_time_minutes` accessed via `asExtended()` -- Correct pattern for DB fields not in TS type.
- Win determination uses `result === 'win'` -- Correct.

### C. Clarity

All three cards have `InfoTooltip`. No gaps.

### D. Code Quality

19. **Returns `null` when no data** (line 150): Per UX standard, should show an empty state card instead of disappearing.

---

## 7. EquityCurveWithEvents

### A. Comprehensiveness -- Complete

Equity curve, event annotations (ReferenceDot), custom tooltip with event info, event legend. ARIA attributes present.

### C. Clarity

Has InfoTooltip on title. No gaps.

---

## 8. DrawdownChart

### A. Comprehensiveness -- Complete

Drawdown area chart, max drawdown display, ARIA attributes, empty state.

### B. Accuracy

- Uses `realized_pnl ?? pnl ?? 0` -- Correct.
- Drawdown formula: `(peak - cumulative) / (initialBalance + peak) * 100` -- Correct per standardized formula.
- Capped at 100 -- Correct.

### C. Clarity -- Missing Tooltips

20. **"Max Drawdown" label in chart header** -- No tooltip. Should say: "Largest peak-to-trough equity decline. Calculated as percentage of total equity at peak."

21. **"Drawdown Chart" title** -- No tooltip. Should say: "Visual representation of equity decline from peak values over time. Deeper troughs indicate larger capital drawdowns."

---

## 9. SessionPerformanceChart

### A. Comprehensiveness -- Complete

Session breakdown (Sydney/Tokyo/London/NY/Other), win rate chart, session cards, best/worst badges, local time display.

### C. Clarity

Has InfoTooltip on title. Session cards have sufficient labels.

22. **Session card "Time (Local)" row** -- No tooltip. Should say: "Trading session hours converted to your local timezone from UTC."

---

## 10. TradingHeatmapChart

### A. Comprehensiveness -- Complete

Daily/Hourly/Session tabs, bar chart with color-coded win rates, best/worst insights, color legend.

### C. Clarity -- Missing Tooltips

23. **"Time-Based Win Rate" title** -- No tooltip. Should say: "Analyzes when you trade best by showing win rate by day of week, hour of day, and trading session."

24. **Tab triggers ("By Day", "By Hour", "Session")** -- No tooltips explaining the granularity of each view.

25. **Color legend** -- No tooltip. Should say: "Win rate bands: Green (60%+) = strong, Yellow (50-59%) = edge, Orange (40-49%) = weak, Red (<40%) = avoid."

---

## 11. PerformanceMonthlyTab

### A. Comprehensiveness -- Complete

This Month PnL, Monthly Trades, Monthly Win Rate, Avg Win/Loss, Rolling 30-Day chart.

### C. Clarity -- Missing Tooltips

26. **"This Month P&L"** -- No tooltip. Should say: "Net PnL from all closed trades in the current calendar month."

27. **"Monthly Trades"** -- No tooltip. Should say: "Number of closed trades this month vs last month."

28. **"Monthly Win Rate"** -- No tooltip. Should say: "Win rate for the current month. 'pp' = percentage points difference from last month."

29. **"Avg Win/Loss"** -- No tooltip. Should say: "Average profit on winning trades and average loss on losing trades this month."

30. **"Rolling 30-Day P&L" chart title** -- No tooltip. Should say: "Cumulative PnL over the last 30 days showing trend direction and momentum."

---

## 12. PerformanceContextTab

### A. Comprehensiveness -- Complete

Market Conditions Overview (CombinedContextualScore), Event Impact Analysis (EventDayComparison + FearGreedZoneChart), Volatility Analysis (VolatilityLevelChart). Conditional rendering based on data availability.

### C. Clarity

Has InfoTooltips on section headings. Sub-components (FearGreedZoneChart, VolatilityLevelChart) also have tooltips.

---

## 13. PerformanceStrategiesTab

### A. Comprehensiveness -- Complete

Strategy performance table with AI Quality Score, win rate progress bar, strategy comparison bar chart, empty state.

### C. Clarity -- Missing Tooltips

31. **"Strategy Performance" title** -- No tooltip. Should say: "Performance breakdown by trading strategy showing PnL, win rate, and AI quality score."

32. **"AI: [score]" badge** -- No tooltip. Should say: "AI Quality Score rates strategy effectiveness. Excellent (>=80), Good (>=60), Fair (>=40), Poor (<40)."

33. **"Contribution" column** -- No tooltip. Should say: "This strategy's share of total portfolio PnL as a percentage."

34. **"Strategy Comparison" chart title** -- No tooltip. Should say: "Visual comparison of absolute PnL contribution by each strategy."

---

## 14. Contextual Sub-Components

### EventDayComparison

35. **Hardcoded `$` in DiffBadge** (line 159): `prefix="$"` is hardcoded. Should use the currency formatter or remove the prefix.

36. **No tooltip on "Event Days" column header** -- Should say: "Trades executed on days with high-impact economic events (FOMC, CPI, NFP, GDP, etc.)."

37. **No tooltip on "Normal Days" column header** -- Should say: "Trades executed on days without major economic event releases."

### FearGreedZoneChart & VolatilityLevelChart

38. **Both use `formatCurrency` from `@/lib/formatters` (static)** instead of `useCurrencyConversion` hook: This means tooltips showing PnL values bypass user currency preferences.

### CombinedContextualScore

39. **P&L calculation uses `trade.pnl || 0`** (line 115): Uses `||` instead of `??`. If `pnl` is exactly `0`, this is fine, but it skips `realized_pnl` entirely. Should use `(trade as any).realized_pnl ?? trade.pnl ?? 0` per the standardized chain.

40. **No tooltip on "Combined Contextual Score" title** -- Should say: "Composite score (0-100) evaluating market conditions when you trade: Fear/Greed sentiment, volatility level, and macro event proximity."

41. **No tooltip on zone labels (Optimal/Favorable/Moderate/Risky/Extreme)** -- Should explain each zone's score range and what market conditions it represents.

---

## 15. Summary of Recommendations

### Priority 1 -- Bugs & Accuracy

| # | Issue | File | Fix |
|---|-------|------|-----|
| 35 | Hardcoded `$` prefix in DiffBadge | EventDayComparison.tsx | Remove `prefix="$"` or use dynamic currency |
| 38 | Static `formatCurrency` bypasses currency preferences | FearGreedZoneChart.tsx, VolatilityLevelChart.tsx | Replace with `useCurrencyConversion` hook |
| 39 | CombinedContextualScore uses `trade.pnl \|\| 0` instead of fallback chain | CombinedContextualScore.tsx | Change to `(trade as any).realized_pnl ?? trade.pnl ?? 0` |

### Priority 2 -- Missing Tooltips (Clarity)

| # | Elements | Component |
|---|----------|-----------|
| 2-4 | Tab triggers, Export button, scope badge | Performance.tsx |
| 6-7 | Event Days toggle, Strategy dropdown | PerformanceFilters.tsx |
| 8-9 | Summary title, Edge badge | PerformanceSummaryCard.tsx |
| 10-14 | 7-Day Stats heading, streak, trades, best/worst day | SevenDayStatsCard.tsx |
| 16-18 | Total Trades card, Binance gross/fees sub-labels | PerformanceKeyMetrics.tsx |
| 20-21 | Drawdown chart title and max DD label | DrawdownChart.tsx |
| 22 | Session card "Time (Local)" | SessionPerformanceChart.tsx |
| 23-25 | Heatmap title, tab triggers, color legend | TradingHeatmapChart.tsx |
| 26-30 | Monthly tab 4 cards + rolling chart | PerformanceMonthlyTab.tsx |
| 31-34 | Strategy table title, AI badge, contribution, comparison chart | PerformanceStrategiesTab.tsx |
| 36-37 | Event/Normal day column headers | EventDayComparison.tsx |
| 40-41 | Combined Contextual Score title and zone labels | CombinedContextualScore.tsx |

### Priority 3 -- Code Quality & UX

| # | Issue | Fix |
|---|-------|-----|
| 1 | Missing `role="region"` on page root | Performance.tsx |
| 5 | Unnecessary `chartFormatCurrency` wrapper | Performance.tsx (minor) |
| 15 | SevenDayStatsCard returns `null` instead of empty state | SevenDayStatsCard.tsx |
| 19 | TradingBehaviorAnalytics returns `null` instead of empty state | TradingBehaviorAnalytics.tsx |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Performance.tsx` | Add `role="region"` (P3), add tooltips to tab triggers (P2), simplify `chartFormatCurrency` (P3) |
| `src/components/performance/PerformanceFilters.tsx` | Add tooltips to Event Days toggle and Strategy dropdown (P2) |
| `src/components/performance/PerformanceSummaryCard.tsx` | Add tooltips to title and Edge badge (P2) |
| `src/components/performance/PerformanceMonthlyTab.tsx` | Add tooltips to all 4 metric cards and rolling chart title (P2) |
| `src/components/performance/PerformanceStrategiesTab.tsx` | Add tooltips to Strategy table title, AI badge, Contribution, comparison chart (P2) |
| `src/components/analytics/SevenDayStatsCard.tsx` | Add tooltips to heading and 4 stat labels (P2), replace `null` return with empty state card (P3) |
| `src/components/analytics/TradingBehaviorAnalytics.tsx` | Replace `null` return with empty state card (P3) |
| `src/components/analytics/charts/DrawdownChart.tsx` | Add tooltips to title and Max Drawdown label (P2) |
| `src/components/analytics/charts/TradingHeatmapChart.tsx` | Add tooltips to title, tab triggers, color legend (P2) |
| `src/components/analytics/session/SessionPerformanceChart.tsx` | Add tooltip to "Time (Local)" row (P2) |
| `src/components/analytics/contextual/EventDayComparison.tsx` | Remove hardcoded `$` prefix (P1), add tooltips to column headers (P2) |
| `src/components/analytics/contextual/FearGreedZoneChart.tsx` | Replace static `formatCurrency` with `useCurrencyConversion` (P1) |
| `src/components/analytics/contextual/VolatilityLevelChart.tsx` | Replace static `formatCurrency` with `useCurrencyConversion` (P1) |
| `src/components/analytics/contextual/CombinedContextualScore.tsx` | Fix PnL fallback chain (P1), add tooltips to title and zone labels (P2) |

