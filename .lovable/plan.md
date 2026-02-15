

# AI Insights Statistical Integrity & Variance Awareness Upgrade

Systematic fixes to eliminate overconfident claims, add sample size context, introduce expectancy-aware logic, and remove misleading streak framing.

---

## Overview

The AI Insights page currently generates template-like recommendations without statistical rigor. This plan addresses 8 specific issues across Pattern Analysis, Session Insights, Predictions, and Action Items.

---

## 1. Win Rate Insight: Add R:R Context

**File:** `src/pages/AIInsights.tsx` (lines 192-209)

Currently says "Win Rate Needs Improvement" without considering R:R. A 26% win rate with 3:1 R:R is profitable.

Calculate breakeven win rate from avgWin/avgLoss, then compare:

```typescript
const breakevenWR = stats.avgLoss > 0 
  ? (stats.avgLoss / (stats.avgWin + stats.avgLoss)) * 100 
  : 50;

// If winRate < breakevenWR -> truly underperforming
// If winRate >= breakevenWR -> profitable despite low raw %
```

Change description from generic "focus on refining entry criteria" to:

- If below breakeven: `"At X%, your win rate is below your breakeven threshold of Y% (based on your R:R profile)."`
- If above breakeven but below 45%: `"Your X% win rate is sustained by a strong R:R ratio. Maintain your current risk-reward discipline."`

---

## 2. Profit Factor Insight: Diagnose Root Cause

**File:** `src/pages/AIInsights.tsx` (lines 220-228)

Currently gives generic "hold winners longer or tighten stop losses." Diagnose whether the problem is win size or frequency:

```typescript
if (stats.profitFactor < PERFORMANCE_THRESHOLDS.PROFIT_FACTOR_POOR) {
  const isWinSizeProblem = stats.avgWin < stats.avgLoss;
  const description = isWinSizeProblem
    ? `Avg win (${formatPnl(stats.avgWin)}) is smaller than avg loss (${formatPnl(stats.avgLoss)}). Focus on holding winners longer or tightening stops.`
    : `Win frequency is the issue -- your avg win exceeds avg loss but you're not winning often enough. Review entry quality.`;
}
```

---

## 3. Losing Streak: Remove Emotional Assumption

**File:** `src/pages/AIInsights.tsx` (lines 240-248)

Current text: "Consider taking a break to reset mentally" implies tilting without evidence.

Change to statistical framing:

```typescript
description: `Statistically rare streak. Review recent trade quality and setup adherence rather than assuming tilt.`,
```

Also in Action Items (line 329): change "Losing streak may indicate tilting or market misread" to "Review whether recent setups met your strategy criteria."

---

## 4. Best Time Slot & Best Pair: Show Sample Size + Confidence Badge

**File:** `src/pages/AIInsights.tsx` (lines 252-282)

Add sample size to all insights. Update the `PerformanceInsight` interface to include optional `sampleSize` and `confidence` fields:

```typescript
interface PerformanceInsight {
  type: 'positive' | 'negative' | 'neutral';
  title: string;
  description: string;
  metric?: string;
  icon: typeof TrendingUp;
  sampleSize?: number;
  confidence?: 'low' | 'medium' | 'high';
}
```

For best time slot:
```typescript
description: `${slot.day} ${slot.hour}:00 — ${slot.winRate.toFixed(0)}% win rate.`,
sampleSize: slot.trades,
confidence: slot.trades >= 30 ? 'high' : slot.trades >= 15 ? 'medium' : 'low',
```

For best/worst pair:
```typescript
description: `...${pair.trades} trades, ${pair.winRate.toFixed(0)}% win rate.`,
sampleSize: pair.trades,
confidence: pair.trades >= 20 ? 'high' : pair.trades >= 10 ? 'medium' : 'low',
```

Render confidence badge next to the metric badge in the insight card UI. If confidence is `low`, append "(low sample)" to the description.

---

## 5. Raise Minimum Thresholds

**File:** `src/lib/constants/ai-analytics.ts`

Current `MIN_TRADES_FOR_RANKING: 3` is far too low for recommendations like "Focus on X pair."

Update:

```typescript
MIN_TRADES_FOR_RANKING: 10,    // was 3 -- minimum for pair/time recommendations
MIN_TRADES_FOR_SESSION: 10,    // was 3 -- minimum for session-level advice
MIN_TRADES_FOR_CORRELATION: 5, // was 3
```

This single change filters out all 3-trade noise from pair rankings, time slots, and session insights across the entire page.

---

## 6. Session Insights: Add Expectancy Check

**File:** `src/components/analytics/session/SessionInsights.tsx` (lines 96-103)

Currently "Avoid Tokyo Session" is based solely on win rate. A 20% win rate with 4x R:R is profitable.

Add expectancy calculation before issuing warnings:

```typescript
// Calculate expectancy: (winRate * avgWin) - ((1 - winRate) * avgLoss)
const wr = data.winRate / 100;
const expectancy = (wr * data.avgPnl) ... // or use totalPnl / trades as proxy

