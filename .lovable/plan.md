

# Upgrade: From Informational Dashboard to Actionable Trading Intelligence

This plan transforms four Market domain pages from descriptive data displays into quantified, trigger-based decision tools aligned with professional trading needs.

## Current State Summary

The four pages (Market Data, AI Analysis, Economic Calendar, Top Movers) currently:
- Aggregate and re-display publicly available data (Fear & Greed, funding rates, BTC dominance)
- Show redundant sentiment across Market Data and AI Analysis
- Label volume spikes as "whale detection" without methodology transparency
- Generate generic AI recommendations ("wait for breakout", "accumulation opportunity")
- Display Top Movers without liquidity context
- Provide Economic Calendar events without historical crypto impact data

---

## Phase 1: Historical Context Engine

**Goal:** Every metric gets a historical percentile so traders know if current values are unusual.

### 1A. Volatility Percentile Context

Add a `volatility_history` table to store daily snapshots of annualized volatility per symbol. The VolatilityMeterWidget will display:

```
Volatility 118% (Top 8% in 180 days)
```

Instead of just:

```
Volatility 118%
```

- Store daily volatility snapshots via a scheduled edge function or on each market-insight call
- Compute percentile rank against the last 180 entries
- Display as a badge: "Pxx in 180d" next to each volatility value

### 1B. Funding Rate Historical Context

Enhance the MarketSentimentWidget to show funding rate with percentile context:

```
Funding Rate: 0.0342% (Top 12% in 90 days)
```

- Store funding rate snapshots in `funding_rate_history` table
- Compute percentile on the edge function side
- Return `percentile90d` alongside current funding rate

### 1C. Fear & Greed Percentile

In the AI Analysis page, add context:

```
Fear & Greed: 8 (Bottom 3% in 365 days)
```

- Use Alternative.me historical endpoint (supports `?limit=365`)
- Calculate percentile rank and return it from the `macro-analysis` edge function

---

## Phase 2: Whale Detection Transparency + Derivatives Data

**Goal:** Replace opaque confidence scores with transparent methodology and add real derivatives signals.

### 2A. Whale Detection Method Disclosure

Update WhaleTrackingWidget to show the detection formula:

```
BTC ACCUMULATION (78% conf.)
Method: Vol +42% (24h) + Price +3.1% = Breakout pattern
Threshold: Vol >30%, Price >2%
```

- Add `method` and `thresholds` fields to WhaleActivity type
- Generate these from the existing `calculateWhaleSignal` logic (already uses WHALE_DETECTION constants)
- Display in an expandable section per whale card

### 2B. Add OI Change % (24h)

Add Open Interest change percentage to the MarketSentimentWidget:

```
OI Change 24h: +5.2% (leveraged long buildup)
```

- Binance Futures API `fapi/v1/openInterest` already fetched -- add historical comparison
- Compute OI change % from stored snapshots or by fetching 24h-ago OI
- Add `oiChange24h` to sentiment data model

### 2C. Funding Rate vs Price Divergence Alert

Add a divergence detector:

```
ALERT: Funding +0.05% but Price -2.1% (24h) = Divergence
```

- Compare funding direction vs price direction from the same edge function
- Surface as a new signal type in the MarketSentimentWidget factors section
- When funding is positive but price is falling (or vice versa), flag it

---

## Phase 3: Trigger-Based Alerts

**Goal:** Replace descriptive summaries with configurable, quantified alerts.

### 3A. Market Condition Triggers

Extend `useMarketAlerts` hook with new trigger types:

| Trigger | Condition | Alert |
|---------|-----------|-------|
| OI Spike | OI change >5% in 1h, price change <1% | "OI building without price move -- breakout imminent" |
| Funding Divergence | Funding positive + price down >2% (or inverse) | "Funding/Price divergence detected" |
| Volatility Extreme | Current vol > 90th percentile (180d) | "Volatility at 92nd percentile -- reduce size" |
| Volume Anomaly | Volume >3x 7-day average | "Abnormal volume spike on SYMBOL" |

- Add a `market_alert_config` table for user-customizable thresholds
- Store alert trigger history for audit
- Fire toast notifications with specific numbers, not generic phrases

### 3B. Make AI Recommendations Quantified

Replace generic AI text like:

> "accumulation opportunity"

With structured, quantified output:

> "BTC: RSI 28 (oversold zone hit 12 times in 180d, avg bounce +4.2% in 48h). Current funding -0.02% supports reversal. Suggested: LONG with 1.5% risk, target +3%, stop -1.5%."

- Update the `market-insight` edge function AI prompt to require: trigger condition, historical frequency, probability estimate, and risk parameters
- Return structured JSON instead of free-text recommendations

---

## Phase 4: Economic Calendar Correlation Engine

**Goal:** Add statistical backing to calendar event predictions.

### 4A. Event-Crypto Historical Correlation

Add a `calendar_event_impact` table storing:

