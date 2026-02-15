

# Deep-Dive Analysis: My Strategies Page

---

## Scope: Files Analyzed

| File | Role |
|------|------|
| `src/pages/trading-journey/StrategyManagement.tsx` | Page orchestrator |
| `src/components/strategy/StrategyCard.tsx` | Individual strategy card |
| `src/components/strategy/StrategyStats.tsx` | Summary stats cards |
| `src/components/strategy/StrategyFormDialog.tsx` | Create/Edit form (986 lines) |
| `src/components/strategy/StrategyDetailDrawer.tsx` | Detail drawer (488 lines) |
| `src/components/strategy/StrategyShareDialog.tsx` | Share via link/QR |
| `src/components/strategy/StrategyLeaderboard.tsx` | Global leaderboard |
| `src/components/strategy/StrategyValidationBadge.tsx` | Validation badge |
| `src/components/strategy/EntryRulesBuilder.tsx` | Entry rules builder |
| `src/components/strategy/ExitRulesBuilder.tsx` | Exit rules builder |
| `src/components/strategy/ExpectancyPreview.tsx` | Expectancy table |
| `src/components/strategy/MarketFitSection.tsx` | Market fit analysis |
| `src/components/strategy/PairRecommendations.tsx` | Pair recommendations |
| `src/components/dashboard/StrategyCloneStatsWidget.tsx` | Clone stats widget |
| `src/hooks/analytics/use-strategy-performance.ts` | AI Quality Score hook |
| `src/hooks/use-strategy-context.ts` | Market fit + pair intelligence |
| `src/hooks/trading/use-trading-strategies.ts` | CRUD hook |

---

## 1. Page Orchestrator (`StrategyManagement.tsx`)

### A. Comprehensiveness

| Feature | Status |
|---------|--------|
| PageHeader with icon/description | Done |
| New Strategy button (Library tab only) | Done |
| URL-driven tabs via `useSearchParams` | Done |
| Tab: Library (clone stats + stats + card grid) | Done |
| Tab: Leaderboard (global ranking) | Done |
| Tab: Import (YouTube importer) | Done |
| Loading skeleton | Done |
| Empty state with CTA | Done |
| Strategy Form Dialog (create/edit) | Done |
| Strategy Detail Drawer (click to view) | Done |
| Strategy Share Dialog | Done |
| Delete confirmation dialog | Done |
| Dynamic base assets from DB | Done |
| ErrorBoundary wrapper | **Missing** |
| `role="region"` + `aria-label` | **Missing** |

**Gaps:**

1. **No `role="region"` on root container** -- inconsistent with the ARIA standard applied to 11+ other pages.

2. **No ErrorBoundary wrapper** -- every other analytics/management page has a top-level `ErrorBoundary` with `retryKey`.

### B. Accuracy

| Check | Result |
|-------|--------|
| Strategy CRUD operations via hooks | Correct |
| Soft delete (is_active = false) | Correct |
| Performance map passed to cards/drawer | Correct |
| Base assets fallback to COMMON_PAIRS | Correct |
| Edit propagates all fields correctly | Correct |

3. **`as any` casts on timeframe/market_type** (lines 103-106, 128-131): `values.timeframe as any`, `values.higherTimeframe as any`, `values.lowerTimeframe as any`, `values.marketType as any` bypass type safety. These should use proper `TimeframeType` and `MarketType` casts.

4. **Duplicate mutation object shape** (lines 97-121 vs 123-146): The create and update branches construct nearly identical objects. This should be extracted into a shared `buildStrategyPayload()` helper to follow DRY.

### C. Clarity -- Missing Tooltips

5. **Tab titles** ("Library", "Leaderboard", "Import") -- No tooltips. Should say:
   - Library: "Your personal strategy collection. Create, edit, and manage trading strategies."
   - Leaderboard: "Top shared strategies ranked by clone count from the community."
   - Import: "Import trading strategies from YouTube tutorial videos using AI extraction."

6. **"New Strategy" button** (line 186) -- No tooltip. Should say: "Create a new trading strategy with entry/exit rules, position sizing, and trade management."

