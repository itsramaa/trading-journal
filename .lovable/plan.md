

# Deep-Dive Analysis: Backtest Page

---

## Scope: Files Analyzed

| File | Role |
|------|------|
| `src/pages/Backtest.tsx` | Page orchestrator |
| `src/components/strategy/BacktestRunner.tsx` | Configuration form (601 lines) |
| `src/components/strategy/BacktestResults.tsx` | Results display (488 lines) |
| `src/components/strategy/BacktestComparison.tsx` | Side-by-side comparison (401 lines) |
| `src/components/strategy/BacktestSessionBreakdown.tsx` | Session analytics (381 lines) |
| `src/components/strategy/BacktestDisclaimer.tsx` | Simulation caveats (168 lines) |
| `src/hooks/use-backtest.ts` | Run/History/Delete hooks |
| `src/hooks/use-backtest-export.ts` | CSV/PDF export |
| `src/types/backtest.ts` | Types + `calculateMetrics()` |
| `src/lib/constants/backtest-config.ts` | Centralized defaults |

---

## 1. Page Orchestrator (`src/pages/Backtest.tsx`)

### A. Comprehensiveness

| Feature | Status |
|---------|--------|
| PageHeader with icon/description | Done |
| "Basic Mode" badge | Done |
| URL-driven tabs via `useSearchParams` | Done |
| Tab: Run Backtest (BacktestRunner) | Done |
| Tab: Compare Results (BacktestComparison) | Done |
| ErrorBoundary wrapper | **Missing** |
| `role="region"` + `aria-label` | **Missing** |

**Gaps:**

1. **No `role="region"` on root container** -- inconsistent with the ARIA standard applied to 11+ other pages (Performance, Risk, Daily P&L, Heatmap, AI Insights).

2. **No ErrorBoundary wrapper** -- every other analytics page has a top-level `ErrorBoundary` with `retryKey`. This page has none.

3. **No tooltip on "Basic Mode" badge** -- Should say: "Single-strategy backtesting for trading journal analysis. Walk-forward optimization is not included."

4. **No tooltips on tab titles** ("Run Backtest", "Compare Results") -- Should say:
   - Run Backtest: "Configure and run a backtest against simulated historical data for a selected strategy."
   - Compare Results: "Compare 2-4 backtest results side-by-side with overlaid equity curves."

---

## 2. BacktestRunner (`BacktestRunner.tsx`)

### A. Comprehensiveness -- Complete

Strategy selection with context badges, trading pair selector, date range pickers, initial capital with quick-fill buttons (Binance + accounts), risk per trade, compounding toggle, commission rate, slippage, leverage slider (futures only), leverage >10x warning, advanced filters (event/session/volatility), strategy config preview, run button with loading state, results display.

### B. Accuracy -- Correct

Config construction, commission/slippage conversion (% to decimal), leverage gating by market type, session auto-populate from strategy, filter state management all verified.

### C. Clarity -- Missing Tooltips

5. **"Backtest Configuration" card title** -- No tooltip. Should say: "Configure simulation parameters. Results are based on simplified modeling and may differ from real trading."

6. **"Select Strategy" label** -- No tooltip. Should say: "Choose a strategy to test. The strategy's entry/exit rules, timeframe, and position sizing will be used."

7. **"Trading Pair" label** -- No tooltip. Should say: "The asset to simulate trading on. Prices are sourced from historical OHLCV data."

8. **"Initial Capital" label** -- No tooltip. Should say: "Starting balance for the simulation. Use quick-fill buttons to match your actual account balance."

9. **"Risk Per Trade" label** -- No tooltip. Should say: "Percentage of capital risked per trade. Used to calculate position size based on stop-loss distance."

10. **"Compounding" toggle** -- No tooltip. Should say: "When enabled, position size recalculates from running equity after each trade. When disabled, always uses initial capital."

11. **"Commission Rate" label** -- No tooltip. Should say: "Trading fee applied per trade (entry + exit). Binance Futures: 0.02% maker, 0.04% taker."

12. **"Slippage" label** -- No tooltip. Should say: "Estimated price deviation between expected and actual fill price. Typically 0.05-0.2% for major pairs."

