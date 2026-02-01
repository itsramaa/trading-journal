# Feature Breakdown

## Dashboard

### Purpose
Central hub untuk melihat trading performance overview dan quick insights.

### Components
| Component | Purpose |
|-----------|---------|
| `PortfolioOverviewCard` | **NEW** Total Capital, Today's Net P&L, Weekly P&L, Win Rate |
| `TodayPerformance` | 7-day stats (streak, trades, best/worst) |
| `SmartQuickActions` | Context-aware action buttons |
| `MarketScoreWidget` | Unified market score dengan bias |
| `SystemStatusIndicator` | Trading gate status (green/yellow/red) |
| `MarketSessionsWidget` | Active trading sessions (Asia/London/NY) |
| `OpenPositionsTable` | Live Binance positions |
| `RiskSummaryCard` | Daily loss limit usage + **Correlation Warning** |
| `AIInsightsWidget` | AI recommendations + **Market Regime Badge** + **Correlation Warning** |
| `VolatilityMeterWidget` | Market volatility indicator |
| `DashboardAnalyticsSummary` | Quick performance metrics |

### Data Sources
- `useBinancePositions()` - Live positions
- `useBinanceBalance()` - Wallet balance
- `useBinanceDailyPnl()` - Today's P&L
- `useTradeEntries()` - Trade history
- `useUnifiedMarketScore()` - Market analysis

---

## Trading Journal

### Purpose
Trade management hub untuk entry, monitoring, dan enrichment.

### Tabs
| Tab | Content |
|-----|---------|
| Pending | Trades dalam proses entry |
| Active | Open positions (Binance live) |

### Flow
```
New Trade Button
    │
    ▼
Trade Entry Wizard (5 steps)
    │
    ▼
Position Opened (Active tab)
    │
    ▼
Position Closed
    │
    ▼
Trade Enrichment (notes, screenshots)
    │
    ▼
Trade History
```

### Components
| Component | Purpose |
|-----------|---------|
| `AllPositionsTable` | List semua trades |
| `TradeSummaryStats` | Summary statistics |
| `TradeEnrichmentDrawer` | Edit trade metadata |
| `ScreenshotUploader` | Upload trade screenshots |
| `BinancePositionsTab` | Binance sync tab |

### Features
- Screenshot upload (max 3, 500KB WebP)
- Strategy linking (multi-select)
- Market context capture
- Emotional state tracking
- AI post-trade analysis

---

## Trade Entry Wizard

### Modes

**Full Mode (5 Steps):**
1. **Setup** - Pair, direction, entry/SL/TP
2. **Confluence** - AI confluence validation
3. **Position Sizing** - Risk-based sizing
4. **Checklist** - Pre-trade checklist
5. **Confirmation** - Final review

**Express Mode (3 Steps):**
1. Setup
2. Position Sizing
3. Confirmation

### Integration Points
- Trading Gate: Blocks if daily loss limit hit
- AI Quality Score: Pre-trade validation
- Leverage Brackets: Real-time warnings
- Market Context: Auto-capture at entry

### Components
| Component | Purpose |
|-----------|---------|
| `TradeEntryWizard` | Main wizard container |
| `SetupStep` | Trade setup form |
| `ConfluenceValidator` | AI confluence check |
| `PositionSizingStep` | Size calculator |
| `FinalChecklist` | Pre-trade checklist |
| `TradeConfirmation` | Final confirmation |
| `WizardProgress` | Progress indicator |

---

## Trade History

### Purpose
Standalone page untuk viewing dan filtering closed trades dengan pagination dan dual view mode.

### Architecture Principles
1. **Pagination WAJIB** - Cursor-based pagination (trade_date + id)
2. **Default 1 year lookback** - Tidak fetch full history kecuali user request
3. **View toggle = cheap** - Satu data source, multiple representation
4. **Images = enhancement** - LazyImage + IntersectionObserver

### View Modes
| Mode | Description |
|------|-------------|
| **List View** | Data-dense cards dengan full trade details |
| **Gallery View** | Visual grid dengan screenshot thumbnails |

