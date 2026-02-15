
# Deep-Dive Analysis: AI Insights Page

---

## Scope: Files Analyzed

| File | Role |
|------|------|
| `src/pages/AIInsights.tsx` | Page orchestrator (749 lines) |
| `src/components/analytics/PredictiveInsights.tsx` | Predictions tab component |
| `src/components/analytics/contextual/ContextualPerformance.tsx` | Contextual Performance tab component |
| `src/components/analytics/EmotionalPatternAnalysis.tsx` | Emotional pattern sub-component |
| `src/components/analytics/session/SessionInsights.tsx` | Session insights sub-component |
| `src/components/analytics/contextual/ContextualOnboardingGuide.tsx` | Onboarding banner |
| `src/lib/predictive-analytics.ts` | Pure prediction functions |
| `src/lib/constants/ai-analytics.ts` | Centralized thresholds |

---

## 1. Page Orchestrator (`src/pages/AIInsights.tsx`)

### A. Comprehensiveness

| Feature | Status |
|---------|--------|
| PageHeader with icon/description | Done |
| Export button linking to /export | Done |
| Loading skeleton (MetricsGridSkeleton + ChartSkeleton) | Done |
| Empty state (fewer than MIN_TRADES_FOR_INSIGHTS) | Done |
| ErrorBoundary with retryKey | Done |
| URL-driven tabs via `useSearchParams` | Done |
| Tab: Pattern Analysis (insights + actions + session + pair ranking) | Done |
| Tab: Predictions (PredictiveInsights component) | Done |
| Tab: Contextual Performance (ContextualPerformance + EmotionalPatternAnalysis) | Done |
| `role="region"` + `aria-label` on root | **Missing** |
| Live/Paper mode badge | **Missing** |

**Gaps:**

1. **No `role="region"` on root container** -- inconsistent with the standard applied to 11+ other pages (Performance, Risk, Daily P&L, Heatmap).

2. **No Live/Paper mode badge** -- Every analytics page (Daily P&L, Heatmap, Performance) displays a badge showing the active trade mode. This page does not, despite consuming mode-filtered data via `useModeFilteredTrades`. Users cannot tell which data source they are viewing.

3. **No tooltip on "Export" button** (line 536-545) -- Should say: "Export analytics data to CSV or PDF from the Export page."

### B. Accuracy

| Check | Result |
|-------|--------|
| PnL uses `realized_pnl ?? pnl ?? 0` | Correct (line 104) |
| Closed trade filter `status === 'closed'` | Correct (line 89) |
| Win rate `(wins.length / total) * 100` | Correct (line 107) |
| Profit factor formula `(avgWin * wins) / (avgLoss * losses)` | Correct (line 112) |
| Breakeven WR calculation `avgLoss / (avgWin + avgLoss) * 100` | Correct (line 226-228) |
| Pair ranking min trades threshold (MIN_TRADES_FOR_RANKING) | Correct (line 151) |
| Time slot analysis with centralized functions | Correct (lines 156-170) |
| Streak detection sorted descending (most recent first) | Correct (line 117-118) |
| Rolling 30-trade vs overall comparison | Correct (lines 182-184) |
| Strategy adherence with `(trade as any)` casting | Functional but type-unsafe |
| Session data passed as `as any` (line 678) | Functional but type-unsafe |

4. **`(trade as any).post_trade_analysis` -- double `as any` casting** (lines 399-401): The strategy adherence block accesses `post_trade_analysis.strategy_adherence` via `any` cast twice. This bypasses type safety and will silently fail if the field structure changes. Should use a type guard or proper type extension.

5. **`contextualData?.bySession as any`** (line 678): The session data is force-cast to `any` before being passed to `SessionInsights`. This hides potential type mismatches between the hook output and the component's expected `Record<TradingSession, PerformanceMetrics>` prop.

6. **Win rate time slot calculation is mathematically fragile** (lines 168-169): The running average formula `((slot.winRate * (slot.trades - 1) / 100) + 1) / slot.trades * 100` is a non-standard incremental calculation that could accumulate floating-point drift over many trades. A simpler `wins/trades` count would be more reliable, consistent with how every other module calculates win rate.

### C. Clarity -- Missing Tooltips

The page has zero `InfoTooltip` components. Every major section and metric lacks contextual guidance:

7. **"Pattern Analysis" card title** (line 572-576) -- No tooltip. Should say: "Algorithmically detected patterns from your historical trades. Insights are generated from statistical analysis, not AI prediction."

