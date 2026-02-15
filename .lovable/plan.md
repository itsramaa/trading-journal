
# Dashboard Data Consistency & Clarity Fix

## Problem Summary
The dashboard has 10 critical data inconsistency and UX clarity issues that undermine trust in a financial application. These range from mismatched numbers across widgets to ambiguous metric labels.

---

## Issue-by-Issue Fix Plan

### 1. Portfolio Overview vs AI Insights — $47.85 vs $47,846

**Root Cause:** The AI Insights edge function receives `portfolio.totalCapital` as raw number (e.g., `47.85`) and feeds it to the AI model as `$${totalBalance.toLocaleString()}`. The AI model then freely interprets/reformats this number in its natural language summary — it might hallucinate "47,846" from "47.85".

**Fix:**
- In the edge function (`supabase/functions/dashboard-insights/index.ts`), add an explicit instruction in the system prompt: *"Use exact numbers as provided. Do not round, estimate, or change any financial figures."*
- Add the balance to the structured function output so the summary doesn't need to include raw numbers — move financial data to the structured `report_dashboard_insights` schema instead of relying on free-text summary.
- In `AIInsightsWidget.tsx`, prepend a small "Portfolio: $X" label above the AI summary using the same `portfolio.totalCapital` value from the hook, so users see the authoritative number.

---

### 2. Today's Net P&L — Three Different Numbers

**Root Cause:** Three different data sources:
- **PortfolioOverviewCard**: Uses `useUnifiedPortfolioData().todayNetPnl` (realized only from closed trades today)
- **SystemStatusIndicator**: Uses `useTradingGate().currentPnl` which comes from `useUnifiedDailyPnl().totalPnl`
- **Active Position P&L**: Unrealized P&L from Binance live positions

**Fix:**
- Rename label in PortfolioOverviewCard from "Today's Net P&L" to **"Today's Realized P&L"**
- Rename label in SystemStatusIndicator from "Today's P&L" to **"Today's Realized P&L"**
- Add a new row or sub-label in PortfolioOverviewCard: **"Unrealized P&L"** showing the sum of active position floating P&L when Binance is connected
- Add InfoTooltip to each explaining: "Realized P&L counts only closed trades. Unrealized P&L is from open positions."

---

### 3. Max Drawdown >100% — Three Conflicting Values

**Root Cause:** The Equity Curve chart uses `initialBalance = 0` by default (line 28). When initial balance is 0, the formula `(peak - current) / peak * 100` can produce huge percentages because peak starts at 0 and grows from PnL alone — creating a denominator problem. Meanwhile, `advanced-risk-metrics.ts` uses `portfolio.totalCapital || 10000` as initial capital.

**Fix:**
- In `EquityCurveChart.tsx`: Pass `portfolio.totalCapital` as `initialBalance` from the Dashboard page instead of defaulting to 0. Add a guard: if `initialBalance` is 0 or very small, use the first equity value from the curve as the baseline.
- Cap `maxDrawdownPercent` at 100% in both the Equity Curve and `advanced-risk-metrics.ts` to prevent mathematically impossible display values.
- In the Equity Curve summary stats, label the absolute drawdown as **"Max DD (Absolute)"** and the percentage as **"Max DD (%)"** to distinguish them.
- In `RiskMetricsCards.tsx`, add a subtitle label: **"All-Time"** next to the Max Drawdown value to clarify scope.
- In `Dashboard.tsx`, pass `initialBalance={portfolio.totalCapital}` to `EquityCurveChart`.

---

### 4. Win Rate Inconsistency (0% vs 10%)

**Root Cause:** `DashboardAnalyticsSummary` calculates win rate from the last 30 days of closed trades. AI Insights calculates win rate from the last 20 trades (regardless of timeframe). Different timeframes = different numbers.

**Fix:**
- In `DashboardAnalyticsSummary.tsx`: Change label from "Win Rate" to **"30D Win Rate"**
- In `AIInsightsWidget.tsx` / edge function prompt: Explicitly label as **"Last 20 Trades Win Rate"** in the prompt context so the AI uses that framing
- Add a small `(30D)` badge or subtitle next to Win Rate in the analytics summary
- Add `(Last 20 trades)` context in the AI summary prompt

---

### 5. Market Score 51 = Neutral but AI says "Bearish"

**Root Cause:** The `getScoreLabel` function in `use-unified-market-score.ts` correctly maps 45-55 as "Neutral". But the AI Insights widget shows `scoreLabel` from the market score AND the AI model's independently generated `overallSentiment`. The AI model might say "bearish" based on the trading data (10% win rate, losing streak), not the market score.

**Fix:**
- In `AIInsightsWidget.tsx`: The badge showing `{scoreLabel} | {score}` is from Market Score. The AI sentiment badge is separate. Add label clarity:
  - Market badge: **"Market: {scoreLabel} | {score}"**
  - AI sentiment: **"Portfolio Sentiment: {sentiment}"**
- This makes clear that "Neutral" refers to market conditions while "bearish/cautious" refers to the AI's assessment of the user's trading performance.

---

### 6. "ALL SYSTEMS NORMAL" vs Poor Performance

**Root Cause:** `SystemStatusIndicator` only checks daily loss limit usage (`lossUsedPercent`). It does not consider win rate, streak, or drawdown. So it shows green even during terrible performance as long as today's losses haven't hit the limit.