### Tabs
| Tab | Content |
|-----|---------|
| All | Semua closed trades |
| Binance | Trades dari Binance sync |
| Paper | Paper trading entries |

### Filters
- Date Range: Custom range atau full history toggle
- Result: Profit / Loss / Breakeven
- Strategy: Multi-select
- Pair: Multi-select
- Direction: Long / Short
- AI Quality Sort

### Features
- **Infinite Scroll** - 50 trades per page, cursor-based
- **Trade Enrichment Drawer** - Notes, screenshots, analysis
- **Gallery View** - Visual chart thumbnails dengan lazy loading
- **Full History Toggle** - Override default 1 year limit
- **CSV Export** (planned)
- **R:R Calculation** (if SL data available)

### Data Flow
```
Filter UI → paginatedFilters (memoized)
                    ↓
        useTradeEntriesPaginated()
        - limit: 50
        - cursor-based pagination
                    ↓
        trades = pages.flatMap()
                    ↓
    ┌───────────────┼───────────────┐
    ↓               ↓               ↓
List View     Gallery View      Stats
(cards)       (grid+lazy)     (summary)
                    ↓
        loadMoreRef (infinite scroll)
```

### Components
| Component | Purpose |
|-----------|---------|
| `TradeHistoryFilters` | Comprehensive filter controls |
| `TradeHistoryCard` | List view trade card |
| `TradeGalleryCard` | Gallery view visual card |
| `LazyImage` | Image with IntersectionObserver |
| `TradeEnrichmentDrawer` | Edit trade metadata |

---

## Strategy Management

### Purpose
Strategy library untuk define, test, dan share trading strategies.

### Features
| Feature | Description |
|---------|-------------|
| Create/Edit | Strategy form dialog |
| Entry Rules | 6 rule types builder |
| Exit Rules | Exit criteria builder |
| YouTube Import | AI-powered strategy extraction |
| Sharing | Generate share link + QR |
| Cloning | Clone shared strategies |
| Backtesting | Test dengan real Klines |

### Entry Rule Types
1. `indicator` - Technical indicator
2. `price` - Price action pattern
3. `volume` - Volume condition
4. `trend` - Trend confirmation
5. `confluence` - Multiple conditions
6. `custom` - Custom rule

### Components
| Component | Purpose |
|-----------|---------|
| `StrategyCard` | Strategy list item |
| `StrategyFormDialog` | Create/edit form |
| `EntryRulesBuilder` | Entry rules editor |
| `ExitRulesBuilder` | Exit rules editor |
| `YouTubeStrategyImporter` | YouTube import |
| `StrategyShareDialog` | Share dialog + QR |
| `StrategyDetailDrawer` | Full strategy view |
| `StrategyLeaderboard` | Performance ranking |
| `StrategyStats` | Strategy metrics |

---

## Backtesting

### Purpose
Test strategies dengan historical data.

### Features
- Real Binance Klines data
- Multiple timeframe support
- Equity curve visualization
- Trade-by-trade results
- Comparison mode

### Components
| Component | Purpose |
|-----------|---------|
| `BacktestRunner` | Backtest execution |
| `BacktestResults` | Results display |
| `BacktestComparison` | Compare multiple runs |

---

## Risk Management

### Purpose
Central hub untuk risk configuration dan monitoring.

### Features
| Feature | Description |
|---------|-------------|
| Daily Loss Tracker | Progress bar dengan 70/90/100% alerts |
| Risk Profile | 6 configurable parameters |
| Risk Event Log | Audit trail of risk events |
| Correlation Matrix | Position correlation view |
| Context-Aware Risk | Dynamic risk adjustment |

### Components
| Component | Purpose |
|-----------|---------|
| `DailyLossTracker` | Daily loss progress |
| `RiskSettingsForm` | Risk profile editor |
| `RiskEventLog` | Event audit trail |
| `CorrelationMatrix` | Correlation visualization |
| `RiskProfileSummaryCard` | Quick summary |
| `RiskAlertBanner` | Warning banner |
| `MarginHistoryTab` | Margin change history |

