# Unified System Integration Analysis

## Executive Summary

Dokumen ini menghubungkan analisis **Market Data** dan **Trading Journal** untuk memberikan gambaran lengkap integrasi data dalam sistem Trading Journey.

---

## Peta Integrasi Lengkap

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                  EXTERNAL APIs                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌───────────────┐ ┌──────────────┐      │
│  │ Binance  │ │CoinGecko │ │Alternative.me│ │Trading Econ.  │ │ Lovable AI   │      │
│  │ Futures  │ │ Global   │ │ Fear/Greed   │ │ Calendar      │ │ Gemini 2.5   │      │
│  └────┬─────┘ └────┬─────┘ └──────┬───────┘ └───────┬───────┘ └──────┬───────┘      │
└───────┼────────────┼───────────────┼─────────────────┼────────────────┼──────────────┘
        │            │               │                 │                │
        ▼            ▼               ▼                 ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              EDGE FUNCTIONS LAYER                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ binance-futures │  │ market-insight  │  │economic-calendar│  │post-trade-      │ │
│  │ binance-market  │  │ macro-analysis  │  │                 │  │analysis         │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
└───────────┼─────────────────────┼───────────────────┼─────────────────────┼──────────┘
            │                     │                   │                     │
            ▼                     ▼                   ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND HOOKS LAYER                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │useBinanceBalance│  │useMarketSentiment│ │useEconomicCalendar│ │usePostTradeAnal│ │
│  │useBinancePositions│ │useCombinedAnalysis││                 │  │                 │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
└───────────┼─────────────────────┼───────────────────┼─────────────────────┼──────────┘
            │                     │                   │                     │
            ▼                     ▼                   ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                  PAGES LAYER                                         │
│ ┌─────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────────┐ │
│ │Dashboard│ │Market Data│ │  Calendar │ │Top Movers │ │  Journal  │ │Trade History│ │
│ └────┬────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └──────┬─────┘ │
└──────┼────────────┼─────────────┼─────────────┼─────────────┼──────────────┼────────┘
       │            │             │             │             │              │
       └────────────┴─────────────┴─────────────┴─────────────┴──────────────┘
                                        ▲
                                        │
                              ❌ NO CROSS-COMMUNICATION
                              (Data flows vertically, not horizontally)
```

---

## Gap Analysis: Data Silos

### Silo 1: Market Data ↔ Journal

| Market Side | Journal Side | Gap |
|-------------|--------------|-----|
| Fear & Greed Index | market_context column | NOT captured at trade entry |
| Volatility Level | Stop loss calculation | NOT linked to strategy |
| Whale Signals | Confluence scoring | NOT factored in |
| Trading Opportunities | Entry decisions | Manual, not automated |

### Silo 2: Calendar ↔ Position Sizing

| Calendar Side | Risk Side | Gap |
|---------------|-----------|-----|
| High-impact events | Position size calc | Events NOT factored |
| Risk level adjustment | Risk profile | NOT integrated |

### Silo 3: Top Movers ↔ AI Recommendations

| Movers Side | AI Side | Gap |
|-------------|---------|-----|
| 24h gainers/losers | AI preflight | NOT considered |
| Volume leaders | Entry signals | Momentum NOT scored |

---

## Integration Solution: Unified Market Context

### New Type Definition

```typescript
// src/types/market-context.ts
export interface UnifiedMarketContext {
  // === SENTIMENT (from market-insight) ===
  sentiment: {
    overall: 'bullish' | 'bearish' | 'neutral';
    technicalScore: number;      // 0-100
    onChainScore: number;        // 0-100 whale activity
    macroScore: number;          // 0-100
    confidence: number;          // 0-100
  };
  
  // === FEAR & GREED (from alternative.me) ===
  fearGreed: {
    value: number;               // 0-100
    label: string;               // "Extreme Fear" to "Extreme Greed"
  };
  
  // === VOLATILITY (from binance-market-data) ===
  volatility: {
    level: 'low' | 'medium' | 'high';
    value: number;               // ATR-based percentage
    suggestedStopMultiplier: number; // 1.0, 1.5, 2.0
  };
  
  // === ECONOMIC EVENTS (from economic-calendar) ===
  events: {
    hasHighImpactToday: boolean;
    riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
    positionSizeAdjustment: 'normal' | 'reduce_30%' | 'reduce_50%';
    upcomingEvent?: {
      name: string;
      timeUntil: string;
      cryptoImpact: 'bullish' | 'bearish' | 'neutral';
    };
  };
  
  // === MOMENTUM (from top-movers) ===
  momentum: {
    isTopGainer: boolean;
    isTopLoser: boolean;
    rank24h: number | null;      // 1-20 if in top movers
    priceChange24h: number;
  };
  
  // === COMBINED SCORE ===
  compositeScore: number;        // 0-100 weighted average
  tradingBias: 'LONG_FAVORABLE' | 'SHORT_FAVORABLE' | 'NEUTRAL' | 'AVOID';
  