---

## 2. Strategy Stats (`StrategyStats.tsx`)

### A. Comprehensiveness -- Complete

All 4 cards (Total, Active, Spot, Futures) with InfoTooltips already present.

### B. Accuracy

7. **"Active" count includes all strategies** (line 15): `strategies?.filter(s => s.is_active).length` -- but the query in `useTradingStrategies` already filters `.eq("is_active", true)`, so `activeStrategies` will always equal `totalStrategies`. This metric is redundant and always shows the same number.

   **Fix**: Either remove the "Active" card (since soft-deleted strategies are never fetched), or change it to count strategies with `status === 'active'` (vs `'paused'`/`'killed'`) which is the meaningful distinction.

---

## 3. Strategy Card (`StrategyCard.tsx`)

### A. Comprehensiveness -- Complete

Color indicator, name, description, methodology/style badges, timeframe chain, market type, confluences, R:R, performance stats (W/L, WR), tags, created date, YouTube source badge, Market Fit badge, AI Quality Score badge with rich tooltips.

### B. Accuracy -- Correct

All data flows verified. Performance and market fit data properly consumed.

### C. Clarity

8. **Confluences badge** (line 181-184) -- No tooltip. Should say: "Minimum number of entry rule confirmations required before taking a trade."

9. **R:R badge** (line 185-188) -- No tooltip. Should say: "Minimum Risk:Reward ratio required. Trades below this ratio are rejected."

10. **Performance stats bar** (lines 192-203) -- No tooltip on the W/L and WR display. Should say: "Win/Loss record and win rate based on closed trades assigned to this strategy."

### D. Code Quality

11. **`strategy.methodology !== 'price_action'` filter** (line 153): Hides the default methodology badge. This is an undocumented business rule that could confuse users who explicitly chose "Price Action". Should either always show the badge or add a comment explaining the design decision.

---

## 4. Strategy Form Dialog (`StrategyFormDialog.tsx`)

### A. Comprehensiveness -- Complete

5-tab form (Basic, Method, Entry, Exit, Manage) with all professional fields: methodology, trading style, multi-timeframe analysis, session preference, difficulty level, position sizing models, trade management (partial TP, SL-to-BE, kill switches), futures settings, structural validation warnings, expectancy preview.

### B. Accuracy

12. **Partial TP levels do not validate total percentage** (lines 806-858): Users can add partial TP levels that sum to more than 100% (e.g., close 80% at 1R + close 50% at 2R = 130%). No validation prevents this.

   **Fix**: Add a validation warning when the sum of partial TP `percent` values exceeds 100%.

### C. Clarity

13. **"Basic" tab** -- No label tooltip for "Valid Trading Pairs" explaining: "Assets this strategy is designed for. Used for filtering and recommendations."

14. **"Method" tab -- "Trading Methodology"** -- Has description text but no InfoTooltip on the label itself explaining the field's purpose: "The analytical framework this strategy uses to identify trade setups."

15. **"Entry" tab -- "Min. Confluences"** -- Has inline description but no InfoTooltip: "Minimum number of entry rules that must be satisfied before a trade is valid."

16. **"Exit" tab -- "Min. Risk:Reward"** -- Has inline description but no InfoTooltip: "Minimum ratio between potential profit and potential loss. Acts as a validation gate."

17. **"Manage" tab -- "Partial Take Profit"** -- No tooltip. Should say: "Close portions of your position at different profit targets to lock in gains."

18. **"Manage" tab -- "Move SL to Breakeven"** -- No tooltip. Should say: "Automatically move your stop loss to entry price when trade reaches the specified R multiple."

19. **"Manage" tab -- "Kill Switch / Limits"** -- No tooltip. Should say: "Automatic circuit breakers that stop trading when risk limits are hit."

---

## 5. Strategy Detail Drawer (`StrategyDetailDrawer.tsx`)

### A. Comprehensiveness -- Complete

Full detail view with action buttons (Edit, Backtest, Share, Export PDF), metadata badges, multi-timeframe display, session preferences, core settings, position sizing, trade management rules, validation score with tooltip, tags, AI Quality Score card with progress bar, Market Fit section, validity reasons, pair recommendations, historical insights.

