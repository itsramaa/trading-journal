

# Style-Aware Risk Engine: Adaptive Outputs by Trading Timeframe

Make the regime engine and risk orchestrator produce timeframe-appropriate outputs based on the user's active trading style (Scalping / Short Trade / Swing).

---

## Core Concept

One engine, three context views. The same data sources feed different weight profiles and range horizons depending on the selected trading style.

---

## Changes

### 1. Create Trading Style Context Configuration

**New file:** `src/lib/constants/trading-style-context.ts`

Centralized weight profiles per style:

```
                Macro   Momentum   Volatility   Event
SCALPING         5%      50%        35%          10%
SHORT_TRADE     20%      35%        25%          20%
SWING           40%      20%        15%          25%
```

Also defines per-style:
- `rangeHorizonLabel`: "2h" / "8h" / "24h"
- `rangeBaseMultiplier`: how much of the 24h ATR-based range to show (0.12 for 2h, 0.4 for 8h, 1.0 for 24h)
- `eventSensitivityWindowHours`: 3 / 6 / 48
- `directionLabel`: "Direction (2h)" / "Direction (8h)" / "Direction (24h)"
- `regimeRelevance`: 'low' / 'medium' / 'high' -- controls whether regime overrides are strict or relaxed

### 2. Update Regime Classification to Accept Style Context

**File:** `src/lib/regime-classification.ts`

Add optional `tradingStyle` to `RegimeInput`. When provided:

- **Composite weights shift**: For scalping, technical/momentum dominate (macro nearly irrelevant). For swing, macro weight increases significantly.
- **Expected range scales**: Instead of always outputting 24h range, multiply by `rangeBaseMultiplier` from style config. Scalping sees a 2h expected range (~0.3-0.8%), swing sees the full 24h range.
- **Direction probability label**: Output includes the horizon context so UI can show "Direction (2h)" vs "Direction (24h)".
- **Regime override sensitivity**: For scalping, HIGH event risk within 3h triggers RISK_OFF, but events 12h+ away are ignored. For swing, the full 48h window applies.

Add `styleContext` to `RegimeOutput` containing `horizonLabel`, `rangeHorizon`, and applied weights for transparency.

### 3. Update Unified Risk Orchestrator for Style

**File:** `src/lib/unified-risk-orchestrator.ts`

Add optional `tradingStyle` to `RiskInputs`. When provided:

- **Scalping**: Volatility multiplier dominance. Calendar multiplier is almost ignored (events 12h+ away are irrelevant for a 5-minute scalp). Regime multiplier has reduced weight.
- **Swing**: Calendar and regime multipliers dominate. Volatility gets lower weight since swing positions can absorb short-term spikes.
- **Short Trade**: Current balanced behavior (no change needed).

Instead of pure `Math.min()`, apply style-weighted blend for the non-dominant factors while keeping `min()` for the dominant risk source per style.

### 4. Pass Trading Style Through to RegimeCard

**File:** `src/components/market-insight/RegimeCard.tsx`

- Accept `tradingStyle` prop
- Pass it to `classifyMarketRegime()` and `calculateUnifiedPositionSize()`
- Update labels: "Direction (24h)" becomes dynamic based on style
- Show the style-specific range horizon in the Expected Range row

**File:** `src/pages/MarketInsight.tsx`

- Pass `tradingStyle` from the existing `useTradeMode()` hook to `RegimeCard`

### 5. Style Badge in RegimeCard Footer

Show the active style context in the breakdown footer so the user knows which timeframe lens is active:

```
Score 51 | Tech 76 | Macro 29 | F&G 8 | Scalping context
Cal 0.1x · Reg 0.3x · Vol 0.8x (dominant)
```

---

## Technical Details

### Style Weight Profiles (exact values)

```text
                    Composite Weights               Orchestrator Behavior
Style        Tech   OnChain  Macro   F&G     CalWeight  RegWeight  VolWeight
-----------  -----  ------   -----   ----    ---------  ---------  ---------
scalping     0.50   0.15     0.10    0.25    0.1        0.3        0.6
short_trade  0.35   0.20     0.25    0.20    0.33       0.34       0.33
swing        0.25   0.20     0.35    0.20    0.35       0.35       0.30
```

### Range Horizon Scaling

The 24h ATR-based range is the base calculation. Per-style multipliers approximate the fraction:
- Scalping (2h): baseRange * 0.12 (sqrt(2/24) approximation)
- Short Trade (8h): baseRange * 0.40 (sqrt(8/24) approximation)  
- Swing (24h): baseRange * 1.0

### Event Sensitivity Window

Each style defines how far ahead events matter:
- Scalping: only events within 3h affect risk
- Short Trade: events within 6h
- Swing: events within 48h

This is used to filter/weight the calendar multiplier before it reaches the orchestrator.

---

## Files Modified

| File | Change |
|------|--------|
| `src/lib/constants/trading-style-context.ts` | **NEW** -- weight profiles, range multipliers, event windows per style |
| `src/lib/regime-classification.ts` | Accept `tradingStyle`, adjust composite weights and range scaling |
| `src/lib/unified-risk-orchestrator.ts` | Accept `tradingStyle`, apply style-weighted orchestration |
| `src/components/market-insight/RegimeCard.tsx` | Accept and pass `tradingStyle`, dynamic labels |
| `src/pages/MarketInsight.tsx` | Pass `tradingStyle` to RegimeCard |

---

## What This Solves

| Before | After |
|--------|-------|
| Scalper sees "Direction 24h: 50%" -- irrelevant | Scalper sees "Direction 2h: 55%" -- actionable |
| Scalper reduced 50% for FOMC in 18h | FOMC 18h away is ignored for scalp sizing |
| Swing trader reacts to 15min vol spike | Vol spike weight is low for swing context |
| All styles see same expected range | Scalp: 0.3%, Short: 1.2%, Swing: 3.5% |
| Position size identical across styles | Scalp: vol-dominant, Swing: macro-dominant |