  // === METADATA ===
  capturedAt: string;            // ISO timestamp
  dataQuality: number;           // 0-100 based on API success rate
}
```

### New Hook: useCaptureMarketContext

```typescript
// src/hooks/use-capture-market-context.ts
export function useCaptureMarketContext() {
  const { data: sentiment } = useMarketSentiment();
  const { data: calendar } = useEconomicCalendar();
  const { data: combined } = useCombinedAnalysis();
  
  const captureContext = async (symbol: string): Promise<UnifiedMarketContext> => {
    // Fetch symbol-specific data
    const volatility = await fetchSymbolVolatility(symbol);
    const momentum = await checkTopMovers(symbol);
    
    // Build unified context
    return {
      sentiment: {
        overall: sentiment.sentiment.overall,
        technicalScore: sentiment.sentiment.technicalScore,
        onChainScore: sentiment.sentiment.onChainScore,
        macroScore: sentiment.sentiment.macroScore,
        confidence: sentiment.sentiment.confidence,
      },
      fearGreed: sentiment.sentiment.fearGreed,
      volatility,
      events: {
        hasHighImpactToday: calendar.todayHighlight.hasEvent,
        riskLevel: calendar.impactSummary.riskLevel,
        positionSizeAdjustment: calendar.impactSummary.positionAdjustment,
        upcomingEvent: calendar.todayHighlight.event ? {
          name: calendar.todayHighlight.event.event,
          timeUntil: calendar.todayHighlight.timeUntil,
          cryptoImpact: calendar.todayHighlight.event.cryptoImpact,
        } : undefined,
      },
      momentum,
      compositeScore: calculateCompositeScore(...),
      tradingBias: determineTradingBias(...),
      capturedAt: new Date().toISOString(),
      dataQuality: calculateDataQuality(...),
    };
  };
  
  return { captureContext };
}
```

### Integration Points

1. **TradeEntryWizard (Step 1: Setup)**
   - Auto-capture context when pair is selected
   - Store in trade's `market_context` column
   - Display summary badge in wizard

2. **TradeHistoryCard**
   - Read `market_context` from trade
   - Show Fear/Greed badge at entry time
   - Flag if high-impact event day

3. **AI Insights Page**
   - Aggregate `market_context` from all trades
   - Correlate with win/loss outcomes
   - Generate "Trade in Fear = X% win rate" insights

4. **Position Calculator**
   - Factor in `events.positionSizeAdjustment`
   - Factor in `volatility.suggestedStopMultiplier`
   - Show combined adjustment recommendation

---

## Composite Score Formula

```typescript
function calculateCompositeScore(context: UnifiedMarketContext): number {
  const weights = {
    sentiment: 0.25,
    fearGreed: 0.15,
    volatility: 0.15,
    events: 0.20,
    momentum: 0.15,
    combined: 0.10,
  };
  
  // Normalize each factor to 0-100
  const sentimentScore = context.sentiment.confidence;
  
  // Fear/Greed: optimal is 30-70, penalize extremes
  const fgValue = context.fearGreed.value;
  const fearGreedScore = fgValue >= 30 && fgValue <= 70 
    ? 100 
    : Math.max(0, 100 - Math.abs(50 - fgValue) * 2);
  
  // Volatility: medium is optimal, low/high penalized
  const volatilityScore = context.volatility.level === 'medium' ? 100 
    : context.volatility.level === 'low' ? 70 
    : 50;
  
  // Events: lower risk = higher score
  const eventScore = {
    'LOW': 100,
    'MODERATE': 75,
    'HIGH': 40,
    'VERY_HIGH': 20,
  }[context.events.riskLevel];
  
  // Momentum: being a top mover can be good or bad
  const momentumScore = !context.momentum.isTopGainer && !context.momentum.isTopLoser
    ? 70 // Stable
    : context.momentum.isTopGainer ? 85 : 40; // Gainer good, loser bad
  
  // Combined alignment
  const combinedScore = context.compositeScore; // from useCombinedAnalysis
  
  return Math.round(
    sentimentScore * weights.sentiment +
    fearGreedScore * weights.fearGreed +
    volatilityScore * weights.volatility +
    eventScore * weights.events +
    momentumScore * weights.momentum +
    combinedScore * weights.combined
  );
}
```

---

## Implementation Priority

| Phase | Task | Effort | Impact |
|-------|------|--------|--------|
| 1 | Create `UnifiedMarketContext` type | 🟢 Low | 🔴 Foundation |
| 2 | Implement `useCaptureMarketContext` | 🟡 Medium | 🔴 High |
| 3 | Integrate into TradeEntryWizard | 🟡 Medium | 🔴 High |
| 4 | Update TradeHistoryCard display | 🟢 Low | 🟡 Medium |
| 5 | Add to Post-Trade Analysis | 🟡 Medium | 🟡 Medium |
| 6 | Build correlation reports in AI Insights | 🔴 High | 🟡 Medium |
| 7 | Integrate into Position Calculator | 🟡 Medium | 🟢 Low |

---

## Expected Outcomes

1. **Pre-Trade**: Traders see market conditions BEFORE entering
2. **Trade Entry**: Context automatically captured and stored
3. **Post-Trade**: AI can correlate outcomes with market conditions
4. **Analytics**: "You win 78% when F&G is 40-60, only 34% in Extreme Greed"
5. **Risk Management**: Position size auto-adjusted for high-impact events

---

## Files to Create/Modify

### New Files
- `src/types/market-context.ts` - Type definitions
- `src/hooks/use-capture-market-context.ts` - Context capture hook
- `src/lib/market-scoring.ts` - Score calculation utilities

### Modified Files
- `src/components/trade/entry/SetupStep.tsx` - Add context capture
- `src/components/trading/TradeHistoryCard.tsx` - Display context badges
- `src/pages/AIInsights.tsx` - Add correlation analysis
- `src/components/risk/PositionSizeCalculator.tsx` - Factor in adjustments

---

## Conclusion

Sistem saat ini memiliki **data vertikal yang solid** (Binance → DB → UI) tetapi **horizontal integration yang lemah** (Market ↔ Journal ↔ Risk). 

Dengan menerapkan `UnifiedMarketContext`, kita menciptakan **single source of truth** yang:

1. Menghubungkan semua sumber data pasar
2. Menyimpan snapshot saat trade entry
3. Memungkinkan analisis korelasi AI
4. Otomatis menyesuaikan position sizing

Ini mengubah sistem dari **reactive journaling** menjadi **proactive decision support**.
