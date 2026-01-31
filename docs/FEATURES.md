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
Standalone page untuk viewing dan filtering closed trades.

### Tabs
| Tab | Content |
|-----|---------|
| All | Semua closed trades |
| Binance | Trades dari Binance sync |
| Paper | Paper trading entries |
| Import | Binance sync controls |

### Filters
- Result: Profit / Loss
- Strategy: Multi-select
- Pair: Multi-select
- Direction: Long / Short
- AI Quality Sort

### Features
- Trade enrichment drawer
- CSV export
- R:R calculation (if SL data available)

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

## Market Data

### Market Insight
- Multi-symbol technical analysis
- Sentiment indicators
- Macro analysis (AI)
- Combined recommendations

### Economic Calendar
- Upcoming events
- Impact level filtering
- Event history

### Top Movers
- Price change leaders
- Volume leaders
- Funding rate extremes

### Components
| Component | Purpose |
|-----------|---------|
| `MarketDataTab` | Price/volume data |
| `CalendarTab` | Economic calendar |
| `AIAnalysisTab` | AI macro analysis |
| `CombinedAnalysisCard` | Combined view |
| `MarketSentimentWidget` | Sentiment indicator |
| `CryptoRanking` | Top movers |

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
