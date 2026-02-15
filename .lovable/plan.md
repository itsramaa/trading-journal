
# Dashboard Data Consistency - Phase 2 Hardening

## Overview
Address the follow-up critique on the previous fixes. These are precision improvements to prevent edge cases, clarify scopes, and add a data scope legend to the dashboard.

---

## Fix 1: AI Cannot Be Source of Truth for Financial Numbers

**Problem:** Even with prompt instructions, LLMs can still reformat numbers.

**Changes:**
- **`supabase/functions/dashboard-insights/index.ts`**: Remove all raw financial numbers from the `userPrompt` text. Instead, pass them as structured metadata that the AI references abstractly. Change `$${portfolioStatus.totalBalance.toLocaleString()}` to just contextual phrasing like "The trader has a small account under $100" or remove the exact number entirely. The summary instruction becomes: "Do NOT mention any specific dollar amounts in your summary. Refer to 'your balance' or 'your account' instead. Financial numbers are already displayed in the dashboard UI."
- **`src/components/dashboard/AIInsightsWidget.tsx`**: Already shows `Portfolio Sentiment` badge. No further changes needed — the structured function output (`overallSentiment`, `recommendations`, `riskAlerts`) is the source of truth, not the free-text `summary`.

---

## Fix 2: Unrealized P&L — Not Just Binance

**Problem:** Unrealized P&L should show for any open position, not only when Binance is connected.

**Changes:**
- **`src/components/dashboard/PortfolioOverviewCard.tsx`**: Add an "Unrealized P&L" sub-row below "Today's Realized P&L". Calculate it from:
  - If Binance connected: sum of `positions.unrealizedPnl`
  - If paper/manual: sum of open trade entries' estimated P&L (if available)
  - Show only when there are open positions (any source), not conditional on Binance
- Import `usePositions` hook and check `activePositions.length > 0` regardless of mode.

---

## Fix 3: Max Drawdown — Fix Root Cause, Cap as Safety Net

**Problem:** Cap at 100% can hide bugs. Need to fix the denominator properly first.

**Changes:**
- **`src/lib/advanced-risk-metrics.ts`**:
  - Line 233-234: The drawdown uses `(dd / peak) * 100`. When `initialCapital` is very small and PnL drives `peak` up from near-zero, this is mathematically correct. The cap at 100% on line 313 is already the safety net.
  - Add cap to `currentDrawdownPercent` too (line 315): `Math.min(currentDDPercent, 100)`
- **`src/components/analytics/charts/EquityCurveChart.tsx`**:
  - Line 54: The denominator logic `effectiveInitial > 0 ? (effectiveInitial + peak - effectiveInitial) : peak` simplifies to just `peak` in both cases when `effectiveInitial > 0` (since `effectiveInitial + peak - effectiveInitial = peak`). This is a no-op bug. Fix to: `const denominator = effectiveInitial + peak - effectiveInitial` which equals `peak`. But the REAL fix is: use `initialBalance + peakCumulativePnl` as denominator per the standardized formula from memory. Change to: `const peakCumPnl = peak - effectiveInitial; const denominator = effectiveInitial + peakCumPnl;` which equals `peak` — confirming the formula is correct. The issue is when `effectiveInitial = 0`, denominator becomes `peak` which can be very small early on. Guard: if `effectiveInitial <= 0`, set `effectiveInitial` to the absolute value of the first balance point to establish a reasonable baseline.

---

## Fix 4: Win Rate Definition Consistency

**Problem:** Need to ensure `win = pnl > 0` consistently, with breakeven excluded.

**Changes:**
- **`src/components/dashboard/DashboardAnalyticsSummary.tsx`**: Already uses `getPnl(t) > 0` (line 49). Correct.
- **`src/components/dashboard/AIInsightsWidget.tsx`**: `calculatePairStats` uses `trade.result === 'win'` (line 57). This relies on the `result` field which may define win differently. Align: change to also check `(trade.realized_pnl ?? trade.pnl ?? 0) > 0` instead of relying on the string `result` field.
- **`supabase/functions/dashboard-insights/index.ts`**: Uses `t.result === 'win'` (line 106). Align: also compute wins from `pnl > 0` to match.
- **`src/components/dashboard/GoalTrackingWidget.tsx`**: Already uses `(t.realized_pnl ?? t.pnl ?? 0) > 0` (line 65). Correct.

---

## Fix 5: Market Score Label in AI Prompt

**Problem:** AI might say "market bearish" in summary despite market score being neutral.

