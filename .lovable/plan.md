

# Refactor: De-duplicate Market Domain & Upgrade to Decisional Architecture

This plan addresses three critical issues: overlapping data between Market Data and Market Bias, misleading "Whale Tracking" labeling, and inconsistent scoring across pages.

---

## Problem Summary

| Issue | Current State | Target State |
|-------|--------------|--------------|
| Market Data vs Market Bias | Both show sentiment, funding, scores -- mixed raw data + synthesis | Market Data = pure raw metrics; Market Bias = synthesis engine |
| Whale Tracking | Volume spike labeled as "whale" -- no wallet/order flow data | Rename to "Volume Anomaly Detector" with statistical thresholds |
| Market Bias output | Multiple overlapping scores (AI Confidence, Overall Score, Crypto Sentiment %, Combined Analysis) | 5 clean outputs: Regime, Direction, Expected Move, Risk Mode, Size % |
| Scoring overlap | `technicalScore`, `confidence`, `compositeScore`, `cryptoScore`, `macroScore`, `alignmentPercent` all displayed separately | Single regime-based classification eliminates confusion |

---

## Changes

### 1. Rename "Whale Tracking" to "Volume Anomaly Detector"

**Files:** `WhaleTrackingWidget.tsx`, `MarketData.tsx`, `market-insight/types.ts`

- Rename component title from "Whale Tracking" to "Volume Anomaly Detector"  
- Update subtitle from "Volume-based whale activity detection" to "Statistical volume spike detection (>95th percentile)"
- Rename signal labels: ACCUMULATION -> "HIGH_VOL_BULLISH", DISTRIBUTION -> "HIGH_VOL_BEARISH", NONE -> "NORMAL"
- Add percentile context to volume change display (e.g., "Vol +45% | P97 vs 90d")
- Keep existing detection logic but surface it honestly as volume anomaly, not wallet tracking

**Edge function (`market-insight/index.ts`):**
- Update whale description text to remove "Whales accumulating/distributing" language
- Replace with: "Volume anomaly: +X% spike with bullish/bearish price action"
- Add percentile rank to whale detection output (compare current volume vs 90-day average)

### 2. Refocus Market Data Page as "Flow & Liquidity Dashboard"

**File:** `MarketData.tsx`

- Update page title to "Flow & Liquidity" with description "Derivatives flow, volume anomalies, and liquidity metrics"
- Update sidebar label in `AppSidebar.tsx`: "Market Data" -> "Flow & Liquidity"
- **Remove** `MarketSentimentWidget` from this page (sentiment belongs in Market Bias only)
- **Keep and elevate:**
  - `VolatilityMeterWidget` (raw volatility data)
  - Renamed `WhaleTrackingWidget` -> Volume Anomaly Detector
  - OI delta and funding data (already in MarketSentimentWidget -- extract into standalone widget)
- **Remove** `TradingOpportunitiesWidget` from this page (trade setups belong in Market Bias)
- **Keep** `PortfolioImpactCard` (scenario calculator is unique here)

**New widget: `FundingOIDashboard.tsx`** (extracted from MarketSentimentWidget)
- Funding rate per symbol with percentile context
- OI change 24h with interpretation
- Funding/Price divergence alerts
- Long/Short ratio from existing Binance data
- Pure data display, no narrative summaries

### 3. Refactor Market Bias Page as "Regime Classification Engine"

**File:** `MarketInsight.tsx` (Market Bias page)

**Remove** from display:
- "AI Confidence: X%" (redundant with regime)
- "Overall Score: X%" (redundant with regime)  
- Verbose AI recommendation text
- Separate "Combined Analysis" card with its own scoring system
- "Crypto Sentiment %" and "Macro Sentiment %" as separate progress bars

**Replace with 5 clean outputs in a single `RegimeCard` component:**

```
+--------------------------------------------------+
| MARKET REGIME                                     |
|                                                   |
| Regime:     TRENDING BULLISH                      |
| Direction:  72% probability upside (24h)          |
| Expected:   +1.8% to +4.2% range                 |
| Risk Mode:  AGGRESSIVE                            |
| Size:       100% (normal)                         |
|                                                   |
| Based on: Technical 68 | Macro 72 | F&G 65       |
| Alignment: Crypto + Macro ALIGNED                 |
+--------------------------------------------------+
```

**New component:** `src/components/market-insight/RegimeCard.tsx`
- Regime classification: TRENDING_BULL | TRENDING_BEAR | RANGING | HIGH_VOL | RISK_OFF
- Direction probability: derived from composite score mapped to percentage
- Expected move %: derived from volatility data + momentum
- Risk mode: AGGRESSIVE (score >65, aligned) | NEUTRAL (45-65) | DEFENSIVE (score <45 or conflict)
- Suggested size %: from existing `positionSizeAdjustment` logic