### B. Accuracy -- Correct

All data flows verified. PnL chain uses `realized_pnl ?? pnl ?? 0` via hook.

### C. Clarity

20. **"Strategy Details" card title** (line 148) -- No tooltip. Should say: "Configuration and rules for this trading strategy."

21. **"Multi-Timeframe Analysis" section** (line 178) -- No tooltip. Should say: "Three-timeframe system: Higher TF for directional bias, Primary TF for trade decisions, Lower TF for precise entries."

22. **"AI Quality Score" card title** (line 344) -- No tooltip. Should say: "Composite score (0-100) based on Win Rate (40%), Profit Factor (30%), Consistency (20%), and Sample Size (10%)."

23. **"Historical Insights" card title** (line 455) -- No tooltip. Should say: "Performance metrics derived from your actual trades using this strategy."

### D. Code Quality

24. **Missing `font-mono-numbers`** on performance metric values (lines 359, 363, 367): Win Rate, Total Trades, and Profit Factor values lack tabular number formatting for alignment consistency.

---

## 6. Strategy Leaderboard (`StrategyLeaderboard.tsx`)

### A. Comprehensiveness -- Complete

Search, filters (timeframe, market type), sorting, pagination, rank icons (Crown/Trophy/Medal), clone count, "Yours" badge, view link. Empty states for both no-data and no-filter-match.

### B. Accuracy

25. **`color` field used as raw CSS** (line 385): `style={{ backgroundColor: strategy.color || "#6b7280" }}` assumes `strategy.color` is a valid CSS color. But the system stores color as semantic names (e.g., "blue", "green") per `STRATEGY_COLORS`. Semantic names like "blue" happen to be valid CSS color keywords, but the system-defined colors ("teal", "pink") may not render as expected.

   **Fix**: Use the same `STRATEGY_CARD_COLOR_CLASSES` mapping from `strategy-config.ts` to convert semantic names to proper CSS classes, or render a div with Tailwind classes instead of inline `backgroundColor`.

26. **`TIMEFRAME_OPTIONS` duplicated** (lines 64-74): The leaderboard defines its own `TIMEFRAME_OPTIONS` array with different values (includes "30m") that don't match the canonical `TIMEFRAME_OPTIONS` from `src/types/strategy.ts` (which doesn't include "30m"). This could lead to filter mismatches.

   **Fix**: Import and extend the canonical `TIMEFRAME_OPTIONS` from `src/types/strategy.ts`.

27. **`MARKET_TYPE_OPTIONS` includes "margin"** (line 81): The system only supports "spot" and "futures" as `MarketType`. Including "margin" in the filter options creates a dead filter that will never match any strategy.

   **Fix**: Remove "margin" from the options or align with the actual `MarketType` type.

### C. Clarity

28. **"Strategy Leaderboard" card title** -- No tooltip. Should say: "Community-ranked strategies sorted by clone count. Share your strategies to appear here."

29. **Clone count display** -- No tooltip. Should say: "Number of times this strategy has been cloned by other traders."

---

## 7. Strategy Context Hook (`use-strategy-context.ts`)

### B. Accuracy

30. **PnL uses only `trade.pnl`** (line 155): The per-pair performance calculation uses `trade.pnl || 0` instead of the standardized `realized_pnl ?? pnl ?? 0` chain. This is inconsistent with the platform-wide PnL standard and will produce inaccurate pair-level analytics for Binance-synced trades that have `realized_pnl` but different `pnl`.

   **Fix**: Change line 155 to `existing.totalPnl += (trade as any).realized_pnl ?? trade.pnl ?? 0;`. Additionally, the query at line 112 should include `realized_pnl` in the select fields.

31. **Session match logic is overly simplified** (lines 235-238): The current check uses arbitrary UTC hour ranges that don't properly map to standard trading sessions (Sydney 21:00-06:00, Tokyo 00:00-09:00, London 07:00-16:00, New York 13:00-22:00 UTC). A strategy with `session_preference: ['london']` should check against actual London hours, but the current code ignores the strategy's session preference entirely.

   This is a known limitation noted in the code comment "simplified - could be enhanced". Recommend adding a comment-level note but not fixing in this scope since it requires integrating `session-utils.ts`.