13. **"Leverage" label** -- No tooltip. Should say: "Leverage only affects margin requirements (position size constraint). It does not multiply risk per trade."

14. **"Economic Event Filter" section** -- No tooltip. Should say: "Exclude trades near high-impact news events (FOMC, CPI, NFP). Buffer hours define the exclusion window."

15. **"Trading Session Filter" section** -- No tooltip. Should say: "Restrict backtest to trades during specific market sessions. Useful for session-specific strategies."

16. **"Volatility Filter" section** -- No tooltip. Should say: "Filter trades by market volatility at entry, based on ATR percentile classification."

---

## 3. BacktestResults (`BacktestResults.tsx`)

### A. Comprehensiveness

| Feature | Status |
|---------|--------|
| Disclaimer (collapsible) | Done |
| Break-even insight banner (above/below) | Done |
| Summary card with strategy name + return badge | Done |
| Export buttons (CSV + PDF) | Done |
| 4 metric cards (Return, Win Rate, Max DD, Expectancy) | Done |
| Detailed metrics grid (3 columns, 15+ metrics) | Done |
| Fee Impact breakdown (Gross/Fees/Net) | Done |
| Equity curve chart (balance + drawdown) | Done |
| Session breakdown tab | Done |
| Trade list tab with direction/P&L/exit type | Done |
| CAGR calculation | Done |
| Trade density (per week) | Done |
| `role="region"` + `aria-label` | **Missing** |

### B. Accuracy

17. **Trade list P&L uses `formatPercent(trade.pnl)`** (line 467): `trade.pnl` is a currency amount (e.g., 150.25), not a percentage. Using `formatPercent()` will display it incorrectly (e.g., "150.25%" instead of "$150.25"). Should use `format(trade.pnl)` from the currency conversion hook.

18. **Calmar Ratio uses non-annualized return** (line 476 in `calculateMetrics`): The formula is `(totalPnl / initialCapital * 100) / (maxDD * 100)` which is the raw return divided by max drawdown. The standard Calmar Ratio uses annualized return / max drawdown. For periods shorter than 1 year, this overstates the ratio; for periods longer, it understates it.

   **Fix**: Use `CAGR / maxDrawdown` instead of `totalReturn / maxDrawdown`.

### C. Clarity -- Missing Tooltips

19. **"Total Return" metric card** -- No tooltip. Should say: "Net profit/loss as a percentage of initial capital, after all fees."

20. **"Win Rate" metric card** -- No tooltip. Should say: "Percentage of trades that closed in profit. Combined with R:R ratio to determine edge."

21. **"Max Drawdown" metric card** -- No tooltip. Should say: "Largest peak-to-trough decline in portfolio value during the backtest period."

22. **"Expectancy" metric card** -- No tooltip. Should say: "Average expected profit per trade. Formula: (Win Rate x Avg Win) - (Loss Rate x Avg Loss)."

23. **"Trade Density"** -- No tooltip. Should say: "Average number of trades per week during the backtest period."

24. **"Profit Factor"** -- No tooltip. Should say: "Gross Profit / Gross Loss. Values above 1.5 indicate a robust edge."

25. **"Sharpe Ratio"** -- No tooltip. Should say: "Risk-adjusted return. Annualized using sqrt(252). Values above 1.0 are good, above 2.0 are excellent."

26. **"Calmar Ratio"** -- No tooltip. Should say: "Annualized return divided by maximum drawdown. Higher = better risk-adjusted performance."

27. **"Expectancy/R"** -- No tooltip. Should say: "Expected return per unit of risk (R). Positive values indicate an edge."

28. **"Market Exposure"** -- No tooltip. Should say: "Percentage of total backtest period spent in an open position."

29. **"Break-even WR"** -- No tooltip. Should say: "Minimum win rate needed to break even at the observed R:R ratio. Formula: 1 / (1 + R:R)."

30. **"Gross P&L" / "Fees Paid" / "Net P&L" section** -- No tooltip on the section heading. Should say: "Fee impact analysis showing how trading costs affect your edge."