### Risk Event Types
- `warning_70` - 70% limit used
- `warning_90` - 90% limit used
- `limit_reached` - 100% limit hit
- `trading_disabled` - Trading blocked
- `trading_enabled` - Trading re-enabled

---

## Position Calculator

### Purpose
Calculate position size dengan context awareness.

### Features
| Feature | Description |
|---------|-------------|
| Position Sizing | Risk-based calculation |
| Volatility Stop Loss | ATR-based SL suggestion |
| Context Warnings | Event/volatility alerts |
| Risk Adjustment | Dynamic multipliers |

### Components
| Component | Purpose |
|-----------|---------|
| `CalculatorInputs` | Input form |
| `CalculatorResults` | Size results |
| `VolatilityStopLoss` | ATR-based SL |
| `ContextWarnings` | Market warnings |
| `RiskAdjustmentBreakdown` | Multiplier breakdown |
| `QuickReferenceR` | Quick R reference |

### Risk Adjustment Factors
1. Volatility (ATR level)
2. Economic Events (high-impact)
3. Sentiment (Fear/Greed)
4. Momentum (composite score)
5. Historical Performance (pair win rate)

---

## Analytics

### Performance Page
- Win Rate, Profit Factor, Expectancy
- Drawdown analysis
- Trade distribution charts
- Period comparison
- **Net P&L Breakdown** (Gross - Fees + Funding) for Binance users

### Daily P&L Page
- Today's P&L breakdown
- Week-over-week comparison
- **Real Symbol Breakdown** (from `bySymbol` data, not mock)
- Best/worst trade stats
- Export to CSV/PDF

### Trading Heatmap
- Hour × Day performance grid
- Session-based analysis
- Hot/cold zones identification

### AI Insights Page
- AI-generated analysis
- Pattern recognition
- Improvement suggestions
- Risk alerts

### Contextual Analytics
| Component | Purpose |
|-----------|---------|
| `FearGreedZoneChart` | F&G zone performance |
| `EventDayComparison` | Event day analysis |
| `VolatilityLevelChart` | Volatility zone perf |
| `ContextualPerformance` | Combined context view |

---

## MARKET Domain

### Purpose
Provide external market context and conditions to inform trading decisions. Acts as the "Context Provider" for RISK, JOURNAL, and STRATEGY domains.

### Pages & Routes

| Route | Page | Purpose |
|-------|------|---------|
| `/market` | MarketInsight | Central market analysis hub |
| `/market-data` | MarketData | Real-time data widgets |
| `/calendar` | EconomicCalendar | Upcoming economic events |
| `/top-movers` | TopMovers | Price leaders & volume spikes |

---

### Market Insight (`/market`)

Multi-tab analysis page combining sentiment, macro, and AI insights.

#### Tabs
| Tab | Content | Data Source |
|-----|---------|-------------|
| Market Data | Technical signals, volume analysis | `binance-market-data` edge function |
| Calendar | Economic events timeline | `economic-calendar` edge function |
| AI Analysis | Macro narrative generation | `macro-analysis` edge function |
| Combined | Unified recommendations | Aggregated from all tabs |

#### Components
| Component | Purpose |
|-----------|---------|
| `MarketDataTab` | Technical signals, trading opportunities |
| `CalendarTab` | Event timeline with impact badges |
| `AIAnalysisTab` | AI-generated macro analysis |
| `CombinedAnalysisCard` | Unified market score & recommendations |

---

### Market Sentiment Widget

Real-time aggregated sentiment dari Binance Futures data.

#### Metrics Aggregated
| Metric | Source | Weight |
|--------|--------|--------|
| Top Trader Long/Short Ratio | `/futures/data/topLongShortAccountRatio` | 25% |
| Global Long/Short Ratio | `/futures/data/globalLongShortAccountRatio` | 20% |
| Open Interest Change | `/futures/data/openInterestHist` | 20% |
| Taker Buy/Sell Volume | `/futures/data/takerlongshortRatio` | 20% |
| Funding Rate | `/fapi/v1/fundingRate` | 15% |

