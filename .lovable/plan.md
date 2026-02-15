

# Upgrade Economic Calendar: From "Informasi Menarik" to Actionable Trigger

The current `historicalStats` only shows `avgBtcMove2h`, `sampleSize`, and `volatilitySpikeProb`. This upgrade adds **directional distribution**, **move probability thresholds**, **percentile extremes**, and **median/worst-case stats** so every event becomes a quantified trigger.

---

## What Changes

### 1. Expand `EVENT_HISTORICAL_STATS` data structure (Edge Function)

Each event entry in `supabase/functions/economic-calendar/index.ts` gets new fields:

```
Current:  { avgBtcMove2h: 2.3, sampleSize: 60, volatilitySpikeProb: 68 }

Upgraded: {
  avgBtcMove2h: 2.3,
  medianBtcMove2h: 1.7,
  maxBtcMove2h: 5.8,
  worstCase2h: -3.9,
  upsideBias: 68,          // % of times BTC moved up after event
  probMoveGt2Pct: 82,      // % probability move exceeds 2%
  sampleSize: 60,
  volatilitySpikeProb: 68,
}
```

All 15 event types in `EVENT_HISTORICAL_STATS` will be updated with these fields.

### 2. Update `ProcessedEvent` interface (Edge Function)

The `historicalStats` field in the `ProcessedEvent` interface expands to include the new properties.

### 3. Update Frontend Types

In `src/features/calendar/types.ts`, the `EconomicEvent.historicalStats` interface expands to match:

```typescript
historicalStats?: {
  avgBtcMove2h: number;
  medianBtcMove2h: number;
  maxBtcMove2h: number;
  worstCase2h: number;
  upsideBias: number;
  probMoveGt2Pct: number;
  sampleSize: number;
  volatilitySpikeProb: number;
} | null;
```

### 4. Upgrade CalendarTab UI

Replace the single-line historical stats display with a richer stats block:

**Current display:**
```
BTC avg move: +2.3% in 2h | Vol spike prob: 68% | (n=60)
```

**New display:**
```
82% prob BTC move >2% in 2h | 68% historical upside bias
Median move: +1.7% | Worst case: -3.9% | (n=60)
```

The stats area in `CalendarTab.tsx` (lines 306-318) will be replaced with a two-row layout showing:
- Row 1: Probability of significant move + directional bias
- Row 2: Median move + worst case scenario + sample size

Color coding:
- `probMoveGt2Pct >= 70%` = red/destructive badge (high volatility expected)
- `upsideBias >= 60%` = green tint, `<= 40%` = red tint, else neutral

---

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/economic-calendar/index.ts` | Expand `EVENT_HISTORICAL_STATS` with 5 new fields per event, update `ProcessedEvent` interface |
| `src/features/calendar/types.ts` | Add `medianBtcMove2h`, `maxBtcMove2h`, `worstCase2h`, `upsideBias`, `probMoveGt2Pct` to `historicalStats` |
| `src/components/market-insight/CalendarTab.tsx` | Replace single-line stats with two-row actionable display |

---

## Technical Notes

- The historical data is static/hardcoded (based on aggregated 2020-2025 BTC reactions). No new database tables needed.
- The edge function already has `matchHistoricalStats()` which maps event titles to stats -- it just returns more fields now.
- Backward compatible: old clients seeing new fields will simply ignore them; the UI gracefully handles missing fields with optional chaining.

