# Risk Management Integration Analysis

## Executive Summary

Dokumen ini menganalisis **Risk Management** group (Risk Overview & Risk Calculator) dan menghubungkannya dengan analisis sebelumnya untuk membentuk **Complete Trading Decision Support System**.

---

## Arsitektur Risk Management Saat Ini

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                             RISK MANAGEMENT SYSTEM                                   │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │                           DATA SOURCES                                          │ │
│  │  ┌──────────────┐  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐   │ │
│  │  │   Binance    │  │  Local DB     │  │ Risk Profile  │  │  Trade Entries  │   │ │
│  │  │   Futures    │  │  Snapshots    │  │   Settings    │  │   (Positions)   │   │ │
│  │  │   (Live)     │  │  (Fallback)   │  │   (Rules)     │  │    (Open)       │   │ │
│  │  └──────┬───────┘  └───────┬───────┘  └───────┬───────┘  └────────┬────────┘   │ │
│  └─────────┼──────────────────┼──────────────────┼───────────────────┼────────────┘ │
│            │                  │                  │                   │              │
│            ▼                  ▼                  ▼                   ▼              │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │                           HOOKS LAYER                                           │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │ │
│  │  │ useTradingGate  │  │ useRiskProfile  │  │ useDailyRiskStat│                  │ │
│  │  │                 │  │                 │  │ us              │                  │ │
│  │  │ • canTrade      │  │ • risk_per_trade│  │ • loss_used_%   │                  │ │
│  │  │ • lossUsed%     │  │ • max_daily_loss│  │ • remaining_bud │                  │ │
│  │  │ • status        │  │ • max_position  │  │ • trading_allow │                  │ │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘                  │ │
│  └───────────┼────────────────────┼────────────────────┼───────────────────────────┘ │
│              │                    │                    │                             │
│              ▼                    ▼                    ▼                             │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │                           COMPONENTS                                            │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │ │
│  │  │DailyLossTracker │  │PositionSizeCal │  │CorrelationMatrix│                  │ │
│  │  │RiskAlertBanner  │  │VolatilityStop  │  │RiskSettingsForm │                  │ │
│  │  │RiskSummaryCard  │  │CommissionRates │  │RiskEventLog     │                  │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              PAGES                                              │ │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                              │ │
│  │  │  /risk (Overview)   │  │ /calculator         │                              │ │
│  │  │  - Daily Loss Track │  │ - Position Sizing   │                              │ │
│  │  │  - Risk Profile Sum │  │ - Volatility Stop   │                              │ │
│  │  │  - Risk Alerts      │  │ - Commission Rates  │                              │ │
│  │  │  - Correlation Mat  │  │ - Quick Reference R │                              │ │
│  │  └─────────────────────┘  └─────────────────────┘                              │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Komponen Risk Management

### 1. Risk Profile (use-risk-profile.ts)
| Parameter | Default | Deskripsi |
|-----------|---------|-----------|
| risk_per_trade_percent | 2% | Risiko per trade |
| max_daily_loss_percent | 5% | Batas loss harian |
| max_weekly_drawdown_percent | 10% | Batas drawdown mingguan |
| max_position_size_percent | 40% | Maksimum ukuran posisi |
| max_concurrent_positions | 3 | Posisi bersamaan |
| max_correlated_exposure | 0.75 | Eksposur korelasi |

### 2. Trading Gate (use-trading-gate.ts)
| Status | Threshold | Action |
|--------|-----------|--------|
| `ok` | < 70% | Normal trading |
| `warning` | 70-90% | Yellow banner |
| `disabled` | ≥ 100% | Block new trades |

### 3. Position Calculator (PositionSizeCalculator.tsx)
- Real-time commission rates dari Binance
- ATR-based volatility stop loss
- Leverage brackets awareness
- R:R quick reference (1R, 2R, 3R)

### 4. Correlation Matrix (CorrelationMatrix.tsx)
- Static correlation map (BTC-ETH: 0.85)
- Warning badge untuk korelasi > 0.7
- Visual heat display

---

## Gap Analysis: Risk ↔ Sistem Lain

### Gap 1: Risk Calculator ↔ Market Conditions

| Calculator Side | Market Side | Gap |
|-----------------|-------------|-----|
| Fixed position size | Volatility levels | NOT adjusted for vol |
| Static risk % | Fear/Greed index | NOT reduced in extremes |
| Manual stop loss | ATR data | Partial (volatility tab) |
| Standard sizing | Economic events | NOT factored |

**IMPACT**: Calculator memberikan ukuran posisi yang sama baik pasar calm maupun extreme volatile.

### Gap 2: Daily Loss Tracker ↔ Market Events