**Keep but simplify:**
- `BiasExpiryIndicator` (useful)
- Market signals list (condensed, no narration)
- Macro correlations grid (raw data only, no AI summary paragraph)

**Remove:**
- `CombinedAnalysisCard.tsx` (absorbed into RegimeCard)
- AI narrative summaries ("The market is showing..." paragraphs)
- `AIAnalysisTab.tsx` rewritten as `RegimeCard.tsx` + simplified signals

### 4. Regime Classification Logic

**New file:** `src/lib/regime-classification.ts`

```typescript
type MarketRegime = 'TRENDING_BULL' | 'TRENDING_BEAR' | 'RANGING' | 'HIGH_VOL' | 'RISK_OFF';
type RiskMode = 'AGGRESSIVE' | 'NEUTRAL' | 'DEFENSIVE';

function classifyRegime(context): MarketRegime
  - compositeScore > 65 + momentum positive + alignment -> TRENDING_BULL
  - compositeScore < 35 + momentum negative + alignment -> TRENDING_BEAR
  - volatility > HIGH threshold -> HIGH_VOL
  - event risk VERY_HIGH or HIGH -> RISK_OFF
  - else -> RANGING

function calculateDirectionProbability(compositeScore): number
  - Maps 0-100 score to upside probability (30-70% range, not extreme)

function determineRiskMode(regime, alignment): RiskMode
  - TRENDING + aligned -> AGGRESSIVE
  - RANGING or partial conflict -> NEUTRAL
  - HIGH_VOL or RISK_OFF or strong conflict -> DEFENSIVE

function calculateExpectedRange(volatility, momentum, regime): { low, high }
  - Uses ATR-based volatility + momentum direction
```

Uses existing `calculateCompositeScore` and `calculateTradingBias` from `market-scoring.ts` as inputs.

### 5. Update Sidebar Navigation

**File:** `AppSidebar.tsx`

```
Economic Calendar  /calendar
Top Movers         /top-movers  
Flow & Liquidity   /market-data    (renamed from "Market Data")
Market Bias        /market         (unchanged)
```

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/layout/AppSidebar.tsx` | Rename "Market Data" to "Flow & Liquidity" |
| `src/pages/MarketData.tsx` | Remove MarketSentimentWidget + TradingOpportunities, add FundingOIDashboard, update title |
| `src/pages/MarketInsight.tsx` | Replace AIAnalysisTab + CombinedAnalysisCard with RegimeCard |
| `src/components/market/WhaleTrackingWidget.tsx` | Rename to "Volume Anomaly Detector", update labels |
| `src/components/market-insight/RegimeCard.tsx` | **NEW** - 5-output regime classification display |
| `src/components/market/FundingOIDashboard.tsx` | **NEW** - Extracted funding/OI/divergence from sentiment widget |
| `src/lib/regime-classification.ts` | **NEW** - Regime, risk mode, direction probability logic |
| `src/components/market-insight/AIAnalysisTab.tsx` | Remove (replaced by RegimeCard) |
| `src/components/market-insight/CombinedAnalysisCard.tsx` | Remove (absorbed into RegimeCard) |
| `supabase/functions/market-insight/index.ts` | Update whale descriptions, add volume percentile |
| `src/components/market/index.ts` | Update exports |
| `src/components/market-insight/index.ts` | Update exports |
| `src/components/layout/CommandPalette.tsx` | Rename "Market Data" to "Flow & Liquidity" |

---

## What Gets Removed vs Kept

**Removed from Market Data (now Flow & Liquidity):**
- MarketSentimentWidget (big gauge + bull/bear bar) -- moves to nowhere, sentiment synthesis is in Market Bias regime
- TradingOpportunitiesWidget -- trade setups belong in Market Bias

**Removed from Market Bias:**
- AI Confidence % display
- Overall Score % display  
- CombinedAnalysisCard (separate crypto/macro scores)
- Long AI narrative summaries
- Separate "AI Recommendation" text box

**Kept in Flow & Liquidity:**
- VolatilityMeterWidget (pure raw data)
- Volume Anomaly Detector (renamed whale)
- PortfolioImpactCard (unique scenario tool)
- NEW: FundingOIDashboard (funding rates, OI changes, divergences, L/S ratio)

**Kept in Market Bias:**
- BiasExpiryIndicator
- Market signals list (condensed)
- Macro correlations grid (data only)
- NEW: RegimeCard (single output: regime + direction + range + risk mode + size)