**Fix:**
- Rename the indicator from "ALL SYSTEMS NORMAL / You are clear to trade" to more specific language:
  - Status "ok": **"RISK LIMITS OK"** with description **"Daily loss limit within bounds"**
- Add a separate **Performance Health** indicator below or as a sub-badge:
  - If recent win rate < 30% OR loss streak > 10 OR drawdown > 30%: Show a yellow **"Performance Advisory"** badge with text like "Review recent performance before trading"
  - This keeps system health (risk limits) separate from performance health (behavioral metrics)
- Add an InfoTooltip: "This indicator monitors your daily loss limit only. Check AI Insights for performance analysis."

---

### 7. ADL Risk — No Guidance

**Fix:**
- Expand the existing `InfoTooltip` content on ADL Risk widget to include actionable guidance
- Add per-risk-level descriptions in the `riskLevelConfig`:
  - **Low (1-2):** "Your position is safe. No action needed."
  - **Medium (3):** "Monitor your position. Consider reducing size if market volatility increases."
  - **High (4):** "Your position may be auto-deleveraged. Reduce position size or add margin to lower risk."
  - **Critical (5):** "Immediate action recommended. Your position is at the front of the ADL queue. Reduce position now."
- Show these descriptions as a collapsible "What does this mean?" section below each position row.

---

### 8. Equity Curve — Cognitive Overload

**Fix:**
- Default `showAnnotations` to `false` instead of `true` (line 31 in EquityCurveChart.tsx)
- Simplify the summary stats row: Keep only **Balance**, **Max DD (%)**, and **Total P&L** (3 metrics, remove absolute drawdown)
- The annotations (streaks, ATH, break-even) remain available via the "AI Annotations" toggle button for users who want deeper analysis

---

### 9. Monthly Goals — Max Drawdown Shows 0%

**Root Cause:** The goal widget correctly calculates monthly drawdown from that month's trades only. If the month has few trades or all are early losses with no recovery, the peak-to-trough within the month may be 0 because `peak` starts at 0 and never goes positive.

**Fix:**
- Rename label from "Max Drawdown" to **"Monthly Max DD"**
- Add InfoTooltip: "Maximum drawdown calculated from this month's closed trades only, not all-time."
- Fix the calculation: when all monthly trades are losses, `peak` stays at 0 and the formula `(peak - balance) / peak * 100` divides by zero. Add guard: if `peak <= 0`, use absolute loss as percentage of account balance instead.

---

### 10. AI Trade Opportunities — No Sample Size Context

**Root Cause:** `calculatePairStats` in AIInsightsWidget requires only 3 trades minimum (`totalTrades >= 3`). A 67% win rate from 3 trades is statistically meaningless.

**Fix:**
- Increase minimum threshold from 3 to **5 trades** for "Focus" pairs
- Display sample size next to each pair badge: `{pair} ({winRate}% / {totalTrades} trades)`
- Add a "Low sample" warning badge when totalTrades < 10
- Change the label from "Focus on (High Win Rate)" to **"Focus on (Historical Win Rate, min 5 trades)"**

---

## Technical Changes Summary

| File | Changes |
|------|---------|
| `src/components/dashboard/PortfolioOverviewCard.tsx` | Rename "Today's Net P&L" to "Today's Realized P&L", add Unrealized P&L row |
| `src/components/dashboard/SystemStatusIndicator.tsx` | Rename to "RISK LIMITS OK", add performance health sub-indicator, rename "Today's P&L" |
| `src/components/dashboard/AIInsightsWidget.tsx` | Add "Market:" prefix to badge, clarify sentiment labels, increase pair threshold to 5, add sample sizes |
| `src/components/dashboard/DashboardAnalyticsSummary.tsx` | Rename "Win Rate" to "30D Win Rate" |
| `src/components/dashboard/RiskMetricsCards.tsx` | Add "All-Time" label to Max Drawdown |
| `src/components/analytics/charts/EquityCurveChart.tsx` | Fix initialBalance=0 bug, cap DD at 100%, default annotations off, simplify stats |
| `src/components/dashboard/ADLRiskWidget.tsx` | Add actionable guidance text per risk level |
| `src/components/dashboard/GoalTrackingWidget.tsx` | Rename to "Monthly Max DD", fix zero-peak division, add tooltip |
| `src/pages/Dashboard.tsx` | Pass `portfolio.totalCapital` as initialBalance to EquityCurveChart |
| `supabase/functions/dashboard-insights/index.ts` | Add "use exact numbers" instruction to prompt, add source context |
| `src/hooks/analytics/use-unified-market-score.ts` | No changes needed (logic is correct) |
| `src/lib/advanced-risk-metrics.ts` | Cap maxDrawdownPercent at 100 |

---

## Priority Order
1. Fix #3 (Max Drawdown >100%) — mathematical correctness, most visible bug
2. Fix #1 (Portfolio mismatch) — trust breaker
3. Fix #2 (Three P&L numbers) — label clarity
4. Fix #6 (System status vs performance) — conflicting messaging
5. Fix #4 (Win rate timeframes) — label clarity
6. Fix #5 (Market vs AI sentiment) — framing
7. Fix #10 (Sample size) — statistical rigor
8. Fix #9 (Monthly DD) — calculation bug
9. Fix #7 (ADL guidance) — UX improvement
10. Fix #8 (Equity curve simplification) — cognitive load