| Tracker Side | Calendar Side | Gap |
|--------------|---------------|-----|
| P&L monitoring | High-impact events | NOT showing event warnings |
| Risk budget | Event risk level | Budget NOT adjusted |
| Trading gate | Event timing | Gate NOT aware of events |

**IMPACT**: Trading bisa di-allow saat ada FOMC/CPI release yang bisa menggerus budget dalam hitungan menit.

### Gap 3: Risk Profile ↔ Journal Performance

| Profile Side | Journal Side | Gap |
|--------------|--------------|-----|
| Fixed parameters | Historical win rate | NOT adaptive |
| Same for all pairs | Pair-specific performance | NOT pair-aware |
| Manual adjustment | AI pattern detection | NOT AI-informed |

**IMPACT**: Risk profile static, tidak belajar dari historical performance.

### Gap 4: Position Calculator ↔ Combined Analysis

| Calculator Side | AI Analysis Side | Gap |
|-----------------|------------------|-----|
| User-input SL | AI confluence score | NOT integrated |
| Manual sizing | Trading bias | NOT shown |
| Fixed risk % | Context quality | NOT weighted |

**IMPACT**: User tidak melihat AI recommendation saat menghitung position.

---

## Integration Matrix: All Systems

```
                    Market Data  Calendar  Top Movers  AI Analysis  Journal  Risk
Market Data            ✓           ❌         ❌          ✓          ❌       ❌
Calendar               ❌           ✓         ❌          ✓          ❌       ❌
Top Movers             ❌           ❌         ✓          ❌          ❌       ❌
AI Analysis            ✓           ✓         ❌          ✓          ❌       ❌
Journal                ❌           ❌         ❌          ✓          ✓        ❌
Risk                   ❌           ❌         ❌          ❌          ❌        ✓

Legend:
✓ = Connected
❌ = Siloed
```

**OBSERVATION**: Risk Management adalah silo terbesar - tidak terhubung dengan sistem lain sama sekali!

---

## Proposed Integration: Smart Risk Adjustment

### New Hook: useContextAwareRisk

```typescript
// src/hooks/use-context-aware-risk.ts
export interface ContextAwareRiskResult {
  // Base risk from profile
  baseRiskPercent: number;
  basePositionSizePercent: number;
  
  // Adjustments
  adjustments: {
    volatility: RiskAdjustment;
    events: RiskAdjustment;
    momentum: RiskAdjustment;
    correlation: RiskAdjustment;
    performance: RiskAdjustment;
  };
  
  // Final adjusted values
  adjustedRiskPercent: number;
  adjustedPositionSizePercent: number;
  adjustedStopMultiplier: number;
  
  // Reasoning
  totalAdjustmentPercent: number;
  primaryReason: string;
  allReasons: string[];
  
  // Trading recommendation
  recommendation: 'PROCEED' | 'CAUTION' | 'REDUCE_SIZE' | 'AVOID';
}

interface RiskAdjustment {
  factor: number;        // 0.5 = reduce 50%, 1.0 = no change, 1.2 = increase 20%
  reason: string;
  source: string;
}

export function useContextAwareRisk(symbol: string) {
  const { data: riskProfile } = useRiskProfile();
  const { data: volatility } = useSymbolVolatility(symbol);
  const { data: calendar } = useEconomicCalendar();
  const { data: topMovers } = useTopMovers();
  const { data: trades } = useTradeEntries();
  const { gateState } = useTradingGate();
  
  // Calculate all adjustments
  const adjustments = useMemo(() => {
    return {
      volatility: calculateVolatilityAdjustment(volatility),
      events: calculateEventAdjustment(calendar),
      momentum: calculateMomentumAdjustment(symbol, topMovers),
      correlation: calculateCorrelationAdjustment(symbol, trades),
      performance: calculatePerformanceAdjustment(symbol, trades),
    };
  }, [volatility, calendar, topMovers, trades, symbol]);
  
  // Calculate final adjusted risk
  const totalFactor = Object.values(adjustments)
    .reduce((acc, adj) => acc * adj.factor, 1.0);
  
  const adjustedRisk = riskProfile.risk_per_trade_percent * totalFactor;
  
  return {
    baseRiskPercent: riskProfile.risk_per_trade_percent,
    adjustedRiskPercent: Math.max(0.5, Math.min(adjustedRisk, 5)), // Clamp 0.5% - 5%
    adjustments,
    // ... etc
  };
}
```

### Adjustment Factors Table

