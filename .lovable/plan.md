

# Unified Risk Orchestration & Calendar Engine Fixes

This plan addresses 7 interconnected issues to create a coherent risk system where calendar, regime, and volatility engines produce unified outputs.

---

## Problem Root Causes

| Issue | Root Cause | Location |
|-------|-----------|----------|
| Calendar probability 0% | `calculateVolatilityEngine()` filters `isToday(e.date)` only -- upcoming FOMC/GDP within 24h are excluded | `economic-calendar/index.ts` line 135 |
| "6 events" vs "no events" UX conflict | Impact summary counts all week events, but volatility engine only processes today | Same function, two different scopes |
| Volume "8 samples" | `KLINES_LIMIT: 200` in `market-config.ts` = 200 hourly candles = 8 days. Rolling window yields ~177 samples, but 200h is still too small for robust P95 | `_shared/constants/market-config.ts` line 21 |
| Calendar ignores realized volatility | Calendar expected range is purely event-driven. No ATR/vol floor | `economic-calendar/index.ts` `calculateVolatilityEngine()` |
| 3 independent position sizes | Calendar, Regime, and useContextAwareRisk each compute their own multiplier independently | Multiple files |
| Fear and Greed linear | F&G = 8 (extreme fear) treated with flat 20% weight, no asymmetric behavior | `regime-classification.ts` `calculateComposite()` |
| Regime not aware of calendar | RegimeCard does not receive `eventRiskLevel` from calendar data | `RegimeCard.tsx` line 41 |

---

## Changes

### 1. Fix Calendar: Rolling 24h Window Instead of "Today Only"

**File:** `supabase/functions/economic-calendar/index.ts`

Replace `isToday()` filter in `calculateVolatilityEngine()` with a rolling 24h window:

```typescript
function isWithin24h(dateString: string): boolean {
  const eventTime = new Date(dateString).getTime();
  const now = Date.now();
  // Events in the past 2h (still affecting vol) or next 22h
  return eventTime >= now - (2 * 60 * 60 * 1000) && eventTime <= now + (22 * 60 * 60 * 1000);
}
```

Update `calculateVolatilityEngine()`:
- Replace `events.filter(e => isToday(e.date))` with `events.filter(e => isWithin24h(e.date))`
- This ensures FOMC in 6h, GDP tomorrow morning, etc. are included in probability calculations
- The "6 high-impact events detected" vs "no events today" UX conflict resolves naturally: window shows what is actionable

Also update `calculateRiskAdjustment()` to use the same rolling window for `todayHighImpact`.

### 2. Add Realized Volatility Floor to Calendar Range

**File:** `supabase/functions/economic-calendar/index.ts`

When volatility engine returns LOW regime with tiny ranges, but realized volatility is extreme, the range should have a floor.

The calendar edge function does not currently have access to realized volatility. Two options:

**Option chosen: Accept a `realizedVolPct` parameter from the client.**

The client already has volatility data from the market-insight response. Pass it when calling the calendar:
- In `useEconomicCalendar.ts`, pass the BTC annualized volatility (if available) as a query param
- In the edge function, use it as a floor:

```typescript
// After calculating event-based range
const volFloor = realizedVolPct ? realizedVolPct / Math.sqrt(365) : 0; // daily vol approx
const finalRange24h = {
  low: Math.min(expectedRange24h.low, -volFloor),
  high: Math.max(expectedRange24h.high, volFloor),
};
```

This ensures the calendar never shows +/-1% when realized daily vol is 4%+.

### 3. Increase Klines Limit for Volume Percentile

**File:** `supabase/functions/_shared/constants/market-config.ts`

Change `KLINES_LIMIT` from `200` to `720` (30 days of hourly data).

This gives `720 - 24 + 1 = 697` rolling windows for percentile calculation -- statistically robust for P95.

Going higher (e.g., 2160 for 90d) risks Binance API rate limits and response size. 720 is a practical balance: sufficient for reliable percentiles without excessive API load.

### 4. Non-Linear Fear and Greed in Composite

**File:** `src/lib/regime-classification.ts` -- `calculateComposite()`

Replace linear F&G weight with asymmetric scaling:

```typescript
// Fear & Greed non-linear transformation
// Extreme fear (<20) and extreme greed (>80) should have outsized influence
function transformFearGreed(fg: number): number {
  if (fg <= 20) {
    // Extreme fear: amplify signal (historically = bottoming zone)
    // Map 0-20 to 0-15 (compressed low range, strong bearish signal)
    return fg * 0.75;
  }
  if (fg >= 80) {
    // Extreme greed: amplify signal (historically = topping zone)
    // Map 80-100 to 85-100 (compressed high range, strong bullish but risky)
    return 85 + (fg - 80) * 0.75;
  }
  // Normal range: linear pass-through
  return fg;
}
```

