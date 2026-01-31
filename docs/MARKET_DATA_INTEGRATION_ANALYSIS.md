# Market Data Integration Analysis

## Current Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MARKET DOMAIN                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│  │  Market Data    │   │Economic Calendar│   │   Top Movers    │   │
│  │  /market-data   │   │   /calendar     │   │   /top-movers   │   │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘   │
│           │                     │                     │             │
│  ┌────────▼────────┐   ┌────────▼────────┐   ┌────────▼────────┐   │
│  │market-insight   │   │economic-calendar│   │binance-market   │   │
│  │edge function    │   │edge function    │   │-data function   │   │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘   │
│           │                     │                     │             │
│  ┌────────▼────────────────────▼─────────────────────▼──────────┐  │
│  │                    EXTERNAL APIs                              │  │
│  │  • Binance (klines, ticker, mark-price, funding, OI)         │  │
│  │  • CoinGecko (global market cap, BTC dominance)              │  │
│  │  • Alternative.me (Fear & Greed Index)                       │  │
│  │  • Trading Economics (economic events)                        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────┐                                               │
│  │  AI Analysis    │◄─── Combines: market-insight + macro-analysis │
│  │    /market      │                                               │
│  └─────────────────┘                                               │
└─────────────────────────────────────────────────────────────────────┘
```

## Current Integration Status

### ✅ Already Integrated

| Component | Data Source | Integration |
|-----------|-------------|-------------|
| Market Sentiment | market-insight | Fear & Greed + Technical Signals |
| Volatility Meter | binance-market-data | Historical volatility per symbol |
| Whale Tracking | market-insight | Volume spike detection |
| Trading Opportunities | market-insight | Technical score ranking |
| Combined Analysis | useCombinedAnalysis | Crypto + Macro alignment |
| Market Alerts | useMarketAlerts | Extreme F&G + Conflict detection |

### ❌ NOT Integrated (Siloed Data)

| Component | Issue | Impact |
|-----------|-------|--------|
| Economic Calendar | Standalone, no cross-reference | Events not factored into position sizing |
| Top Movers | Standalone, no shared context | Gainers/losers not considered in sentiment |
| AI Analysis | Uses stale default symbols | Not aware of user's selected pair |

---

## Proposed Integration Improvements

### 1. Cross-Page Data Sharing (Context)

Create a shared MarketContext to pass selected symbols between pages:

```typescript
// src/contexts/MarketContext.tsx
interface MarketContextValue {
  selectedPair: string;
  setSelectedPair: (pair: string) => void;
  watchlist: string[];
  topGainers: string[];
  topLosers: string[];
  highImpactEvents: EconomicEvent[];
}
```

### 2. Economic Calendar → Position Sizing

When high-impact events are today, automatically adjust position size recommendation:

```typescript
// Integration Formula
if (todayHighImpact >= 2) {
  positionSizeAdjustment *= 0.5; // Reduce 50%
} else if (todayHighImpact === 1) {
  positionSizeAdjustment *= 0.7; // Reduce 30%
}
```

### 3. Top Movers → AI Recommendations

Include top gainers/losers in AI analysis for momentum signals:

```typescript
// If selected pair is a top gainer
if (topGainers.includes(selectedPair)) {
  momentumScore += 0.1; // Bullish bias
  recommendation += " (Strong momentum)";
}
```

### 4. Unified Market Score Formula

Create a composite score combining ALL data sources:

```typescript
interface UnifiedMarketScore {
  // Technical (from market-insight)
  technicalScore: number;      // 0-100 from MA, RSI analysis
  onChainScore: number;        // 0-100 from whale activity
  
  // Sentiment (from external APIs)
  fearGreedScore: number;      // 0-100 from Alternative.me
  fundingRateScore: number;    // Normalized funding rate
  
  // Macro (from macro-analysis)
  macroScore: number;          // BTC dominance, market cap trend
  
  // Events (from economic-calendar)
  eventRiskScore: number;      // Higher = more risky
  
  // Momentum (from top-movers)
  momentumScore: number;       // Based on 24h change percentile
  
  // FINAL COMPOSITE
  compositeScore: number;      // Weighted average
  tradingBias: 'LONG' | 'SHORT' | 'WAIT';
  confidenceLevel: number;
}

// Weights for composite calculation
const WEIGHTS = {
  technical: 0.25,
  onChain: 0.15,
  fearGreed: 0.15,
  macro: 0.15,
  eventRisk: 0.15,  // Negative weight - reduces confidence
  momentum: 0.15,
};
```

---

## Recommended Implementation Plan

### Phase 1: Symbol Validation (DONE ✅)
- Created `src/lib/symbol-validation.ts`
- Integrated into `useMultiSymbolMarketInsight`

### Phase 2: Economic Calendar Integration
- Add `useEconomicCalendar` to Combined Analysis
- Factor event risk into position sizing recommendation
- Show calendar warnings on Market Data page

### Phase 3: Top Movers Context
- Export top gainers/losers from Top Movers hook
- Include in AI Analysis context
- Highlight if selected pair is a mover

### Phase 4: Unified Score Hook
- Create `useUnifiedMarketScore(symbol)`
- Combine all data sources with weighted formula
- Display as single "Market Score" widget

---

## Data Quality Assessment

| Source | Reliability | Latency | Cost |
|--------|-------------|---------|------|
| Binance API | ⭐⭐⭐⭐⭐ | <1s | Free |
| Alternative.me | ⭐⭐⭐⭐ | ~5min | Free |
| CoinGecko | ⭐⭐⭐⭐ | ~5min | Free (rate limited) |
| Trading Economics | ⭐⭐⭐⭐ | ~15min | Free |

## Conclusion

Current architecture is **modular but siloed**. Each page works independently but doesn't share context. The main opportunity is creating a **Unified Market Score** that combines:

1. Technical analysis (volatility, whale, opportunities)
2. Sentiment (Fear & Greed, funding rates)
3. Macro conditions (BTC dominance, market cap)
4. Event risk (economic calendar)
5. Momentum (top movers)

This would give traders a single, actionable signal with confidence level.
