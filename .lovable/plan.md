

# Harden Regime Engine: Fix Double-Counting, Add Statistical Rigor, Correct Evaluation Order

Six targeted fixes to address the critical feedback on the regime classification system.

---

## Problem Analysis

| Issue | Current Code | Risk |
|-------|-------------|------|
| Double-counting: Event Risk | `market-scoring.ts` penalizes event risk in composite score (line 74-78) AND `regime-classification.ts` uses event risk as regime override (line 93) | Event risk is weighted twice -- overweight |
| Double-counting: Volatility | `market-scoring.ts` has no direct volatility in composite, but `regime-classification.ts` uses `volatilityLevel` as override AND range multiplier | Less severe, but range calc uses volatility twice |
| Evaluation order wrong | Composite check (line 101-108) runs BEFORE volatility check (line 96-99) in `determineRegime` | Score=68 + FOMC in 6h + 3x vol = TRENDING_BULL instead of HIGH_VOL |
| Composite too linear | `calculateComposite` in regime-classification.ts (line 67-74) is a simple weighted average with no event/volatility influence -- separate from `market-scoring.ts` weights | Two different composite formulas exist |
| Volume detection not statistical | `calculateWhaleSignal` uses `volume_today / prev_24h_volume` ratio, not percentile rank | Spike vs average is not a statistical anomaly |
| Momentum inflates range | `calculateExpectedRange` uses momentum as additive skew (0.3), not multiplicative | Minor, but momentum should skew direction, not expand range symmetrically |

---

## Changes

### 1. Fix Double-Counting: Remove Event Risk from Composite Score

**File:** `src/lib/regime-classification.ts` -- `calculateComposite()`

The regime engine has its own composite that does NOT include event risk (correct). But `market-scoring.ts` `calculateCompositeScore()` DOES include event risk penalty. Since `market-scoring.ts` is used by the `UnifiedMarketContext` capture system (trade entry), and `regime-classification.ts` is used by the RegimeCard, they are separate paths -- no double-counting in the regime path.

However, the weights differ:
- `regime-classification.ts`: technical 0.35, onChain 0.20, macro 0.25, fearGreed 0.20
- `market-scoring.ts`: technical 0.25, onChain 0.15, fearGreed 0.15, macro 0.15, eventRisk 0.15, momentum 0.15

**Fix:** Unify composite weights. The regime engine composite should be the single formula. Remove event risk and volatility from the composite entirely -- they belong ONLY as regime overrides. Document this explicitly.

Updated `calculateComposite()`:
```typescript
function calculateComposite(input: RegimeInput): number {
  // Pure signal composite -- event risk and volatility are NOT included here
  // They act as regime overrides only, preventing double-counting
  const technical = input.technicalScore * 0.35;
  const onChain = input.onChainScore * 0.20;
  const macro = input.macroScore * 0.25;
  const fearGreed = input.fearGreedValue * 0.20;
  return Math.round(technical + onChain + macro + fearGreed);
}
```
(No change needed here -- already correct. But add the documentation comment.)

Also update `market-scoring.ts` `calculateCompositeScore()` to remove eventRisk from the composite calculation and document it as "override-only":
- Remove lines 74-78 (event risk penalty from composite)
- Remove `eventRisk` from `WEIGHTS` constant
- Redistribute weight: technical 0.30, onChain 0.20, fearGreed 0.15, macro 0.20, momentum 0.15

### 2. Fix Evaluation Order in `determineRegime()`

**File:** `src/lib/regime-classification.ts` -- `determineRegime()`

Current order (WRONG):
1. Event risk check (RISK_OFF)
2. Volatility check (HIGH_VOL) -- but only if `alignment !== 'ALIGNED'`
3. Composite score check (TRENDING)
4. Default (RANGING)

The volatility check has a gap: `alignment === 'ALIGNED'` skips HIGH_VOL even when volatility is extreme. A trending bull with FOMC in 6h and 3x normal vol should NOT be AGGRESSIVE.

**Fix:** Tighten the volatility override -- remove the alignment exception for extreme volatility:

```typescript
function determineRegime(compositeScore, input, alignment): MarketRegime {
  // Priority 1: Event risk override (highest priority)
  if (input.eventRiskLevel === 'VERY_HIGH' || input.eventRiskLevel === 'HIGH') {
    return 'RISK_OFF';
  }
  // Priority 2: Extreme volatility override (no alignment exception)
  if (input.volatilityLevel === 'high') {
    return 'HIGH_VOL';
  }
  // Priority 3: Trending (requires conviction + alignment)
  const momentum = input.momentum24h ?? 0;
  if (compositeScore >= 65 && momentum > 0 && alignment !== 'CONFLICT') {
    return 'TRENDING_BULL';
  }
  if (compositeScore <= 35 && momentum < 0 && alignment !== 'CONFLICT') {
    return 'TRENDING_BEAR';
  }
  // Default
  return 'RANGING';
}
```

### 3. Add Risk Mode Guard for Volatility Spike

**File:** `src/lib/regime-classification.ts` -- `determineRiskMode()`

Current logic allows AGGRESSIVE when trending + aligned. But if volatility is extreme or event risk is HIGH, this is dangerous.

**Fix:** Add volatility/event guards:

```typescript
function determineRiskMode(regime, alignment, input): RiskMode {
  if (regime === 'RISK_OFF' || regime === 'HIGH_VOL') return 'DEFENSIVE';
  if (alignment === 'CONFLICT') return 'DEFENSIVE';
  // Guard: even if trending+aligned, extreme vol or high events force defensive
  if (input.volatilityLevel === 'high') return 'DEFENSIVE';
  if (input.eventRiskLevel === 'HIGH' || input.eventRiskLevel === 'VERY_HIGH') return 'DEFENSIVE';
  if ((regime === 'TRENDING_BULL' || regime === 'TRENDING_BEAR') && alignment === 'ALIGNED') return 'AGGRESSIVE';
  return 'NEUTRAL';
}
```