**Changes:**
- **`supabase/functions/dashboard-insights/index.ts`**: Add `marketScoreLabel` to the request body from the client, and include in the prompt: `"Current market regime is: {marketScoreLabel}. Do not contradict this assessment in your summary."`
- **`src/features/ai/useDashboardInsights.ts`** (or wherever `getInsights` is called): Pass `scoreLabel` from `useUnifiedMarketScore` into the payload.

---

## Fix 6: Performance Advisory Scope

**Problem:** Need to define scope for the performance advisory triggers (all-time vs 30D vs last 20).

**Changes:**
- **`src/components/dashboard/SystemStatusIndicator.tsx`**: The performance advisory will use **last 20 trades** as scope (same as AI insights, most actionable timeframe):
  - Import `useModeFilteredTrades`
  - Calculate: `recentWinRate` from last 20 closed trades, `currentLossStreak` from most recent consecutive losses, `recentDrawdown` from last 20 trades' cumulative PnL
  - Show advisory only if: `recentWinRate < 30% AND totalRecentTrades >= 10` (need minimum sample)
  - Add label: "Based on last 20 trades" in the tooltip

---

## Fix 7: ADL Risk Level Mapping Clarification

**Problem:** ADL quantile 3/5 might not map to "medium" in Binance's actual system.

**Changes:**
- **`src/components/dashboard/ADLRiskWidget.tsx`**: Add a note in the InfoTooltip explaining the mapping: "ADL quantile is ranked 1-5 based on your position's profit and margin ratio relative to other traders. 1 = lowest priority for ADL, 5 = highest. This is a relative ranking, not absolute risk."
- Update the `InfoTooltip` content on line 221 to include this explanation.

---

## Fix 8: Monthly Goals — Use Account Balance as Baseline

**Problem:** When all monthly trades are losses, the DD calculation baseline is ambiguous.

**Changes:**
- **`src/components/dashboard/GoalTrackingWidget.tsx`**: Import `useUnifiedPortfolioData` to get `portfolio.totalCapital`. Use it as the denominator for monthly DD percentage when `peak <= 0`:
  ```
  if (peak <= 0 && portfolio.totalCapital > 0) {
    maxDd = (Math.abs(balance) / portfolio.totalCapital) * 100;
  }
  ```
  - Add InfoTooltip next to "Monthly Max DD" label: "Drawdown from this month's trades only. Calculated as percentage of your total account balance."

---

## Fix 9: Dashboard Data Scope Legend

**Problem:** User has no visibility into which timeframe each widget uses.

**Changes:**
- **`src/pages/Dashboard.tsx`**: Add a collapsible "Data Scope" info bar below the page header. Collapsed by default, expandable via a small "i" icon button. Contents:
  ```
  Data Scope Reference:
  - Portfolio Overview: Real-time balances
  - Performance Card: Last 30 days (closed trades)
  - AI Insights: Last 20 trades (all-time)
  - Goals: Current month
  - Risk Metrics: All-time
  - Equity Curve: All-time
  ```
  - Use a `Collapsible` component from radix with a subtle design.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/dashboard-insights/index.ts` | Remove raw $ amounts from prompt, add "do not mention dollar amounts" rule, add market label context |
| `src/components/dashboard/PortfolioOverviewCard.tsx` | Add unrealized P&L row for any open positions |
| `src/lib/advanced-risk-metrics.ts` | Cap `currentDrawdownPercent` at 100% |
| `src/components/analytics/charts/EquityCurveChart.tsx` | Fix zero-baseline edge case |
| `src/components/dashboard/AIInsightsWidget.tsx` | Align win definition to `pnl > 0` instead of `result === 'win'` |
| `src/components/dashboard/SystemStatusIndicator.tsx` | Add performance advisory with last-20-trades scope |
| `src/components/dashboard/ADLRiskWidget.tsx` | Clarify ADL mapping in tooltip |
| `src/components/dashboard/GoalTrackingWidget.tsx` | Use portfolio.totalCapital as DD baseline, add tooltip |
| `src/pages/Dashboard.tsx` | Add collapsible data scope legend |
| `src/features/ai/useDashboardInsights.ts` | Pass marketScoreLabel to edge function |

## Priority
1. Fix 1 (AI numbers) + Fix 4 (win rate consistency) — data integrity
2. Fix 3 (drawdown root cause) — mathematical correctness
3. Fix 6 (performance advisory scope) — conflicting messaging
4. Fix 2 (unrealized P&L any source) — completeness
5. Fix 5 (market label in prompt) — framing
6. Fix 9 (data scope legend) — transparency
7. Fix 7+8 (ADL + Goals) — UX polish