#### Output
- **Sentiment Score**: 0-100 (0=Extreme Bearish, 100=Extreme Bullish)
- **Bias Label**: Strong Bearish / Bearish / Neutral / Bullish / Strong Bullish
- **Visual**: Gauge indicator with color gradient

---

### Fear & Greed Index

External sentiment indicator dari Alternative.me API.

#### Integration Points
| Consumer | Usage |
|----------|-------|
| `MarketScoreWidget` | Dashboard quick view |
| `useUnifiedMarketScore` | Composite score calculation |
| `useMarketAlerts` | Extreme level notifications |
| `FearGreedZoneChart` | Performance by F&G zone |

#### Alert Triggers
- **Extreme Fear** (≤25): Toast notification + caution advice
- **Extreme Greed** (≥75): Toast notification + profit-taking reminder
- **Conflicting Sentiment**: Warning when Crypto ≠ Macro sentiment

---

### Economic Calendar (`/calendar`)

High-impact macro event tracking untuk trading awareness.

#### Features
| Feature | Description |
|---------|-------------|
| Event Timeline | Chronological event list |
| Impact Filtering | High / Medium / Low filter |
| Event Types | FOMC, CPI, NFP, GDP, etc. |
| Previous/Forecast/Actual | Data comparison |
| Countdown Timer | Time until next event |

#### Integration Points
- **Trading Gate**: Events within 1 hour trigger risk adjustment
- **Position Calculator**: Half-size warning during high-impact events
- **Trading Heatmap**: Event day overlay (amber ring indicator)
- **useUnifiedMarketScore**: Event safety score component

#### Components
| Component | Purpose |
|-----------|---------|
| `CalendarTab` | Main calendar view |
| `useEconomicCalendar` | Data fetching hook |
| `useEconomicEvents` | Event filtering & processing |

---

### Top Movers (`/top-movers`)

Real-time market leaders tracking dari Binance Futures API.

#### Sections
| Section | Description |
|---------|-------------|
| Top Gainers | Highest 24h price increase |
| Top Losers | Largest 24h price decrease |
| Volume Leaders | Highest 24h trading volume |

#### Data Source
- Endpoint: `/fapi/v1/ticker/24hr` (via edge function)
- Refresh: Auto-refresh every 60 seconds
- Pairs: All active USDT perpetual pairs

#### Components
| Component | Purpose |
|-----------|---------|
| `CryptoRanking` | Ranked list display |

---

### Market Data Page (`/market-data`)

Real-time data widgets untuk market analysis.

#### Widgets
| Widget | Description |
|--------|-------------|
| Market Sentiment | Aggregated sentiment gauge |
| Volatility Meter | ATR-based volatility level (Calm → Extreme) |
| Whale Tracking | Volume spike detection (proxy for large wallet moves) |
| Trading Opportunities | AI-identified setups |

#### Symbol Synchronization
Semua widget sync dengan `selectedPair` dari Market Sentiment:
- Volatility Meter prepends selected pair ke watchlist
- Whale Tracking highlights selected pair activity
- Trading Opportunities prioritizes selected pair

---

### Unified Market Score (`useUnifiedMarketScore`)

Central hook yang mengagregasi semua market context menjadi single score.

#### Score Components
| Component | Weight | Source |
|-----------|--------|--------|
| Technical | 25% | Binance market data |
| Fear & Greed | 25% | Alternative.me API |
| Macro | 25% | AI macro analysis |
| Event Safety | 25% | Economic calendar proximity |

#### Output
```typescript
{
  score: number;           // 0-100 composite score
  bias: TradingBias;       // LONG_FAVORABLE | SHORT_FAVORABLE | NEUTRAL | CAUTION | AVOID
  components: {
    technical: number;
    fearGreed: number;
    macro: number;
    eventSafety: number;
  };
  warnings: string[];      // Active warnings
  recommendation: string;  // Human-readable advice
}
```

#### Consumers
- `MarketScoreWidget` (Dashboard)
- `PositionCalculator` (Risk adjustment)
- `TradeEntryWizard` (Pre-trade context)
- `useTradingGate` (Trading restrictions)
- `useContextAwareRisk` (Dynamic sizing)

