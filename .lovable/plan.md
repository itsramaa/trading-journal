

# Deep-Dive Analysis: Heatmap Page

---

## Scope: Files Analyzed

| File | Role |
|------|------|
| `src/pages/TradingHeatmap.tsx` | Page orchestrator |
| `src/components/analytics/charts/TradingHeatmap.tsx` | Heatmap grid component |
| `src/lib/export/heatmap-export.ts` | CSV export logic |
| `src/hooks/use-economic-events.ts` | Event overlay data |
| `src/lib/session-utils.ts` | Session definitions |

---

## 1. Page Orchestrator (`src/pages/TradingHeatmap.tsx`)

### A. Comprehensiveness

| Feature | Status |
|---------|--------|
| PageHeader with icon/description | Done |
| Date range filter (7d/30d/90d/all) | Done |
| Pair filter (dynamic from trades) | Done |
| Export button linking to /export | Done |
| Loading skeleton | Done |
| Empty state (0 closed trades) | Done |
| Session Performance cards (4 sessions) | Done |
| Main Heatmap grid (child component) | Done |
| Best/Worst Hour cards (adaptive labels) | Done |
| Longest Win/Loss Streak cards | Done |
| Summary footer with trade count + total P&L | Done |
| Low sample badge on session cards | Done |
| ErrorBoundary wrapper | **Missing** |
| `role="region"` + `aria-label` | **Missing** |

**Gaps:**

1. **No `role="region"` on root container** -- inconsistent with the ARIA standard applied to 11+ other pages.

2. **No ErrorBoundary wrapper** -- every other analytics page (Performance, Risk, Daily P&L) has a top-level `ErrorBoundary` with `retryKey`. This page has none.

3. **No tooltip on "Date Range" filter** -- Should say: "Filter heatmap and all stats by time period."

4. **No tooltip on "Pair" filter** -- Should say: "Filter by trading pair. Only pairs with closed trades are shown."

5. **No tooltip on "Export" button** -- Should say: "Export heatmap data to CSV or PDF from the Export page."

### B. Accuracy

| Check | Result |
|-------|--------|
| PnL uses `realized_pnl ?? pnl ?? 0` | Correct (lines 98, 130, 156, 412-413) |
| Closed trade filter `status === 'closed'` | Correct (line 68) |
| Session detection uses `getTradeSession()` (UTC-based) | Correct (line 97) |
| Win rate `(wins / trades) * 100` | Correct (line 107) |
| Best/Worst hour min 2 trades threshold | Correct (line 167) |
| Best/Worst duplicate suppression (same hour) | Correct (line 298-299) |
| Adaptive labels (Least Loss Hour, Smallest Gain Hour) | Correct (lines 292-297) |
| Streak analysis sorts by date ascending | Correct (lines 120-122) |

6. **Summary footer recalculates total P&L inline** (lines 412-413): `filteredTrades.reduce((sum, t) => sum + (t.realized_pnl ?? t.pnl ?? 0), 0)` is computed twice -- once for the className check and once for the display value. This should be memoized or computed once.

### C. Clarity -- Missing Tooltips

7. **Session card titles** (Sydney, Tokyo, London, New York) -- No tooltip. Should say, e.g., for Sydney: "Trades executed during the Sydney session (21:00-06:00 UTC). Time shown in your local timezone."

8. **Session time badge** (e.g., "03:00-12:00") -- No tooltip. Should say: "Session hours converted to your local timezone."

9. **"(low sample)" text** (line 276) -- No tooltip. Should say: "Fewer than 10 trades. Statistics may not be reliable."

10. **"Best Hour" / "Least Loss Hour" card title** -- No tooltip. Should say: "The 1-hour block with the highest total P&L (minimum 2 trades required)."

11. **"Worst Hour" / "Smallest Gain Hour" card title** -- No tooltip. Should say: "The 1-hour block with the lowest total P&L (minimum 2 trades required)."

12. **"Longest Win Streak" card title** -- No tooltip. Should say: "Maximum consecutive profitable trades in the selected period."

13. **"Longest Loss Streak" card title** -- No tooltip. Should say: "Maximum consecutive losing trades in the selected period."

14. **"Current" streak sub-label** (lines 368, 393) -- No tooltip. Should say: "Your active streak as of the most recent trade."

### D. Code Quality

15. **Missing `font-mono-numbers`** on session P&L values (line 270), best/worst hour values (lines 313, 335), and streak counts (lines 366, 391). Other pages (Daily P&L, Performance) apply this for alignment consistency.

16. **Total P&L computed twice in footer** (lines 412-413) -- Should extract to a `useMemo` variable (e.g., `totalFilteredPnl`) to avoid duplicate reduce calls.

---

## 2. Heatmap Grid Component (`src/components/analytics/charts/TradingHeatmap.tsx`)

