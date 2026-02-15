

# Deep-Dive Analysis: Economic Calendar Page

---

## 1. Page Structure (`EconomicCalendar.tsx` + `CalendarTab.tsx`)

### A. Comprehensiveness

| Feature | Status | Notes |
|---------|--------|-------|
| Page header with icon/description | Done | PageHeader component |
| Error boundary with retry | Done | Key-based remount pattern |
| Volatility Engine card | Done | Risk regime, ranges, position sizing |
| Impact Alert banner | Done | Risk level with position adjustment advice |
| Today's Key Release card | Done | Highlight + countdown + AI prediction |
| Upcoming Events list | Done | Collapsible items with stats |
| Historical crypto correlation stats | Done | Per-event BTC move data |
| AI predictions (collapsible) | Done | Gemini-powered analysis |
| Loading skeletons | Done | 5 skeleton rows |
| Error state with retry | Done | "Try again" button |
| Empty state | Done | "No upcoming events this week" |
| Data attribution footer | Done | "Data from Forex Factory" |
| Auto-refresh (30m) | Done | via react-query refetchInterval |
| Manual refresh button | Done | With spinning icon feedback |

**Gaps:**

1. **No timezone indicator**: Event times display as "HH:mm UTC" (line 384), but the `formatEventTime` function (line 157-159) uses the browser's local `new Date()` with `format(date, 'HH:mm')`, which outputs LOCAL time, not UTC. The "UTC" label is misleading -- this is a bug.

2. **No event filtering/search**: Users cannot filter events by importance level (high/medium/low) or search by event name. With up to 15 events, a filter toggle would improve usability.

3. **"Today's Key Release" only shows one event**: If there are multiple high-impact events today (e.g., CPI + Core CPI), only the first is highlighted. The rest require scrolling through the list.

4. **No "past event" visual distinction**: Events that have already occurred (with `actual` values) look the same as upcoming events in the list. A subtle visual cue (e.g., reduced opacity or a "Released" badge) would help.

5. **Volatility Engine card not shown when no events in window**: When `volatilityEngine` is `null` (no events within 48h), the card disappears entirely. An empty/calm state card saying "No significant events -- normal volatility expected" would maintain layout stability per the UX standard.

### B. Accuracy

| Check | Result |
|-------|--------|
| Composite Move Probability formula | Correct -- correlation-adjusted union: `1 - product(1 - P_i * weight * decay)` |
| Time-decay weighting | Correct -- exponential decay for future (0-48h), linear for past (0-2h) |
| Correlation dampening | Correct -- uses `CORRELATION_GROUPS` and `0.4` dampener for correlated pairs |
| Small sample compression | Correct -- 0.75x factor when min sample < 30 |
| Expected range blend | Correct -- 70% median + 30% extreme |
| Realized vol floor | Correct -- daily vol from annual: `realizedVolPct / sqrt(365)` |
| Risk regime classification | Correct -- thresholds from constants |
| Position size multiplier | Correct -- maps from regime to multiplier |
| Event cluster amplification | Correct -- 1.2x for 2 events, 1.4x for 3+ |
| Impact summary risk level | Correct -- delegates to `calculateRiskLevel()` |
| Historical stats matching | Correct -- keyword matching with static dataset |

**Gaps:**

6. **`realizedVolPct` is never passed from the page**: The `EconomicCalendar.tsx` page calls `useEconomicCalendar()` with no arguments (line 141 of CalendarTab via import). The `realizedVolPct` parameter defaults to `0`, meaning the realized volatility floor is never applied on this page. The floor is only used when `useEconomicCalendar(realizedVolPct)` is called from other consumers (like the heatmap). This means the expected ranges shown on the Calendar page may be narrower than reality during volatile periods.

7. **"Median move" display always shows positive sign**: Line 428 displays `+{event.historicalStats.medianBtcMove2h.toFixed(1)}%` with a hardcoded `+` prefix. The median move is an absolute value representing magnitude, but showing it with `+` implies directional upside, which is misleading. It should be displayed without a sign or labeled "Median |move|".