---

### Market Alert System

Proactive notifications untuk extreme market conditions.

#### Alert Types
| Type | Trigger | Action |
|------|---------|--------|
| Extreme Fear | F&G ≤ 25 | Toast warning + cautious advice |
| Extreme Greed | F&G ≥ 75 | Toast warning + take profit reminder |
| Sentiment Conflict | Crypto ≠ Macro | Amber warning + analysis needed |
| High-Impact Event | Event < 1 hour | Trading gate caution |

#### Hook
- `useMarketAlerts()` - Monitors conditions and triggers toasts

---

### MARKET Domain Components Summary

| Component | Location | Purpose |
|-----------|----------|---------|
| `MarketInsight.tsx` | pages | Main market analysis page |
| `MarketData.tsx` | pages | Data widgets page |
| `EconomicCalendar.tsx` | pages | Calendar page |
| `TopMovers.tsx` | pages | Price movers page |
| `MarketDataTab` | components/market-insight | Technical data tab |
| `CalendarTab` | components/market-insight | Calendar tab |
| `AIAnalysisTab` | components/market-insight | AI macro tab |
| `CombinedAnalysisCard` | components/market-insight | Combined view |
| `MarketSentimentWidget` | components/market | Sentiment gauge |
| `MarketContextBadge` | components/market | Context indicator |
| `MarketScoreWidget` | components/dashboard | Dashboard score |
| `MarketSessionsWidget` | components/dashboard | Session indicator |
| `CryptoRanking` | components/analytics | Rankings display |
| `FearGreedZoneChart` | components/analytics | F&G performance |
| `VolatilityMeterWidget` | components/dashboard | Volatility gauge |

---

### MARKET Domain Hooks

| Hook | Purpose |
|------|---------|
| `useUnifiedMarketScore` | Composite market score |
| `useMarketSentiment` | Binance sentiment data |
| `useMacroAnalysis` | AI macro analysis |
| `useMarketAlerts` | Alert monitoring |
| `useEconomicCalendar` | Calendar data |
| `useEconomicEvents` | Event processing |
| `useCombinedAnalysis` | Combined analysis |
| `useMultiSymbolMarketInsight` | Multi-symbol data |

---

### Cross-Domain Integration

```
MARKET Domain
     │
     ├──► RISK Domain
     │    └── useContextAwareRisk (volatility adjustment)
     │    └── useTradingGate (event-based restrictions)
     │
     ├──► JOURNAL Domain
     │    └── Trade Entry Wizard (market context capture)
     │    └── trade_entries.market_context (stored snapshot)
     │
     ├──► STRATEGY Domain
     │    └── MarketFitSection (strategy-market alignment)
     │    └── Backtest (market condition filtering)
     │
     ├──► ANALYTICS Domain
     │    └── FearGreedZoneChart (F&G performance)
     │    └── EventDayComparison (event day analysis)
     │    └── VolatilityLevelChart (volatility zones)
     │
     └──► DASHBOARD Domain
          └── MarketScoreWidget (quick overview)
          └── AIInsightsWidget (market regime badge)
          └── VolatilityMeterWidget (volatility indicator)
```

---

## Settings

### Tabs
| Tab | Content |
|-----|---------|
| Binance API | API key configuration |
| Trading Config | Risk parameters |
| AI Settings | AI feature toggles |
| Export | Journal export options |
| Backup/Restore | Data management |

### Components
| Component | Purpose |
|-----------|---------|
| `BinanceApiSettings` | API key form |
| `TradingConfigTab` | Trading settings |
| `AISettingsTab` | AI configuration |
| `JournalExportCard` | Export options |
| `SettingsBackupRestore` | Backup tools |

---

## Global Features

### Command Palette (⌘K)
- Global search
- Quick navigation
- Action shortcuts

### AI Chatbot
- Floating chat button
- Trade Q&A
- Market analysis
- Strategy suggestions

### Notifications
- Price alerts
- Risk warnings
- System notifications
- In-app notification center
