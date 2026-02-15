

# Fix Style-Aware Engine: 5 Corrections

Addresses statistical errors and architectural violations in the current style-aware implementation.

---

## Problems and Fixes

### 1. Composite Score Must Be Global (Not Style-Dependent)

**Problem:** `calculateComposite()` currently accepts `styleConfig` and shifts weights per style. This means the same market produces different regime classifications per style -- regime becomes "strategy-relative state" instead of "market state."

**Fix in `src/lib/regime-classification.ts`:**
- Remove `styleConfig` parameter from `calculateComposite()` -- always use the default balanced weights (0.35/0.20/0.25/0.20)
- Remove `styleConfig` parameter from `determineRegime()` -- regime classification is market-state only
- Keep `regimeRelevance` usage ONLY in `determineRegime` for controlling override sensitivity (RISK_OFF/HIGH_VOL triggers), NOT for changing the composite score
- Style context metadata (`styleContext`) still populates from config for UI labeling, but the score itself is invariant

**Result:** All three styles see the same regime (e.g., RANGING). Style only changes sizing, range display, and risk tolerance.

### 2. Range Multiplier: Use sqrt(hours/24), Not Hardcoded 0.12

**Problem:** Scalping uses `rangeBaseMultiplier: 0.12` but `sqrt(2/24) = 0.289`. Current value understates scalping volatility by ~2.4x.

**Fix in `src/lib/constants/trading-style-context.ts`:**

```
scalping:   rangeBaseMultiplier: 0.289  // sqrt(2/24)
short_trade: rangeBaseMultiplier: 0.577  // sqrt(8/24)
swing:       rangeBaseMultiplier: 1.0    // sqrt(24/24)
```

Add a comment documenting the formula: `rangeBaseMultiplier = sqrt(horizonHours / 24)`.

### 3. Orchestrator: Restore min() as Hard Floor

**Problem:** In adaptive mode, the orchestrator uses a pure weighted blend without any floor. Example: Cal=0.4, Reg=0.8, Vol=0.9 with scalping weights (0.1/0.3/0.6) produces 0.82 -- more than 2x the most cautious signal.

**Fix in `src/lib/unified-risk-orchestrator.ts`:**

In defensive mode, the current logic is already sound (blend floored by min). In adaptive mode, add a hard floor:

```typescript
// Adaptive mode
const weightedBlend = adaptiveCalendar * ow.calendar + regimeMultiplier * ow.regime + volatilityMultiplier * ow.volatility;
const hardFloor = Math.min(calendarMultiplier, regimeMultiplier, volatilityMultiplier);
// Never exceed blend, never go below 70% of the floor (adaptive allows some lift)
finalMultiplier = Math.min(weightedBlend, Math.max(hardFloor * 0.7 + weightedBlend * 0.3, hardFloor));
```

This preserves the adaptive lift for directional opportunities but ensures the most cautious signal still anchors the result.

### 4. Event Sensitivity: Decay Function Instead of Hard Cutoff

**Problem:** `eventSensitivityWindowHours` is used as a binary cutoff. An event at 3h01 for scalping is fully ignored; at 2h59 it has full weight.

**Fix in `src/lib/constants/trading-style-context.ts`:**
- Keep `eventSensitivityWindowHours` as the "full weight" window
- Document that consumers should apply exponential decay beyond it

**Fix in `src/lib/unified-risk-orchestrator.ts`** (or wherever calendar multiplier is consumed):
- Add a utility function:

```typescript
function eventDecayWeight(hoursToEvent: number, fullWeightWindow: number): number {
  if (hoursToEvent <= fullWeightWindow) return 1.0;
  // Exponential decay beyond window, half-life = 6h
  return Math.exp(-(hoursToEvent - fullWeightWindow) / 6);
}
```

- Apply this decay to the calendar multiplier before it enters the orchestrator blend, so events slightly beyond the window still have partial influence instead of zero.

### 5. Regime Relevance: Restrict to Override Sensitivity Only

**Problem:** `regimeRelevance` currently changes both regime overrides AND composite weights. The composite weight shift is the violation from point 1.

**Fix:** After point 1 is applied (composite becomes global), `regimeRelevance` only controls:
- Whether HIGH event risk triggers RISK_OFF (already correct in `determineRegime`)
- Whether high volatility triggers HIGH_VOL regime (already correct)

No other use. It does NOT change the composite score or regime thresholds.

---

## Files Modified

| File | Change |
|------|--------|
| `src/lib/regime-classification.ts` | Remove styleConfig from `calculateComposite()` and `determineRegime()` composite path; keep regimeRelevance for override sensitivity only |
| `src/lib/constants/trading-style-context.ts` | Fix rangeBaseMultiplier to sqrt(h/24); composite weights become documentation-only (not used in composite calculation) |
| `src/lib/unified-risk-orchestrator.ts` | Add hard floor in adaptive mode; add `eventDecayWeight()` utility |

---

## What Changes

| Before | After |
|--------|-------|
| Composite score differs per style | Composite score is global market state |
| Scalping range = 0.12x (too small) | Scalping range = 0.289x (statistically correct) |
| Adaptive blend can be 2x the min signal | Adaptive blend anchored to min() floor |
| Event sensitivity is binary cutoff | Smooth exponential decay beyond window |
| regimeRelevance shifts composite weights | regimeRelevance only controls overrides |