31. **"Equity Curve" chart title** -- No tooltip. Should say: "Portfolio balance over time (left axis) with drawdown percentage (right axis, shaded red)."

32. **"Sessions" tab** -- No tooltip. Should say: "Performance breakdown by trading session (Sydney, Tokyo, London, New York)."

33. **"Trade List" tab** -- No tooltip. Should say: "Chronological list of all simulated trades with entry/exit details."

### D. Code Quality

34. **No `role="region"` on results root** -- Should add `role="region" aria-label="Backtest Results"` to the root `div`.

---

## 4. BacktestComparison (`BacktestComparison.tsx`)

### A. Comprehensiveness -- Complete

Selection panel with checkboxes (max 4), strategy legend, metrics comparison table with trophy winners, equity curves overlay chart, performance summary cards.

### B. Accuracy

35. **Equity curve `find()` lookup** (line 104): For each timestamp, each strategy does a linear `.find()` scan of its equity curve. With N timestamps and M strategies, this is O(N * M * K) where K is curve length. Should use a Map or index lookup.

36. **Hardcoded `$` in comparison chart Y-axis** (lines 313-314): `$${(v / 1000).toFixed(1)}k` and `$${v.toFixed(0)}` bypass the user's currency preference. Should use the `formatCompact` function from `useCurrencyConversion`.

37. **Hardcoded `$` in comparison chart tooltip** (line 323): `$${value.toFixed(2)}` should use the currency format function.

### C. Clarity -- Missing Tooltips

38. **"Compare Backtest Results" card title** -- No tooltip. Should say: "Select 2-4 backtest results to compare performance metrics and equity curves side-by-side."

39. **"Metrics Comparison" table title** -- No tooltip. Should say: "Side-by-side metric comparison. Trophy icon indicates the best-performing strategy for each metric."

40. **"Equity Curves Comparison" chart title** -- No tooltip. Should say: "Overlaid portfolio balance curves to visually compare strategy performance over time."

41. **"Performance Summary" card title** -- No tooltip. Should say: "Best strategy for each key metric: Return, Win Rate, Sharpe Ratio, and Max Drawdown."

### D. Code Quality

42. **Missing `font-mono-numbers`** on performance summary values (line 381): The winner value display lacks tabular number formatting.

---

## 5. BacktestExport (`use-backtest-export.ts`)

### B. Accuracy

43. **Hardcoded `$` throughout CSV export** (lines 22, 23, 29, 34-35, 39-40, 44): All currency values use `$` prefix (e.g., `$${result.initialCapital.toFixed(2)}`). This bypasses the user's currency preference. Should remove `$` prefix and use raw numbers, or accept a currency symbol parameter.

44. **Hardcoded `$` throughout PDF export** (lines 95-96, 113-114, 133-134): Same issue as CSV. All `$` prefixes should be removed or dynamically resolved.

45. **Price formatting uses `.toFixed(2)`** (lines 56-57 in CSV, 133 in PDF): For low-cap assets (e.g., PEPEUSDT), entry/exit prices may need dynamic precision (4+ decimals) per the financial precision standard.

---

## 6. BacktestSessionBreakdown (`BacktestSessionBreakdown.tsx`)

### A. Comprehensiveness -- Complete (already analyzed and improved in prior session)

Summary cards (Best/Most Active/Highest WR), P&L bar chart, trade distribution pie chart, detailed stats per session with progress bars. ARIA and tooltips were not part of prior analysis scope.

### C. Clarity -- Missing Tooltips

46. **"P&L by Session" chart title** -- No tooltip. Should say: "Total profit/loss for each trading session. Green = profit, Red = loss."

47. **"Trade Distribution" chart title** -- No tooltip. Should say: "Percentage of total trades executed during each session."

48. **"Session Performance Details" card title** -- No tooltip. Should say: "Detailed win/loss statistics, average P&L, and profit factor for each trading session."

49. **"Profit Factor" in session details** -- No tooltip. Should say: "Gross Profit / Gross Loss for trades in this session. Infinity (inf) means no losing trades."

---

## 7. `calculateMetrics()` in `types/backtest.ts`

### B. Accuracy

