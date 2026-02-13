
# Create docs/CLASS-DIAGRAM.md — Full Mermaid Class Diagram

## Overview
Create a comprehensive Mermaid class diagram document covering **all entities, types, hooks, services, and their relationships** across the Trading Journal, Trade History, and Import Trade modules. The diagram will be split into logical sections to remain readable while maintaining 100% coverage.

## File to Create
`docs/CLASS-DIAGRAM.md`

## Diagram Architecture

The document will contain **5 interconnected Mermaid class diagrams** (split for readability, since a single diagram with 60+ classes becomes unreadable):

### Diagram 1: Core Domain Entities
All primary data models used across the system:

- **TradeEntry** — Central entity (40+ fields: id, pair, direction, entry_price, exit_price, stop_loss, take_profit, quantity, pnl, fees, status, trade_state, trade_mode, source, binance_trade_id, screenshots, market_context, strategy_snapshot, trade_rating, lesson_learned, rule_compliance, bias/execution/precision_timeframe, etc.)
- **TradingStrategy** (name, description, timeframe, higher_timeframe, lower_timeframe, methodology, trading_style, entry_rules, exit_rules, valid_pairs, min_confluences, min_rr, status, session_preference, difficulty_level)
- **Account** (name, account_type, currency, balance, exchange, metadata)
- **AccountTransaction** (transaction_type, amount, currency, description)
- **RiskProfile** (risk_per_trade_percent, max_daily_loss_percent, max_weekly_drawdown_percent, max_position_size_percent, max_concurrent_positions)
- **EntryRule** / **ExitRule** (type, condition, is_mandatory, value, unit)
- **TradeEntryStrategy** (junction table: trade_entry_id, strategy_id)
- Relationships: TradeEntry --o TradingStrategy (many-to-many via TradeEntryStrategy), TradeEntry --> Account, Account --> AccountTransaction

### Diagram 2: Trade Wizard & AI System
All wizard-related types and AI analysis entities:

- **WizardState** (currentStep, completedSteps, mode, preValidation, strategyDetails, tradeDetails, marketContext, confluences, priceLevels, positionSizing, finalChecklist, tradingAccountId, accountBalance)
- **TradeDetailsData** (pair, direction, timeframe)
- **TradePriceLevels** (entryPrice, stopLoss, takeProfit)
- **ConfluenceData** (checkedItems, totalRequired, passed, aiConfidence)
- **FinalChecklistData** (emotionalState, confidenceLevel, followingRules, tradeComment, aiQualityScore)
- **PreValidationResult** (dailyLossCheck, positionLimitCheck, correlationCheck, canProceed, overallStatus)
- **PositionSizeResult** (position_size, position_value, risk_amount, capital_deployment_percent, warnings, potential_profit_1r/2r/3r)
- **UnifiedMarketContext** (sentiment, fearGreed, volatility, events, momentum, session, compositeScore, tradingBias)
- Sub-contexts: **MarketSentimentContext**, **FearGreedContext**, **VolatilityContext**, **EventContext**, **MomentumContext**, **SessionContext**
- **PreflightInput/Response** (verdict, confidence, expectancy, edgeStrength, layers with DataSufficiency, EdgeValidation, ContextSimilarity, Stability, BiasDetection)
- AI Types: **AIConfluenceResult**, **AITradeQualityScore**, **AIPatternInsight**, **PostTradeAnalysis**, **PreTradeValidation**
- **TradingGateState** (canTrade, status, lossUsedPercent, remainingBudget, aiQualityWarning, aiQualityBlocked)
- Relationships: WizardState --> PreValidationResult, WizardState --> TradingStrategy, WizardState --> TradeDetailsData, WizardState --> TradePriceLevels, WizardState --> ConfluenceData, WizardState --> FinalChecklistData, WizardState --> PositionSizeResult, WizardState --> UnifiedMarketContext

### Diagram 3: Binance Integration & Sync Engine
All Binance-specific types and the aggregation pipeline:

- **BinanceTrade** (id, symbol, orderId, side, price, qty, realizedPnl, commission, positionSide, maker, buyer)
- **BinanceOrder** (orderId, symbol, status, type, side, positionSide, price, avgPrice, origQty, executedQty, stopPrice)
- **BinancePosition** (symbol, positionAmt, entryPrice, markPrice, unrealizedProfit, leverage, marginType, liquidationPrice)
- **BinanceBalance** / **BinanceAccountSummary**
- **BinanceIncome** (symbol, incomeType, income, asset, tranId, tradeId)
- **BinanceCredentials** / **BinanceConnectionStatus**
- **PositionLifecycle** (symbol, direction, positionSide, entryFills, exitFills, entryOrders, exitOrders, incomeRecords, entryTime, exitTime, isComplete, lifecycleId)
- **AggregatedTrade** (binance_trade_id, pair, direction, entry_price, exit_price, quantity, realized_pnl, commission, funding_fees, fees, pnl, r_multiple, result, trade_state, _validation)
- **ValidationResult** (isValid, errors, warnings, crossValidation)
- **AggregationResult** (trades, stats, failures, reconciliation, partialSuccess)
- **SyncCheckpoint** (currentPhase, incomeData, tradesBySymbol, processedSymbols, failedSymbols, timeRange)
- **SyncQuotaInfo** (currentCount, maxQuota, remaining, usagePercent, isExhausted)
- **TradeStateMachine** (TradeState enum: OPENING, PARTIALLY_FILLED, ACTIVE, CLOSED, CANCELED, LIQUIDATED + transition rules)
- Binance extended: **CommissionRate**, **LeverageBracket**, **ForceOrder**, **PositionMode**, **AccountConfig**, **AdlQuantile**
- Relationships: PositionLifecycle --> BinanceTrade, PositionLifecycle --> BinanceOrder, PositionLifecycle --> BinanceIncome, AggregatedTrade --> PositionLifecycle, AggregatedTrade --> ValidationResult, AggregationResult --> AggregatedTrade

### Diagram 4: Exchange Abstraction Layer
Generic exchange types for multi-exchange readiness:

- **ExchangePosition** (symbol, side, size, entryPrice, markPrice, unrealizedPnl, leverage, marginType, source)
- **ExchangeBalance** (asset, total, available, unrealizedPnl, marginBalance, source)
- **ExchangeAccountSummary** (totalBalance, availableBalance, totalUnrealizedPnl, assets)
- **ExchangeTrade** (id, symbol, side, price, quantity, realizedPnl, commission, timestamp, isMaker, positionSide, source)
- **ExchangeOrder** (orderId, symbol, side, type, status, originalQuantity, executedQuantity, price, stopPrice, source)
- **ExchangeIncome** (id, symbol, incomeType, category, amount, asset, timestamp, source)
- **ExchangeCredentialStatus** (id, exchange, label, apiKeyMasked, isValid, permissions)
- **ExchangeRateLimitStatus** (category, weightUsed, maxWeight, usagePercent)
- **ExchangeMeta** (type, name, icon, status, color)
- Relationships: BinancePosition ..|> ExchangePosition (implements), BinanceTrade ..|> ExchangeTrade, etc.

### Diagram 5: Solana Import & Trade History Hooks
Import pipeline and history/filter system:

- **ParsedSolanaTrade** (signature, blockTime, program, programName, direction, pair, entryPrice, exitPrice, quantity, pnl, fees, status)
- **SolanaParserResult** (trades, totalTransactions, parsedCount, errors)
- **SolanaTradeImportState** (status: ImportStatus, result, selectedTrades, importedCount)
- ImportStatus enum: idle, fetching, parsed, importing, done, error
- **TradeHistoryFiltersState** (dateRange, resultFilter, directionFilter, sessionFilter, selectedStrategyIds, selectedPairs, sortByAI, showFullHistory)
- **TradeStats** (totalTrades, totalPnlGross, totalPnlNet, totalFees, winCount, lossCount, winRate, avgWin, avgLoss, profitFactor)
- **EnrichmentData** (notes, emotionalState, chartTimeframe, customTags, screenshots, selectedStrategies, biasTimeframe, executionTimeframe, precisionTimeframe, tradeRating, lessonLearned, ruleCompliance)
- **TradeModeState** (tradeMode, tradingStyle, isPaper, isLive)
- **DailyRiskSnapshot** / **DailyRiskStatus**
- **ClosePositionInput** (id, exit_price, pnl, fees, notes)
- Relationships: SolanaParserResult --> ParsedSolanaTrade, TradeHistoryFiltersState --> TradeStats, EnrichmentData --> TradeEntry

## Technical Notes

- Each diagram section will have a brief intro explaining the domain
- Mermaid `classDiagram` syntax with proper visibility markers (+public, -private, #protected)
- Methods included where hooks/services expose them (e.g., `+submitTrade()`, `+fetchTrades()`, `+saveEnrichment()`)
- Enums rendered as Mermaid `class` with `<<enumeration>>` stereotype
- Relationships use standard UML notation: `-->` association, `--o` aggregation, `--|>` inheritance, `..|>` implementation, `--` dependency
- Total: ~60 classes/interfaces across 5 diagrams