### A. Comprehensiveness -- Complete

Grid with 7 days x 6 time blocks, dynamic color thresholds, compact P&L in cells, rich hover tooltips (time range, P&L, trades, wins, win rate, avg P&L), session labels, event overlay with ring + badge, and full legend. ARIA `role="region"` already present.

### B. Accuracy -- Correct

PnL chain, win rate, dynamic color thresholds (based on data range), and event matching all verified.

### C. Clarity -- Missing Tooltips

17. **"Trading Heatmap" card title** (line 178) -- No tooltip. Should say: "Aggregated P&L across day-of-week and 4-hour time blocks. Hover cells for detailed breakdown."

18. **Legend items** (High Loss, Low Loss, No Data, Low Profit, High Profit) -- No tooltips explaining the thresholds. Should say, e.g., for "High Profit": "P&L is greater than 50% of the maximum observed P&L in the dataset."

19. **"High-Impact Event" legend item** -- No tooltip. Should say: "Cells with high-impact economic events (FOMC, CPI, NFP). Data limited to the current week."

20. **Session labels in row headers** (Asia, London, NY at lines 200-204) -- These use simplified labels ("Asia", "London", "NY") which are inconsistent with the page-level SESSION_CONFIG that uses the canonical names from `session-utils.ts` (Sydney, Tokyo, London, New York). Should align or add a tooltip explaining the mapping.

### D. Code Quality

21. **`getCellData` uses `.find()` on array** (line 143): For every cell render (7 days x 6 hours = 42 calls), it does a linear scan. Should use a Map lookup keyed by `${day}-${hour}` instead, which is how the data is already structured during computation.

22. **Unused imports**: `subDays`, `parseISO`, `startOfWeek`, `addDays` from date-fns (line 15) and `Tables` type (line 17) are imported but never used.

23. **`tradeDates` Set** (line 68) is populated but never read. Dead code that should be removed.

---

## 3. CSV Export (`src/lib/export/heatmap-export.ts`)

### B. Accuracy

24. **Hardcoded `$` in CSV output** (line 40): `$${pnl}` hardcodes the dollar sign. This bypasses the user's currency preference. The export function does not have access to currency context, so the fix is to remove the `$` prefix entirely and let the raw number speak for itself, or accept a currency symbol parameter.

---

## 4. Summary of All Recommendations

### Priority 1 -- Accuracy / Logic

| # | Issue | File | Fix |
|---|-------|------|-----|
| 6 | Total P&L computed twice in footer | TradingHeatmap.tsx (page) | Extract to `useMemo` variable |
| 21 | `getCellData` uses linear `.find()` for 42 cells | TradingHeatmap.tsx (component) | Use Map lookup |
| 24 | Hardcoded `$` in CSV export | heatmap-export.ts | Remove `$` prefix or accept currency param |

### Priority 2 -- Missing Tooltips (Clarity)

| # | Elements | File |
|---|----------|------|
| 3-5 | Date Range filter, Pair filter, Export button | TradingHeatmap.tsx (page) |
| 7-9 | Session card titles, time badge, low sample text | TradingHeatmap.tsx (page) |
| 10-14 | Best/Worst Hour, Win/Loss Streak, Current streak | TradingHeatmap.tsx (page) |
| 17-20 | Heatmap card title, legend items, event legend, session row labels | TradingHeatmap.tsx (component) |

### Priority 3 -- Code Quality and Accessibility

| # | Issue | Fix |
|---|-------|-----|
| 1 | Missing `role="region"` on page root | TradingHeatmap.tsx (page) |
| 2 | No ErrorBoundary wrapper | TradingHeatmap.tsx (page) |
| 15 | Missing `font-mono-numbers` on financial values | TradingHeatmap.tsx (page) |
| 20 | Session label inconsistency (Asia vs Sydney/Tokyo) | TradingHeatmap.tsx (component) |
| 22 | Unused imports (date-fns, Tables type) | TradingHeatmap.tsx (component) |
| 23 | Dead code (`tradeDates` Set) | TradingHeatmap.tsx (component) |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/TradingHeatmap.tsx` | Add `role="region"` and `aria-label` (#1), wrap with ErrorBoundary (#2), add tooltips to filters (#3-5), session cards (#7-9), Best/Worst Hour (#10-11), Streak cards (#12-14), add `font-mono-numbers` to financial values (#15), extract `totalFilteredPnl` to useMemo (#6) |
| `src/components/analytics/charts/TradingHeatmap.tsx` | Add tooltip to card title (#17), legend items (#18-19), fix session row labels (#20), optimize `getCellData` to Map lookup (#21), remove unused imports (#22), remove dead `tradeDates` code (#23) |
| `src/lib/export/heatmap-export.ts` | Remove hardcoded `$` from CSV output (#24) |