8. **`timeUntil` does not update in real-time**: The countdown badge (e.g., "2h 30m") is computed server-side at fetch time and cached for 15 minutes (`staleTime`). It becomes stale quickly. A client-side countdown timer would be more accurate.

### C. Clarity and Readability

**Missing tooltips:**

9. **"Volatility Engine" card title** -- No tooltip explaining what this card represents. Should say: "Event-driven volatility assessment using historical BTC reactions to macro events. Updates based on events within a rolling 48-hour window."

10. **"Composite Move Probability"** -- Has "(correlation-adjusted)" tag but no tooltip explaining the formula or what the percentage means. Should say: "Probability of BTC moving >2% within 2 hours of upcoming events. Adjusted for correlated events (e.g., CPI + Core CPI count as ~1.4 events, not 2)."

11. **"Expected Range (2h)"** -- Has "median + 90th pct blend" sub-label but no tooltip. Should explain: "Estimated BTC price range 2 hours after event release. Calculated as 70% median historical move + 30% extreme historical move."

12. **"Expected Range (24h)"** -- No sub-label or tooltip. Should say: "24-hour expected range, derived from 2h range x 1.8 multiplier. Floored by current realized daily volatility."

13. **"Position Size: Nx"** -- No tooltip on the multiplier. Should say: "Recommended position size adjustment relative to your normal size. 0.5x means use half your usual position size."

14. **"Event Cluster" warning** -- No tooltip explaining what "amplification" means. Should say: "Multiple high-impact events in the same window amplify expected volatility beyond the sum of individual events."

15. **Risk level badge** (EXTREME/HIGH/etc.) -- No tooltip. Should explain each regime briefly.

16. **"AI Powered" badge** on Upcoming Events -- No tooltip. Should say: "AI predictions are generated by Gemini for high-impact events only. Limited to top 5 events per refresh."

17. **Importance dot colors** -- The colored dots (red/yellow/green) have no legend or tooltip. Users must guess what each color means. Should add a small legend or tooltip on hover.

18. **"prob BTC move >2% in 2h" badge** -- No tooltip explaining this is based on historical data. Should say: "Based on N historical occurrences of this event type (2020-2025)."

19. **"historical upside bias" badge** -- No tooltip. Should say: "Percentage of historical occurrences where BTC moved upward after this event. 50% = neutral, >60% = historically bullish."

20. **"Worst case" stat** -- No tooltip explaining this is worst observed, not theoretical worst. Should say: "Largest observed BTC decline within 2 hours of this event type historically."

21. **Sample size "(n=X)"** -- No tooltip. Should say: "Number of historical event occurrences used for these statistics. Higher sample sizes provide more reliable estimates."

22. **"Today's Key Release" card** -- No tooltip on the card title explaining selection criteria. Should say: "The highest-impact economic event scheduled for today. If multiple high-impact events exist, the first one is shown."

23. **Forecast/Previous/Actual labels** -- No tooltips in the event list rows. Should explain: Forecast = market consensus estimate, Previous = last release value, Actual = released value (if available).

### D. Code Quality

24. **Duplicated refresh button logic**: Lines 172-204 have two nearly identical refresh button blocks (one for `!hideTitle`, one for `hideTitle`). Should be extracted to a single block rendered in both cases.

25. **`formatEventDate` timezone issue**: Uses `new Date(dateString)` which depends on the browser's timezone interpretation. If the API returns dates without timezone info, the "Today"/"Tomorrow" logic could be wrong for users in different timezones.

26. **`VolatilityEngineCard` has `animate-pulse` for EXTREME regime**: While attention-grabbing, a perpetually pulsing card can be distracting and may trigger motion sensitivity issues. Should use `prefers-reduced-motion` media query.

27. **No memoization**: `CalendarTab` recalculates `formatEventDate` and `formatEventTime` on every render. These could be memoized or extracted as pure utility functions outside the component.

28. **Edge function error returns HTTP 200**: Line 551 returns status 200 even on error, with empty data + error message in body. This makes it harder to distinguish real failures from empty data in client-side error handling.

---

## 2. Edge Function (`economic-calendar/index.ts`)

### A. Comprehensiveness