8. **Confidence badge (e.g., "15t")** (lines 607-614) -- No tooltip. The badge shows sample size as "{N}t" but does not explain what it means. Should say: "Number of trades used for this analysis. Higher = more reliable. Color indicates confidence: green (high), yellow (medium), gray (low)."

9. **"Recommended Actions" card title** (line 634-638) -- No tooltip. Should say: "Prioritized action items based on detected performance issues. High priority items should be addressed first."

10. **Priority badge ("high"/"medium"/"low")** (lines 655-665) -- No tooltip. Should say: "Impact priority: High = immediate action needed, Medium = review when convenient, Low = minor optimization."

11. **"Session Insights" section** (line 678) -- The child component has its own header, but no tooltip on the main title explaining: "Performance breakdown by trading session (Sydney, Tokyo, London, New York). Requires minimum 5 trades."

12. **"Pair Performance Ranking" card title** (line 682-688) -- No tooltip. Should say: "Trading pairs ranked by per-trade expectancy (average P&L per trade). Minimum 10 trades required per pair."

13. **"Keep Trading" / "Review" badges in pair ranking** (lines 720-725) -- No tooltip. Should say: "'Keep Trading' = positive total P&L. 'Review' = negative total P&L, consider removing from watchlist."

14. **Expectancy metric in pair row ("{formatPnl}/trade")** (line 709) -- No tooltip. Should say: "Average profit/loss per trade for this pair. Positive expectancy = edge."

15. **Tab titles** ("Pattern Analysis", "Predictions", "Contextual Performance") (lines 551-563) -- No tooltips describing what each tab contains.

### D. Code Quality

16. **Missing `font-mono-numbers`** on financial values: Pair ranking P&L values (line 718), expectancy values (line 709), and insight metric badges (line 621) do not use `font-mono-numbers` for consistent alignment.

17. **Page file is 749 lines** -- the `stats` computation (lines 101-217, ~116 lines), `insights` generation (lines 220-436, ~216 lines), and `actionItems` generation (lines 439-491, ~52 lines) are all inline in the page component. These should be extracted into dedicated hooks (e.g., `useAIInsightStats`, `usePatternInsights`, `useActionItems`) following Single Responsibility Principle. However, given the plan scope is focused on UI/clarity/accuracy fixes, this is noted as a future refactor recommendation.

18. **Duplicate breakeven WR calculation** -- `breakevenWR` is computed identically in both `insights` (line 226-228) and `actionItems` (line 445-447). Should be computed once in `stats` and shared.

---

## 2. Sub-Component Analysis

### `PredictiveInsights.tsx` -- Predictions Tab

| Check | Status |
|-------|--------|
| `role="region"` + `aria-label` | Done (line 61) |
| `font-mono-numbers` on values | Done (line 159) |
| ARIA on PredictionCard | Done (line 158) |
| Empty state | Done |
| PnL chain `realized_pnl ?? pnl ?? 0` | Correct (in predictive-analytics.ts) |

19. **"Streak Continuation" card** -- No tooltip. Should say: "Probability of your current streak continuing, based on historical pattern matching of similar streak lengths."

20. **"Today's Edge" card** -- No tooltip. Should say: "Your historical win rate on this day of the week compared to your overall average."

21. **"Session Outlook" card** -- No tooltip. Should say: "Your historical performance during the currently active trading session."

22. **"Pair Momentum" card** -- No tooltip. Should say: "Recent performance trend per pair based on last 5 trades. Bullish = 60%+ win rate, Bearish = 40% or less."

### `ContextualPerformance.tsx` -- Contextual Tab

| Check | Status |
|-------|--------|
| Loading skeleton | Done |
| Empty state | Done |
| Data quality banner | Done |
| Onboarding guide | Done |
| PnL chain | Correct (via hook) |

23. **"Performance by Fear & Greed" card** -- No tooltip. Should say: "Your win rate segmented by the Fear & Greed Index value at the time of each trade. Helps identify which sentiment environments suit your strategy."

24. **"Performance by Volatility" card** -- No tooltip. Should say: "Win rate in low, medium, and high volatility conditions. Captured from market context at trade entry."

25. **"Performance by Event Days" card** -- No tooltip. Should say: "Compares your performance on high-impact economic event days vs. normal trading days."

26. **"Correlation Analysis" card** -- No tooltip. Should say: "Statistical correlation (-1 to +1) between market conditions and your performance. Values near 0 = no relationship, near +/-1 = strong relationship."

27. **Correlation values** -- Missing `font-mono-numbers` class on the correlation value display (line 387).

### `EmotionalPatternAnalysis.tsx` -- Contextual Tab Sub-component