| Condition | Factor | Example |
|-----------|--------|---------|
| **Volatility** | | |
| Low volatility | 1.2x | Calm market, can size up |
| Medium volatility | 1.0x | Normal sizing |
| High volatility | 0.7x | Reduce exposure |
| Extreme volatility | 0.5x | Minimal exposure |
| **Economic Events** | | |
| No events today | 1.0x | Normal trading |
| Low impact event | 0.95x | Slight reduction |
| High impact event | 0.7x | Significant reduction |
| Event in <1 hour | 0.5x | Avoid new positions |
| **Momentum** | | |
| Asset is top gainer | 0.8x | Possible reversal |
| Asset is top loser | 0.7x | Catching falling knife |
| Normal movement | 1.0x | Standard sizing |
| **Correlation** | | |
| No correlated positions | 1.0x | Normal |
| 1 correlated position | 0.9x | Slight overlap |
| 2+ correlated positions | 0.7x | High overlap |
| **Historical Performance** | | |
| Win rate >60% on pair | 1.1x | Proven edge |
| Win rate 40-60% on pair | 1.0x | Standard |
| Win rate <40% on pair | 0.8x | Weak on this pair |
| Losing streak active | 0.7x | Cool down |

---

## Updated Position Calculator UI

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Position Size Calculator                                 [Live]       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─── CONTEXT WARNINGS ───────────────────────────────────────────────┐ │
│  │  ⚠️ FOMC in 2h - Position size reduced 30%                        │ │
│  │  ⚠️ High volatility (ATR 4.2%) - Stop multiplier: 1.5x            │ │
│  │  ℹ️ 1 correlated position open (ETH) - Exposure reduced 10%       │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Account Balance    $10,000         Risk %    [2% → 1.2%] ⓘ           │
│  Entry Price        $50,000         Stop Loss  $48,500                  │
│  Direction          ○ Long ● Short  Leverage   [5x]                     │
│                                                                         │
│  ┌─── CALCULATION RESULTS ────────────────────────────────────────────┐ │
│  │  Position Size:  0.024 BTC                                         │ │
│  │  Position Value: $1,200 (12% of capital)                           │ │
│  │  Risk Amount:    $120 → $72 (adjusted)                             │ │
│  │  Potential -1R:  -$72   +1R: +$72   +2R: +$144   +3R: +$216        │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─── SMART ADJUSTMENT BREAKDOWN ─────────────────────────────────────┐ │
│  │  Base Risk:        2.0%                                            │ │
│  │  Volatility:       ×0.85  (High - reduce size)                     │ │
│  │  Event Risk:       ×0.70  (FOMC in 2h)                             │ │
│  │  Correlation:      ×0.90  (1 ETH position)                         │ │
│  │  Performance:      ×1.10  (65% win rate on BTCUSDT)                │ │
│  │  ────────────────────────────                                      │ │
│  │  Adjusted Risk:    1.2%   (-40% from base)                         │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  [Copy to Trade Entry] [Reset to Base Risk]                            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Daily Loss Tracker Enhancement

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Daily Loss Tracker                                       [Live]       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─── TODAY'S MARKET CONTEXT ─────────────────────────────────────────┐ │
│  │  🔴 FOMC Rate Decision @ 14:00 UTC                                 │ │
│  │     ⚠️ Consider closing positions before announcement              │ │
│  │  📊 Fear & Greed: 28 (Fear) - Lower risk tolerance recommended     │ │
│  │  🌡️ Market Volatility: HIGH - Stop losses may be hit faster       │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Loss Limit Used:   [████████░░░░░░░░░░░░] 42%                         │
│                     0%         70%     90%    100%                      │
│                                                                         │
│  Wallet Balance:    $10,000                                             │
│  Loss Limit:        $500 (5%)                                           │
│  Today's P&L:       -$210                                               │
│  Remaining Budget:  $290                                                │
│                                                                         │
│  ┌─── DYNAMIC RECOMMENDATION ─────────────────────────────────────────┐ │
│  │  Given FOMC event + 42% loss used + Fear sentiment:                │ │
│  │  💡 Recommended: REDUCE to 0.75R per trade until event passes      │ │
│  │  💡 Consider: Closing open positions before 14:00 UTC              │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  [✓] Trading Allowed                                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Complete System Integration Map