// Only warn if BOTH win rate is low AND expectancy is negative
if (data.winRate < SESSION_THRESHOLDS.SESSION_WARNING_WIN_RATE && data.totalPnl < 0) {
  // Issue warning
}
```

If win rate is low but totalPnl is positive, change to a pattern insight instead:
```typescript
title: `${SESSION_LABELS[worstSession]} Low Win Rate, Positive Edge`,
description: `Despite ${formatWinRate(data.winRate)} win rate, this session is net profitable (${formatPnl(data.totalPnl)}). Your R:R compensates.`,
```

Also add sample size badge to session summary grid cards when trades < 10:
```typescript
{data.trades > 0 && data.trades < 10 && (
  <div className="text-xs opacity-60 mt-1">Low sample</div>
)}
```

---

## 7. Predictions: Fix Streak Independence Framing

**File:** `src/lib/predictive-analytics.ts` (line 97)

Current description: "80% chance next trade also loss" implies dependency.

The function correctly uses historical pattern matching (not raw probability), but the description doesn't clarify this. Update:

```typescript
description: `After ${currentStreak} consecutive ${streakType}s, historically ${prob.toFixed(0)}% of similar streaks continued. Based on ${occurrences} pattern matches in your history.`,
```

This clarifies it's empirical pattern matching, not theoretical probability.

---

## 8. Predictions: Enforce Confidence Thresholds

**File:** `src/lib/predictive-analytics.ts`

Current confidence thresholds are too generous:
```typescript
LOW: 5,    // 5 samples = "low" -- should be higher
MEDIUM: 15,
HIGH: 30,
```

Update:
```typescript
LOW: 10,
MEDIUM: 30,
HIGH: 100,
```

Also update `getDayOfWeekEdge` minimum from 3 to 10:
```typescript
if (todayTrades.length < 10) return null;  // was 3
```

And `getSessionOutlook` minimum from 3 to 10:
```typescript
if (sessionTrades.length < 10) return null;  // was 3
```

---

## 9. Action Items: Add Quantified Impact

**File:** `src/pages/AIInsights.tsx` (lines 288-334)

Currently actions are template checklists. Add quantified reasoning:

```typescript
// Win rate action -- add breakeven context
reason: `Win rate ${stats.winRate.toFixed(0)}% is below breakeven threshold of ${breakevenWR.toFixed(0)}%`

// Profit factor action -- add target
reason: `Profit factor ${stats.profitFactor.toFixed(2)} — improving to 1.50 would increase expectancy by ~${((1.5 - stats.profitFactor) * stats.avgLoss).toFixed(2)} per trade`

// Worst time slot -- add sample context
reason: `Only ${stats.worstTimeSlot.winRate.toFixed(0)}% win rate (${stats.worstTimeSlot.trades} trades) during this time`
```

---

## Technical Summary

| File | Change |
|------|--------|
| `src/lib/constants/ai-analytics.ts` | Raise MIN_TRADES_FOR_RANKING to 10, MIN_TRADES_FOR_SESSION to 10 |
| `src/pages/AIInsights.tsx` | R:R-aware win rate insight; diagnostic profit factor; statistical streak text; sample size on all insights; quantified action items |
| `src/components/analytics/session/SessionInsights.tsx` | Expectancy-gated warnings; low sample badges |
| `src/lib/predictive-analytics.ts` | Fix streak description; raise confidence thresholds; raise minimum samples for day/session predictions |

## What Does NOT Change

- PredictiveInsights.tsx component (already renders confidence from the lib)
- Contextual Performance tab
- Emotional Pattern Analysis
- Any backend or edge function logic