```sql
CREATE TABLE calendar_event_impact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,        -- e.g., "Non-Farm Payroll"
  event_date TIMESTAMPTZ NOT NULL,
  btc_1h_change NUMERIC,          -- BTC % change 1h after
  btc_2h_change NUMERIC,          -- BTC % change 2h after
  eth_1h_change NUMERIC,
  vol_spike_pct NUMERIC,          -- Volatility increase %
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Display in CalendarTab:

```
Non-Farm Payroll
Historical: BTC avg move 2.3% in 2h (n=24 events)
Volatility spike probability: 68%
```

- Build a one-time backfill edge function using historical Forex Factory + Binance kline data
- Update on each calendar fetch with new realized data
- Show correlation stats alongside AI predictions

### 4B. Multi-Currency Support

Currently the calendar filters primarily USD events. Expand to include EUR, GBP, JPY, CNY with relevance scoring for crypto markets.

---

## Phase 5: Top Movers Liquidity Context

**Goal:** Transform from "pump list" to "tradeable opportunity scanner."

### 5A. Add Liquidity Metrics

For each top mover, display:

```
SPACE +121% | Vol: $2.1M | Spread: 1.8% | Depth: Thin
```

- Fetch order book depth from Binance `api/v3/depth?symbol=X&limit=5`
- Calculate bid-ask spread percentage
- Classify liquidity depth: Deep (>$5M within 2%), Normal ($1-5M), Thin (<$1M)
- Add a "Liquidity Warning" badge for thin markets

### 5B. Market Cap Filter (via CoinGecko)

Add a filter to exclude micro-cap coins:

- Fetch market cap from CoinGecko for displayed symbols
- Add filter toggles: "All", ">$100M", ">$1B"
- Default to ">$100M" to filter out pump-and-dump tokens

### 5C. Volume Quality Score

Add a computed metric:

```
Volume Quality: 72% (vs 7d avg)
```

- Compare current 24h volume against 7-day average volume
- Score: current/avg * 100 (capped at 200%)
- Flag "Unusual Volume" when >200% of average

---

## Phase 6: Portfolio Impact Mode

**Goal:** Connect market data to the user's actual positions.

### 6A. "What If" Scenario Calculator

Add a card to Market Data page:

```
If BTC drops 5%:
  Portfolio impact: -3.2% (-$640)
  Affected positions: BTC (direct), ETH (corr 0.85), SOL (corr 0.72)
```

- Use existing `correlation-utils.ts` correlation map
- Pull current open positions from trade entries
- Calculate weighted impact using position sizes and correlations
- Display as a collapsible "Portfolio Impact" card

---

## Phase 7: De-duplication of Redundant Data

**Goal:** Eliminate copy-paste between pages.

### 7A. Remove Duplicate Sentiment

- Market Data page: Keep the Binance-native sentiment (pro traders, funding, OI) -- this is unique
- AI Analysis page: Keep the AI-generated macro analysis -- this is the interpretation layer
- Remove Fear & Greed display from AI Analysis (already shown in Combined Analysis score)
- Remove raw funding rate from AI Analysis (already detailed in Market Data)

### 7B. Clear Page Purposes

| Page | Purpose | Unique Value |
|------|---------|--------------|
| Market Data | Real-time derivatives signals + quantified alerts | OI, funding, volume anomalies with percentiles |
| AI Analysis | AI interpretation + combined scoring + portfolio impact | Quantified recommendations with triggers |
| Economic Calendar | Event timing + historical crypto correlation | Statistical impact data |
| Top Movers | Filtered opportunity scanner with liquidity context | Tradeable setups, not pump lists |

---

## Implementation Priority

1. **Phase 1** (Historical Context) -- Highest impact/effort ratio. Makes existing data immediately more useful
2. **Phase 3A** (Trigger Alerts) -- Transforms passive data into active signals
3. **Phase 5A/5B** (Top Movers Liquidity) -- Prevents retail traps
4. **Phase 2B/2C** (OI + Divergence) -- Adds real derivatives edge
5. **Phase 4A** (Calendar Correlation) -- Statistical backing for events
6. **Phase 6** (Portfolio Impact) -- Connects market data to personal risk
7. **Phase 7** (De-duplication) -- Cleanup after new features are in place

---

## Technical Details

### New Database Tables

1. `volatility_history` -- daily volatility snapshots per symbol
2. `funding_rate_history` -- funding rate snapshots per symbol
3. `market_alert_config` -- user-customizable alert thresholds
4. `calendar_event_impact` -- historical event-to-crypto correlation data

### Modified Edge Functions

1. `market-insight` -- add percentile calculations, OI change, funding divergence detection, structured AI output
2. `macro-analysis` -- add Fear & Greed percentile from historical data
3. `economic-calendar` -- add correlation stats lookup from `calendar_event_impact`
4. New: `binance-market-data` endpoint for order book depth (Top Movers liquidity)

### Modified Frontend Components

1. `VolatilityMeterWidget` -- add percentile badge
2. `MarketSentimentWidget` -- add OI change, funding divergence, funding percentile
3. `WhaleTrackingWidget` -- add method disclosure expandable
4. `TradingOpportunitiesWidget` -- add quantified AI output with triggers
5. `CalendarTab` -- add historical correlation stats section
6. `TopMovers` -- add liquidity metrics, market cap filter, volume quality
7. New: `PortfolioImpactCard` -- what-if scenario calculator
8. `useMarketAlerts` -- add configurable trigger system

### New Hooks

1. `useVolatilityPercentile` -- fetch and compute percentile rank
2. `useMarketTriggers` -- configurable alert engine
3. `usePortfolioImpact` -- what-if calculations
4. `useTopMoversEnriched` -- combine tickers with liquidity data