Use `transformFearGreed(input.fearGreedValue)` instead of raw `input.fearGreedValue` in the composite calculation.

This means F&G = 8 becomes ~6 (stronger bearish pull), while F&G = 50 stays 50. The divergence penalty then catches the conflict between Tech 76 and transformed F&G 6 more aggressively.

### 5. Feed Calendar Event Risk into Regime Engine

**File:** `src/components/market-insight/RegimeCard.tsx`

Currently RegimeCard does not pass `eventRiskLevel` to `classifyMarketRegime()`. It needs calendar data.

- Accept optional `calendarData` prop (from `useEconomicCalendar`)
- Map `impactSummary.riskLevel` to `eventRiskLevel` in the regime input
- This connects the calendar engine to the regime engine, so RISK_OFF triggers correctly

```typescript
interface RegimeCardProps {
  sentimentData?: MarketInsightResponse;
  macroData?: MacroAnalysisResponse;
  calendarData?: EconomicCalendarResponse; // NEW
  isLoading: boolean;
  onRefresh: () => void;
  error?: Error | null;
}
```

In the `classifyMarketRegime()` call, add:
```typescript
eventRiskLevel: calendarData?.impactSummary?.riskLevel ?? 'LOW',
```

Update `MarketInsight.tsx` to pass calendar data to RegimeCard.

### 6. Create Unified Risk Orchestrator

**New file:** `src/lib/unified-risk-orchestrator.ts`

A single function that combines all three risk signals into one final multiplier:

```typescript
interface RiskInputs {
  calendarMultiplier: number;    // from volatility engine positionSizeMultiplier
  regimeMultiplier: number;      // from regime sizePercent / 100
  volatilityMultiplier: number;  // from useContextAwareRisk volatilityMultiplier
}

function calculateFinalPositionMultiplier(inputs: RiskInputs): {
  finalMultiplier: number;
  dominantFactor: string;
  breakdown: RiskInputs;
} {
  // Take the MINIMUM (most conservative) as the final multiplier
  // This ensures no single engine can override the others' caution
  const finalMultiplier = Math.min(
    inputs.calendarMultiplier,
    inputs.regimeMultiplier,
    inputs.volatilityMultiplier
  );

  // Identify which factor is most restrictive
  let dominantFactor = 'regime';
  if (finalMultiplier === inputs.calendarMultiplier) dominantFactor = 'calendar';
  if (finalMultiplier === inputs.volatilityMultiplier) dominantFactor = 'volatility';

  return { finalMultiplier, dominantFactor, breakdown: inputs };
}
```

### 7. Display Unified Position Size in RegimeCard

**File:** `src/components/market-insight/RegimeCard.tsx`

Update to use the orchestrator's unified multiplier instead of the regime-only size.

Show the breakdown in the footer:
```
Size: Reduce 50% | Calendar 1.0x | Regime 0.7x | Vol 0.5x (dominant)
```

This makes it transparent which engine is driving the position sizing.

---

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/economic-calendar/index.ts` | Rolling 24h window, realized vol floor, fix probability 0% bug |
| `supabase/functions/_shared/constants/market-config.ts` | `KLINES_LIMIT: 200` to `720` |
| `src/lib/regime-classification.ts` | Non-linear F&G transform in composite |
| `src/lib/unified-risk-orchestrator.ts` | **NEW** -- min(calendar, regime, vol) position sizing |
| `src/components/market-insight/RegimeCard.tsx` | Accept calendar data, use unified orchestrator, show breakdown |
| `src/pages/MarketInsight.tsx` | Pass calendar data to RegimeCard |
| `src/features/calendar/useEconomicCalendar.ts` | (Optional) Pass realized vol to calendar endpoint |

---

## Fix Verification Matrix

| Bug | Fix | Expected Result |
|-----|-----|----------------|
| Probability 0% with 6 events | Rolling 24h window replaces `isToday()` | Events within 24h contribute to probability |
| Calendar LOW + Volatility EXTREME | Realized vol floor on calendar range | Calendar range >= daily realized vol |
| Volume P95 with 8 samples | `KLINES_LIMIT: 720` = 697 rolling windows | Statistically robust percentile |
| 3 independent position sizes | `min(calendar, regime, vol)` orchestrator | Single unified output |
| F&G 8 barely affects composite | Non-linear transform amplifies extremes | F&G 8 becomes ~6, larger divergence penalty |
| Regime unaware of calendar events | Pass `calendarData` to RegimeCard | RISK_OFF triggers on event days |