50. **Calmar Ratio uses raw return instead of annualized** (line 476): As noted in #18, the formula `(totalReturn) / (maxDD)` is not annualized. This is the authoritative calculation function used by the edge function results. Fix here to fix everywhere.

   **Fix**: Add period parameters to calculate CAGR internally, then use `cagr / (maxDD * 100)`.

---

## 8. Backtest Config Constants (`backtest-config.ts`)

### B. Accuracy

51. **`METRICS_CONFIG` uses hardcoded `$` in format functions** (lines 130, 133-134): The `Expectancy`, `Avg Win`, and `Avg Loss` formatters use `$${v.toFixed(2)}` and `-$${v.toFixed(2)}`. These should use a neutral format or accept a currency formatter parameter.

---

## 9. Summary of All Recommendations

### Priority 1 -- Accuracy / Logic

| # | Issue | File | Fix |
|---|-------|------|-----|
| 17 | Trade P&L uses `formatPercent()` on currency amount | BacktestResults.tsx | Change to `format(trade.pnl)` |
| 18/50 | Calmar Ratio uses raw return, not annualized | types/backtest.ts | Use CAGR / maxDD |
| 35 | Equity curve overlay uses O(N*M*K) `.find()` | BacktestComparison.tsx | Use Map lookup |
| 36-37 | Hardcoded `$` in comparison chart | BacktestComparison.tsx | Use `useCurrencyConversion` |
| 43-44 | Hardcoded `$` in CSV/PDF export | use-backtest-export.ts | Remove `$` or use dynamic symbol |
| 45 | Price `.toFixed(2)` insufficient for low-cap | use-backtest-export.ts | Use `.toFixed(4)` min |
| 51 | Hardcoded `$` in METRICS_CONFIG formatters | backtest-config.ts | Remove `$` prefix |

### Priority 2 -- Missing Tooltips (Clarity)

| # | Elements | File |
|---|----------|------|
| 3-4 | "Basic Mode" badge, tab titles | Backtest.tsx |
| 5-16 | All configuration labels and filter sections | BacktestRunner.tsx |
| 19-33 | All metric cards, detailed metrics, chart/tab titles | BacktestResults.tsx |
| 38-41 | Comparison card/chart/summary titles | BacktestComparison.tsx |
| 46-49 | Session chart/detail titles, profit factor | BacktestSessionBreakdown.tsx |

### Priority 3 -- Code Quality and Accessibility

| # | Issue | Fix |
|---|-------|-----|
| 1 | Missing `role="region"` on page root | Backtest.tsx |
| 2 | No ErrorBoundary wrapper | Backtest.tsx |
| 34 | Missing `role="region"` on results root | BacktestResults.tsx |
| 42 | Missing `font-mono-numbers` on summary values | BacktestComparison.tsx |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Backtest.tsx` | Add `role="region"` and `aria-label` (#1), wrap with ErrorBoundary (#2), add tooltip to "Basic Mode" badge (#3) and tab titles (#4) |
| `src/components/strategy/BacktestRunner.tsx` | Add tooltips to all 12 config labels and filter sections (#5-16) |
| `src/components/strategy/BacktestResults.tsx` | Fix trade P&L display from `formatPercent` to `format` (#17), add `role="region"` (#34), add tooltips to all metric cards, detailed metrics, and tab titles (#19-33) |
| `src/components/strategy/BacktestComparison.tsx` | Optimize equity curve lookup to Map (#35), replace hardcoded `$` with currency hook (#36-37), add tooltips to card/chart titles (#38-41), add `font-mono-numbers` (#42) |
| `src/components/strategy/BacktestSessionBreakdown.tsx` | Add tooltips to chart and detail card titles (#46-49) |
| `src/hooks/use-backtest-export.ts` | Remove hardcoded `$` from CSV (#43) and PDF (#44), use `.toFixed(4)` for prices (#45) |
| `src/lib/constants/backtest-config.ts` | Remove hardcoded `$` from METRICS_CONFIG format functions (#51) |
| `src/types/backtest.ts` | Fix Calmar Ratio in `calculateMetrics()` to use annualized return (#50) |