---

## 8. Strategy Performance Hook (`use-strategy-performance.ts`)

### B. Accuracy -- Correct

| Check | Result |
|-------|--------|
| PnL chain `realized_pnl ?? pnl ?? 0` | Correct (lines 85-86, 89-90, 101) |
| Closed trade filter via `trade.status` | Correct (line 67) |
| Win rate `wins / totalTrades` | Correct (line 81) |
| Profit factor with infinity fallback | Correct (lines 92-96) |
| AI Quality Score weighted formula | Correct (lines 36-50) |

No issues found.

---

## 9. Summary of All Recommendations

### Priority 1 -- Accuracy / Logic

| # | Issue | File | Fix |
|---|-------|------|-----|
| 7 | "Active" count always equals "Total" (redundant) | StrategyStats.tsx | Change to count `status === 'active'` vs paused/killed |
| 12 | Partial TP levels can exceed 100% total | StrategyFormDialog.tsx | Add validation warning |
| 25 | Color field used as raw CSS for semantic names | StrategyLeaderboard.tsx | Use color class mapping |
| 26 | Duplicated TIMEFRAME_OPTIONS with extra "30m" | StrategyLeaderboard.tsx | Import canonical options |
| 27 | "margin" market type in filter doesn't match schema | StrategyLeaderboard.tsx | Remove "margin" option |
| 30 | PnL uses `trade.pnl` instead of standardized chain | use-strategy-context.ts | Use `realized_pnl ?? pnl ?? 0` |

### Priority 2 -- Missing Tooltips (Clarity)

| # | Elements | File |
|---|----------|------|
| 5 | Tab titles (Library, Leaderboard, Import) | StrategyManagement.tsx |
| 6 | New Strategy button | StrategyManagement.tsx |
| 8-10 | Confluences badge, R:R badge, performance stats | StrategyCard.tsx |
| 13-19 | Form field labels across 5 tabs | StrategyFormDialog.tsx |
| 20-23 | Drawer section titles | StrategyDetailDrawer.tsx |
| 28-29 | Leaderboard title, clone count | StrategyLeaderboard.tsx |

### Priority 3 -- Code Quality and Accessibility

| # | Issue | Fix |
|---|-------|-----|
| 1 | Missing `role="region"` on page root | StrategyManagement.tsx |
| 2 | No ErrorBoundary wrapper | StrategyManagement.tsx |
| 3 | `as any` casts on timeframe/market_type | StrategyManagement.tsx |
| 4 | Duplicate mutation payload shape (DRY) | StrategyManagement.tsx |
| 24 | Missing `font-mono-numbers` on drawer metrics | StrategyDetailDrawer.tsx |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/trading-journey/StrategyManagement.tsx` | Add `role="region"` and `aria-label` (#1), wrap with ErrorBoundary (#2), fix `as any` casts (#3), extract shared payload builder (#4), add tooltips to tabs (#5) and button (#6) |
| `src/components/strategy/StrategyStats.tsx` | Fix "Active" count to use `status` field instead of `is_active` (#7) |
| `src/components/strategy/StrategyCard.tsx` | Add tooltips to confluences (#8), R:R (#9), and performance stats (#10) |
| `src/components/strategy/StrategyFormDialog.tsx` | Add partial TP sum validation (#12), add tooltips to form labels (#13-19) |
| `src/components/strategy/StrategyDetailDrawer.tsx` | Add tooltips to section titles (#20-23), add `font-mono-numbers` to metrics (#24) |
| `src/components/strategy/StrategyLeaderboard.tsx` | Fix color rendering (#25), import canonical timeframe options (#26), remove "margin" filter (#27), add tooltips (#28-29) |
| `src/hooks/use-strategy-context.ts` | Fix PnL chain to use `realized_pnl ?? pnl ?? 0` and add `realized_pnl` to query select (#30) |