| Feature | Status |
|---------|--------|
| JWT auth check | Done |
| Forex Factory data fetch | Done |
| Country/importance filtering | Done |
| Historical stats matching | Done |
| AI prediction generation | Done |
| Volatility engine calculation | Done |
| Risk level assessment | Done |
| Today highlight extraction | Done |
| Graceful error fallback | Done |

**Gaps:**

29. **No caching**: Every authenticated request hits Forex Factory's API. With 15-minute `staleTime` on the client, multiple users hitting the endpoint within that window each trigger a separate external API call. A server-side cache (even in-memory for 5 minutes) would reduce external calls.

30. **AI prediction matching is fragile**: Line 377-380 uses `includes()` for fuzzy matching between AI response event names and processed event names. If the AI rephrases "Non-Farm Employment Change" as "NFP", the match fails silently.

### B. Accuracy -- covered above in section 1B.

---

## 3. Summary of Recommendations

### Priority 1 -- Bugs

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | "UTC" label on local time | `CalendarTab.tsx:384` | Remove "UTC" suffix or convert to actual UTC display |
| 7 | Hardcoded `+` on median move | `CalendarTab.tsx:428` | Display as absolute value: `+-{val}%` or `|{val}|%` |

### Priority 2 -- Missing Tooltips (Clarity)

| # | Element | Tooltip Content |
|---|---------|-----------------|
| 9 | Volatility Engine title | "Event-driven volatility model using historical BTC reactions to US macro events within a rolling 48-hour window." |
| 10 | Composite Move Probability | "Probability of BTC moving >2% within 2h of events. Correlation-adjusted so related events (CPI + Core CPI) aren't double-counted." |
| 11 | Expected Range (2h) | "Estimated BTC range after event: 70% median + 30% extreme historical move, adjusted for event clustering." |
| 12 | Expected Range (24h) | "24-hour range estimate. 2h range x 1.8, floored by current realized daily volatility." |
| 13 | Position Size multiplier | "Recommended position size relative to normal. 0.5x = use half your usual size during this risk regime." |
| 14 | Event Cluster warning | "Multiple high-impact events amplify volatility beyond individual event impact." |
| 15 | Risk regime badge | Brief description per regime level |
| 16 | "AI Powered" badge | "AI predictions generated for top 5 high-impact events using Gemini." |
| 17 | Importance dots | Add legend or tooltip: red = high, yellow = medium, green = low |
| 18 | prob BTC move badge | "Based on N historical occurrences (2020-2025 data)." |
| 19 | Upside bias badge | "% of times BTC moved up after this event. >60% = historically bullish." |
| 20 | Worst case stat | "Largest observed BTC decline within 2h of this event type." |
| 21 | Sample size (n=X) | "Number of historical data points. Higher = more reliable." |
| 22 | Today's Key Release title | "Highest-impact event scheduled for today." |
| 23 | Forecast/Previous/Actual | Brief explanations for each data point |

### Priority 3 -- Comprehensiveness Gaps

| # | Gap | Fix |
|---|-----|-----|
| 5 | Volatility Engine disappears when null | Show a "calm state" card instead |
| 8 | Stale `timeUntil` countdown | Add client-side countdown interval |
| 4 | No visual distinction for past events | Add "Released" badge or reduced opacity |

### Priority 4 -- Code Quality

| # | Issue | Fix |
|---|-------|-----|
| 24 | Duplicated refresh button | Extract to single block |
| 26 | `animate-pulse` motion sensitivity | Wrap with `motion-safe:animate-pulse` |
| 27 | No memoization of format functions | Move to module-level pure functions |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/market-insight/CalendarTab.tsx` | Fix UTC label (P1), fix median sign (P1), add all tooltips (P2), add calm-state card (P3), add past-event styling (P3), client-side countdown (P3), deduplicate refresh button (P4), motion-safe class (P4) |
| `src/features/calendar/types.ts` | No changes needed |
| `src/features/calendar/useEconomicCalendar.ts` | No changes needed |
| `supabase/functions/economic-calendar/index.ts` | No changes needed (AI matching and caching are noted but lower priority) |

