
# Deep UX Analysis: Economic Calendar Page

## Status: Solid Core, 3 Issues Found (1 Bug, 1 Dead Logic, 1 Stale Copy)

The Economic Calendar page (`/calendar`) is correctly **mode-agnostic** -- all data comes from public Forex Factory API via edge function. Layout, flow, and components are identical across Paper and Live modes, which is the correct design.

---

## Architecture Verification

| Aspect | Status | Detail |
|--------|--------|--------|
| Mode independence | OK | No `useTradeMode`, no mode branching -- correct for public economic data |
| Data flow | OK | `useEconomicCalendar` -> edge function `economic-calendar` -> Forex Factory JSON |
| AI predictions | OK | Lovable AI (Gemini 2.5 Flash) generates crypto impact for high-impact events |
| Error handling | OK | Graceful fallback with empty events array + retry button |
| Loading states | OK | Skeleton loaders for all sections |
| Empty states | OK | "No high-impact events" and "No upcoming events" messages |
| Refresh mechanism | OK | Manual refresh button + 30-minute auto-refresh |
| Constants centralization | OK | Both frontend (`lib/constants/economic-calendar.ts`) and backend (`_shared/constants/economic-calendar.ts`) |
| Cross-feature integration | OK | Used by `ContextWarnings`, `EquityCurveWithEvents`, `useCaptureMarketContext` |

### Component Tree (verified correct)

```text
EconomicCalendar (page)
  +-- PageHeader
  +-- CalendarTab (hideTitle=true)
       +-- Refresh button
       +-- Impact Alert Banner (conditional: high-impact risk days)
       +-- Today's Key Release card (with AI prediction + crypto impact badge)
       +-- Upcoming Events list (collapsible AI predictions per event)
       +-- Footer disclaimer + last updated timestamp
```

---

## Issues Found

### BUG 1: `useEconomicEvents` Date Params Are Silently Ignored (Medium)

**Files:**
- `src/hooks/use-economic-events.ts` (lines 42-46)
- `supabase/functions/economic-calendar/index.ts` (line 171+)

`useEconomicEvents` sends `{ from, to }` in the request body to the edge function:
```typescript
const { data, error } = await supabase.functions.invoke('economic-calendar', {
  body: { from: fromDate, to: toDate },
});
```

But the edge function **never reads** `req.body` -- it always fetches `ff_calendar_thisweek.json` (current week only). The date range parameters are completely ignored.

This means `TradingHeatmap` (which uses `useHighImpactEventDates` with a 90-day lookback) thinks it's getting 90 days of data but actually only receives the current week's events. The heatmap event overlay is therefore incomplete.

**Fix:** This is an API contract mismatch. Two options:
1. **Quick fix**: Remove the `body` params from `useEconomicEvents` and document that the endpoint only returns this-week data. Update `CALENDAR_DATE_RANGE.LOOKBACK_DAYS` usage accordingly.
2. **Proper fix**: Update the edge function to read date params and fetch multiple weeks from Forex Factory (they offer `ff_calendar_thisweek.json` and `ff_calendar_nextweek.json`). However, historical data beyond 1-2 weeks is not available from this free endpoint.

**Recommendation:** Quick fix -- remove the misleading date params, and ensure callers know the data scope is "this week only."

---

### ISSUE 2: Stale Footer Copy (Cosmetic)

**File:** `src/components/market-insight/CalendarTab.tsx` (line 319)

Footer says:
> "Data from Trading Economics API"

But the actual data source was changed to **Forex Factory** (`nfs.faireconomy.media`). This is misleading to the user.

**Fix:** Update to "Data from Forex Factory. AI analysis is for informational purposes only."

---

### ISSUE 3: Duplicate Hook Pattern (Cleanup)

**Files:**
- `src/features/calendar/useEconomicCalendar.ts` -- Used by CalendarTab, ContextWarnings, EquityCurveWithEvents, useCaptureMarketContext
- `src/hooks/use-economic-events.ts` -- Used only by TradingHeatmap

Both hooks call the same edge function `economic-calendar`. The second hook (`useEconomicEvents`) adds date filtering logic that doesn't actually work (see Bug 1). After fixing Bug 1, `useEconomicEvents` becomes a thin wrapper around the same data.

**Fix:** After Bug 1 fix, refactor `useHighImpactEventDates` and `isHighImpactEventDay` to consume data from `useEconomicCalendar` instead. Then delete `use-economic-events.ts` to eliminate the duplicate data-fetching path.

---

## No Mode-Related Issues

The Economic Calendar has **zero mode-related inconsistencies** because:
1. All data is from public Forex Factory API -- no user trade data
2. No account-specific queries or `trade_entries` reads
3. AI predictions are generic market analysis, not user-specific

---

## Implementation Summary

| File | Action | Detail |
|------|--------|--------|
| `src/hooks/use-economic-events.ts` | Refactor | Remove body params from edge function call; make `useHighImpactEventDates` consume `useEconomicCalendar` data instead of separate fetch |
| `src/components/market-insight/CalendarTab.tsx` | Fix line 319 | Update "Trading Economics API" to "Forex Factory" |
| `src/components/analytics/charts/TradingHeatmap.tsx` | Update import | Use refactored hook |

Total: 1 bug fix (silent param ignore), 1 copy fix, 1 cleanup refactor. No structural changes needed.