### 4. Fix Expected Range: Use Regime Multiplier, Momentum as Skew Only

**File:** `src/lib/regime-classification.ts` -- `calculateExpectedRange()`

Current: momentum adds flat +/-0.3 to both sides (expands range).
Fix: momentum only shifts the center (skew), does not expand total range.

```typescript
function calculateExpectedRange(input, regime): { low: number; high: number } {
  // ATR-based range (normalized %)
  let baseRange = 2.0;
  if (input.volatilityLevel === 'low') baseRange = 1.2;
  if (input.volatilityLevel === 'high') baseRange = 4.5;

  // Regime multiplier
  const regimeMultipliers: Record<string, number> = {
    HIGH_VOL: 2.0,
    RISK_OFF: 1.3,
    TRENDING_BULL: 1.4,
    TRENDING_BEAR: 1.4,
    RANGING: 0.8,
  };
  const multiplier = regimeMultipliers[regime] ?? 1.0;
  const range = baseRange * multiplier;

  // Momentum shifts center (skew), does NOT expand range
  const momentum = input.momentum24h ?? 0;
  const skew = Math.max(-0.5, Math.min(0.5, momentum * 0.05)); // Capped skew

  return {
    low: Math.round((-range + skew) * 10) / 10,
    high: Math.round((range + skew) * 10) / 10,
  };
}
```

### 5. Upgrade Volume Detection to Percentile-Based (Edge Function)

**File:** `supabase/functions/market-insight/index.ts` -- `calculateWhaleSignal()`

Current: compares 24h volume vs previous 24h volume (ratio).
Fix: compute percentile rank using all available klines data as rolling window.

```typescript
function calculateWhaleSignal(klines, change24h) {
  if (klines.length < 48) return { signal: 'NONE', ... };

  const recentVolume = klines.slice(0, 24).reduce((sum, k) => sum + parseFloat(String(k[5])), 0);
  
  // Build rolling 24h volume windows for percentile calculation
  const windowVolumes: number[] = [];
  for (let i = 0; i + 24 <= klines.length; i += 24) {
    const windowVol = klines.slice(i, i + 24).reduce((sum, k) => sum + parseFloat(String(k[5])), 0);
    windowVolumes.push(windowVol);
  }
  
  // Percentile rank: % of historical windows below current
  const below = windowVolumes.filter(v => v < recentVolume).length;
  const percentileRank = windowVolumes.length > 1 
    ? Math.round((below / (windowVolumes.length - 1)) * 100)  // exclude self
    : 50;
  
  const volumeChange = windowVolumes.length > 1
    ? ((recentVolume - windowVolumes[1]) / windowVolumes[1]) * 100  // vs previous window
    : 0;

  let signal = 'NONE';
  let confidence = 40;
  let method = `P${percentileRank} vs ${windowVolumes.length} windows`;

  // Statistical anomaly = >95th percentile
  if (percentileRank >= 95 && change24h > 2) {
    signal = 'ACCUMULATION';
    confidence = 70 + Math.min(20, (percentileRank - 95) * 4);
    method = `Vol P${percentileRank} (>P95 anomaly) + Price +${change24h.toFixed(1)}%`;
  } else if (percentileRank >= 95 && change24h < -2) {
    signal = 'DISTRIBUTION';
    confidence = 70 + Math.min(20, (percentileRank - 95) * 4);
    method = `Vol P${percentileRank} (>P95 anomaly) + Price ${change24h.toFixed(1)}%`;
  }

  return { signal, volumeChange, confidence, method, thresholds: `P95 threshold, ${windowVolumes.length} samples`, percentileRank };
}
```

Add `percentileRank` to the whale activity response object and update the WhaleTrackingWidget to display it.

### 6. Add `regimeScore` Mathematical Definition

**File:** `src/lib/regime-classification.ts`

Currently `regimeScore` is not emitted. The composite score IS the regime score. Make this explicit by adding it to the output:

Add `regimeScore: number` to `RegimeOutput` (equals `compositeScore` from `calculateComposite`). This is the ONLY score the system exposes -- all other scores (technical, macro, fearGreed) are breakdown components, not independent scores.

---

## Files Modified

| File | Change |
|------|--------|
| `src/lib/regime-classification.ts` | Fix eval order, add vol/event guards to riskMode, fix expected range skew, add regimeScore, add documentation |
| `src/lib/market-scoring.ts` | Remove eventRisk from composite (override-only), redistribute weights |
| `supabase/functions/market-insight/index.ts` | Upgrade volume detection to percentile-based with rolling windows |
| `src/components/market/WhaleTrackingWidget.tsx` | Display percentile rank (P97 vs 8 windows) |
| `src/components/market-insight/RegimeCard.tsx` | Show regimeScore in breakdown footer |
| `src/features/market-insight/types.ts` | Add `percentileRank` to `WhaleActivity` interface |

---

## Double-Counting Audit Summary

| Factor | In Composite? | As Override? | Status |
|--------|:---:|:---:|--------|
| Technical Score | Yes (0.35) | No | Clean |
| On-Chain Score | Yes (0.20) | No | Clean |
| Macro Score | Yes (0.25) | No | Clean |
| Fear/Greed | Yes (0.20) | No | Clean |
| Event Risk | No (removed from composite) | Yes (RISK_OFF override) | Fixed -- was double-counted in market-scoring.ts |
| Volatility | No | Yes (HIGH_VOL override + range multiplier) | Clean |
| Momentum | No | Yes (range skew only) | Clean |

