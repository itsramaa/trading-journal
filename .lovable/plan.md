

# Economic Calendar --> Volatility Engine

Transform the Economic Calendar from a simple event list into a full **Volatility Engine** that outputs event-driven move probabilities, expected price ranges, risk regime classification, and concrete position sizing adjustments.

---

## What Changes

### 1. New Data Model: Volatility Engine Output

The edge function response gets a new top-level `volatilityEngine` object alongside existing `events` and `impactSummary`:

```
volatilityEngine: {
  riskRegime: 'EXTREME' | 'HIGH' | 'ELEVATED' | 'NORMAL' | 'LOW',
  regimeScore: 0-100,
  expectedRange2h: { low: -4.5, high: +3.8 },   // BTC % range
  expectedRange24h: { low: -6.2, high: +5.1 },
  compositeMoveProbability: 78,                    // % chance of >2% move today
  positionSizeMultiplier: 0.5,                     // direct multiplier for risk
  positionSizeReason: 'FOMC + CPI cluster = reduce 50%',
  eventCluster: {                                  // stacked event detection
    count: 2,
    within24h: true,
    amplificationFactor: 1.4                       // stacked events amplify vol
  }
}
```

### 2. Edge Function: Volatility Engine Calculator (economic-calendar/index.ts)

Add a `calculateVolatilityEngine()` function that:

- **Move Probability**: Aggregates `probMoveGt2Pct` from all today's events using probability union formula: `P(A or B) = 1 - (1-P(A)) * (1-P(B))` for stacked events
- **Expected Range**: Computes 2h and 24h expected BTC price ranges using `maxBtcMove2h`, `worstCase2h`, and event clustering amplification
- **Risk Regime**: Classifies today into EXTREME/HIGH/ELEVATED/NORMAL/LOW based on composite probability and event count
- **Position Size Multiplier**: Maps regime to a concrete multiplier (EXTREME=0.25, HIGH=0.5, ELEVATED=0.7, NORMAL=1.0, LOW=1.1) -- these values are added to the shared constants file
- **Event Clustering**: Detects multiple high-impact events within 24h and applies amplification factor (1.2x for 2 events, 1.4x for 3+)

### 3. Shared Constants: Volatility Engine Config

Add to `supabase/functions/_shared/constants/economic-calendar.ts` and mirror in `src/lib/constants/economic-calendar.ts`:

```typescript
VOLATILITY_ENGINE = {
  REGIME_THRESHOLDS: {
    EXTREME: { minProbability: 85, minHighEvents: 2 },
    HIGH: { minProbability: 70, minHighEvents: 1 },
    ELEVATED: { minProbability: 50, minHighEvents: 0 },
    NORMAL: { minProbability: 0, minHighEvents: 0 },
    LOW: { maxEvents: 0 },
  },
  POSITION_MULTIPLIERS: {
    EXTREME: 0.25,
    HIGH: 0.5,
    ELEVATED: 0.7,
    NORMAL: 1.0,
    LOW: 1.1,
  },
  CLUSTER_AMPLIFICATION: {
    TWO_EVENTS: 1.2,
    THREE_PLUS: 1.4,
  },
  RANGE_EXPANSION: {
    CLUSTER_FACTOR: 1.3,
    BASE_24H_MULTIPLIER: 1.8,
  },
}
```

### 4. Frontend Types (src/features/calendar/types.ts)

Add new interfaces:

```typescript
interface VolatilityEngine {
  riskRegime: 'EXTREME' | 'HIGH' | 'ELEVATED' | 'NORMAL' | 'LOW';
  regimeScore: number;
  expectedRange2h: { low: number; high: number };
  expectedRange24h: { low: number; high: number };
  compositeMoveProbability: number;
  positionSizeMultiplier: number;
  positionSizeReason: string;
  eventCluster: {
    count: number;
    within24h: boolean;
    amplificationFactor: number;
  };
}
```

Add `volatilityEngine: VolatilityEngine | null` to `EconomicCalendarResponse`.

### 5. CalendarTab UI: Volatility Engine Dashboard Card

Add a new prominent card at the top of CalendarTab (above the event list) when `volatilityEngine` is present:

**Layout:**

```
+-----------------------------------------------+
| VOLATILITY ENGINE          Risk Regime: HIGH   |
|                                                 |
| [====== 78% ======] Composite Move Probability  |
|                                                 |
| Expected Range (2h):  -4.5% to +3.8%           |
| Expected Range (24h): -6.2% to +5.1%           |
|                                                 |
| Position Size: 0.5x (reduce 50%)               |
| Reason: FOMC + CPI cluster = reduce 50%        |
|                                                 |
| Event Cluster: 2 high-impact within 24h        |
| Amplification: 1.4x volatility boost           |
+-----------------------------------------------+
```

Color scheme by regime:
- EXTREME: red bg, pulsing border
- HIGH: orange/amber bg
- ELEVATED: yellow tint
- NORMAL: default card
- LOW: green tint

The progress bar for composite move probability uses gradient coloring (green <40%, yellow 40-70%, red >70%).

### 6. Connect to Existing Risk System

The `useContextAwareRisk` hook already has an `event` multiplier factor. Update the `useEconomicCalendar` hook to expose `volatilityEngine.positionSizeMultiplier` so that the risk calculator can consume it directly instead of the current binary "has high impact event" boolean. This is a non-breaking enhancement -- the existing `EVENT_MULTIPLIERS.HIGH_IMPACT` in `risk-multipliers.ts` becomes a fallback when calendar data is unavailable.

---

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/_shared/constants/economic-calendar.ts` | Add `VOLATILITY_ENGINE` config block with regime thresholds, position multipliers, cluster amplification |
| `src/lib/constants/economic-calendar.ts` | Mirror `VOLATILITY_ENGINE` constants for frontend use |
| `supabase/functions/economic-calendar/index.ts` | Add `calculateVolatilityEngine()` function, include `volatilityEngine` in response |
| `src/features/calendar/types.ts` | Add `VolatilityEngine` interface, update `EconomicCalendarResponse` |
| `src/components/market-insight/CalendarTab.tsx` | Add Volatility Engine dashboard card above event list |

---

## Technical Notes

- **Probability math**: Stacked events use union probability `1 - product(1 - P_i)` -- not simple addition -- to avoid exceeding 100%.
- **Range calculation**: Uses `worstCase2h` for downside, `maxBtcMove2h` for upside, with cluster amplification factor applied. 24h range = 2h range * `BASE_24H_MULTIPLIER`.
- **No new database tables**: All calculations are derived from the existing static `EVENT_HISTORICAL_STATS` data.
- **Backward compatible**: `volatilityEngine` is nullable in the response type; UI gracefully hides the card when null.
- **Edge function deploy**: The `economic-calendar` function will be redeployed with the new logic.