```
                    ┌─────────────────────────────────────────────────────────────────┐
                    │                    UNIFIED MARKET CONTEXT                        │
                    │  (Captured at trade entry, stored in market_context column)     │
                    └─────────────────────────────┬───────────────────────────────────┘
                                                  │
        ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
        │                                         │                                         │
        ▼                                         ▼                                         ▼
┌───────────────────┐                   ┌───────────────────┐                   ┌───────────────────┐
│   MARKET DATA     │                   │   RISK MANAGEMENT │                   │     JOURNAL       │
│   DOMAIN          │◄─────────────────►│   DOMAIN          │◄─────────────────►│     DOMAIN        │
│                   │                   │                   │                   │                   │
│ • Sentiment       │ volatility        │ • Trading Gate    │ historical perf   │ • Trade Entries   │
│ • Fear/Greed      │ momentum          │ • Risk Profile    │ win rate by pair  │ • Trade History   │
│ • Top Movers      │ event risk        │ • Daily Tracker   │ correlation data  │ • Enrichment      │
│ • Calendar        │────────────►      │ • Calculator      │ ◄────────────     │ • Screenshots     │
│ • Whale Tracking  │                   │ • Correlation     │                   │ • Strategies      │
│ • AI Analysis     │                   │ • Event Log       │                   │ • AI Analysis     │
└───────────────────┘                   └───────────────────┘                   └───────────────────┘
        │                                         │                                         │
        │                                         │                                         │
        └─────────────────────────────────────────┼─────────────────────────────────────────┘
                                                  │
                                                  ▼
                              ┌─────────────────────────────────────────┐
                              │         TRADE ENTRY WIZARD              │
                              │                                         │
                              │  Step 1: Setup + Context Capture        │
                              │  Step 2: Position Sizing (Context-Aware)│
                              │  Step 3: Confluence Check               │
                              │  Step 4: Pre-Trade Validation           │
                              │  Step 5: Confirmation                   │
                              └─────────────────────────────────────────┘
```

---

## Implementation Priority

| Phase | Task | Files | Effort | Impact |
|-------|------|-------|--------|--------|
| 1 | Create `useContextAwareRisk` hook | `use-context-aware-risk.ts` | 🟡 Medium | 🔴 High |
| 2 | Add context warnings to Calculator | `PositionSizeCalculator.tsx` | 🟢 Low | 🔴 High |
| 3 | Add market context to DailyLossTracker | `DailyLossTracker.tsx` | 🟢 Low | 🟡 Medium |
| 4 | Create adjustment breakdown UI | `RiskAdjustmentBreakdown.tsx` | 🟡 Medium | 🟡 Medium |
| 5 | Link Calculator ↔ TradeEntryWizard | `PositionSizingStep.tsx` | 🟡 Medium | 🔴 High |
| 6 | Add pair-specific risk settings | `use-risk-profile.ts` | 🔴 High | 🟢 Low |
| 7 | Implement adaptive risk learning | AI + DB integration | 🔴 High | 🟡 Medium |

---

## Hubungan dengan Dokumen Sebelumnya

### Dari MARKET_DATA_INTEGRATION_ANALYSIS.md
- **Volatility data** → Digunakan untuk adjustment factor di calculator
- **Fear/Greed** → Ditampilkan di DailyLossTracker sebagai context
- **Economic Calendar** → Event risk mengurangi position size
- **Top Movers** → Momentum warning untuk catching falling knife

### Dari JOURNAL_INTEGRATION_ANALYSIS.md
- **Historical win rate per pair** → Performance adjustment factor
- **Losing streak detection** → Cool down adjustment
- **Strategy-specific performance** → Strategy-aware sizing

### Dari UNIFIED_SYSTEM_INTEGRATION.md
- **UnifiedMarketContext** → Digunakan oleh `useContextAwareRisk`
- **Composite Score** → Influences overall recommendation
- **Trading Bias** → Aligns with risk recommendation

---

## New Files to Create

```
src/
├── hooks/
│   └── use-context-aware-risk.ts       # Smart risk adjustment hook
├── components/
│   └── risk/
│       ├── ContextWarnings.tsx         # Warning banners
│       ├── RiskAdjustmentBreakdown.tsx # Visual breakdown
│       └── MarketContextSummary.tsx    # Mini context display
└── lib/
    └── calculations/
        └── risk-adjustments.ts         # Adjustment calculation logic
```

---

## Expected Outcomes

1. **Safer Trading**: Position sizes auto-adjusted for dangerous conditions
2. **Context Awareness**: Traders see WHY their risk is adjusted
3. **Event Protection**: Auto-reduction before high-impact events
4. **Performance Learning**: Risk adjusted based on historical edge
5. **Unified View**: Single source of truth for risk decisions

---

## Conclusion

Risk Management adalah **silo terbesar** dalam sistem - tidak terhubung dengan Market Data, Journal, atau AI Analysis. 

Dengan mengimplementasikan `useContextAwareRisk`, kita:

1. **Menghubungkan** volatility, events, momentum ke position sizing
2. **Mengintegrasikan** historical performance ke risk decisions
3. **Memberikan** visual feedback tentang adjustment reasoning
4. **Melindungi** trader dari kondisi berbahaya secara otomatis

Ini melengkapi **Complete Trading Decision Support System** yang menghubungkan:
- Market Data → Risk → Journal → AI → Trade Entry

Dari **reactive journaling** menjadi **proactive risk-aware trading**.