| Check | Status |
|-------|--------|
| `role="region"` + `aria-label` | Done (lines 154, 177) |
| PnL chain `realized_pnl ?? pnl ?? 0` | Correct (line 77) |
| Min trades gating (MIN_TRADES_FOR_PATTERNS) | Correct (line 51) |
| Empty state | Done |

28. **"Emotional Pattern Analysis" card title** -- No tooltip. Should say: "Win rate and P&L breakdown by the emotional state you logged at trade entry. Requires logging emotions for at least 10 trades."

29. **Win rate progress bar** -- No tooltip explaining the color coding. Should say: "Green bar = win rate above 50%, Red bar = below 50%."

### `SessionInsights.tsx` -- Pattern Analysis Tab Sub-component

| Check | Status |
|-------|--------|
| Defensive defaults for missing session data | Done (lines 53-58) |
| Min trades gating | Done (line 167) |
| Empty state | Done |
| PnL chain | Correct (via hook) |

30. **"Low sample" text** (line 228) -- No tooltip. Should say: "Fewer than 10 trades in this session. Statistics may not be statistically significant."

31. **Session summary grid win rate values** -- Missing `font-mono-numbers` on the win rate text (line 222).

---

## 3. Summary of All Recommendations

### Priority 1 -- Accuracy / Logic

| # | Issue | File | Fix |
|---|-------|------|-----|
| 4 | `(trade as any)` double cast for strategy adherence | AIInsights.tsx | Add type guard or create typed interface for `post_trade_analysis` |
| 5 | `contextualData?.bySession as any` force cast | AIInsights.tsx | Type the cast properly using the hook's exported types |
| 6 | Fragile incremental win rate formula in time slots | AIInsights.tsx | Use simple `wins/trades` counter approach |
| 18 | Duplicate breakeven WR calculation | AIInsights.tsx | Compute once in `stats` memo |

### Priority 2 -- Missing Tooltips (Clarity)

| # | Elements | File |
|---|----------|------|
| 3 | Export button | AIInsights.tsx |
| 7-8 | Pattern Analysis card title, confidence badge | AIInsights.tsx |
| 9-10 | Recommended Actions card title, priority badges | AIInsights.tsx |
| 12-14 | Pair Ranking card title, badges, expectancy | AIInsights.tsx |
| 15 | Tab titles (Pattern/Predictions/Contextual) | AIInsights.tsx |
| 19-22 | PredictiveInsights: all 4 card titles | PredictiveInsights.tsx |
| 23-26 | ContextualPerformance: all 4 card titles | ContextualPerformance.tsx |
| 28-29 | EmotionalPatternAnalysis: card title, progress bar | EmotionalPatternAnalysis.tsx |
| 30 | SessionInsights: "Low sample" text | SessionInsights.tsx |

### Priority 3 -- Code Quality and Accessibility

| # | Issue | Fix |
|---|-------|-----|
| 1 | Missing `role="region"` on page root | AIInsights.tsx |
| 2 | No Live/Paper mode badge | AIInsights.tsx |
| 16 | Missing `font-mono-numbers` on financial values | AIInsights.tsx |
| 27 | Missing `font-mono-numbers` on correlation values | ContextualPerformance.tsx |
| 31 | Missing `font-mono-numbers` on session win rate | SessionInsights.tsx |
| 17 | 749-line file (future refactor note) | AIInsights.tsx (noted, not in scope) |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/AIInsights.tsx` | Add `role="region"` and `aria-label` (#1), add Live/Paper mode badge (#2), add tooltip on Export button (#3), fix `as any` casts (#4, #5), fix time slot win rate formula (#6), add tooltips to Pattern Analysis (#7-8), Recommended Actions (#9-10), Pair Ranking (#12-14), Tab titles (#15), add `font-mono-numbers` (#16), deduplicate breakeven WR (#18) |
| `src/components/analytics/PredictiveInsights.tsx` | Add tooltips to Streak Continuation (#19), Today's Edge (#20), Session Outlook (#21), Pair Momentum (#22) |
| `src/components/analytics/contextual/ContextualPerformance.tsx` | Add tooltips to Fear & Greed (#23), Volatility (#24), Event Days (#25), Correlation (#26), add `font-mono-numbers` on correlation values (#27) |
| `src/components/analytics/EmotionalPatternAnalysis.tsx` | Add tooltip to card title (#28), progress bar color explanation (#29) |
| `src/components/analytics/session/SessionInsights.tsx` | Add tooltip to "Low sample" text (#30), add `font-mono-numbers` on win rate (#31) |
