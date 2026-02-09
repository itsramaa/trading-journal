# Frontend Architecture

## Pages Structure

```
src/pages/
├── Dashboard.tsx              # Main overview
├── trading-journey/
│   ├── TradingJournal.tsx    # Trade management
│   └── StrategyManagement.tsx # Strategy library
├── TradeHistory.tsx           # Trade history standalone
├── Performance.tsx            # Analytics overview
├── DailyPnL.tsx              # P&L breakdown
├── TradingHeatmap.tsx        # Performance heatmap
├── AIInsights.tsx            # AI analysis page
├── RiskManagement.tsx         # Risk settings
├── PositionCalculator.tsx     # Position sizing
├── MarketInsight.tsx         # Market sentiment
├── MarketData.tsx            # Market data widgets
├── EconomicCalendar.tsx      # Economic events
├── TopMovers.tsx             # Price movers
├── Accounts.tsx              # Account management
├── AccountDetail.tsx         # Single account view
├── BulkExport.tsx            # CSV export
├── Backtest.tsx              # Strategy backtesting
├── Settings.tsx              # User preferences
├── Profile.tsx               # User profile
├── Notifications.tsx         # Notification center
├── Auth.tsx                  # Login/Signup
├── SharedStrategy.tsx        # Shared strategy view
└── NotFound.tsx              # 404 page
```

## Component Organization

```
src/components/
├── ui/                        # shadcn primitives (50+ components)
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── table.tsx
│   └── ...
│
├── dashboard/                 # Dashboard widgets
│   ├── TodayPerformance.tsx
│   ├── SmartQuickActions.tsx
│   ├── MarketScoreWidget.tsx
│   ├── SystemStatusIndicator.tsx
│   ├── MarketSessionsWidget.tsx
│   ├── AIInsightsWidget.tsx
│   ├── VolatilityMeterWidget.tsx
│   ├── DashboardAnalyticsSummary.tsx
│   ├── ADLRiskWidget.tsx
│   ├── PortfolioOverviewCard.tsx
│   └── StrategyCloneStatsWidget.tsx
│
├── journal/                   # Trade journal
│   ├── AllPositionsTable.tsx
│   ├── PositionsTable.tsx
│   ├── BinanceOpenOrdersTable.tsx
│   ├── TradeEnrichmentDrawer.tsx
│   ├── TradeSummaryStats.tsx
│   ├── ScreenshotUploader.tsx
│   ├── TradeFilters.tsx
│   ├── TradeHistoryFilters.tsx
│   ├── TradeHistoryTabs.tsx
│   ├── TradeHistoryInfiniteScroll.tsx
│   ├── TradeGalleryCard.tsx
│   ├── PositionDialogs.tsx
│   └── index.ts
│
├── trade/                     # Trade entry wizard
│   └── entry/
│       ├── TradeEntryWizard.tsx
│       ├── SetupStep.tsx
│       ├── ConfluenceValidator.tsx
│       ├── PositionSizingStep.tsx
│       ├── FinalChecklist.tsx
│       ├── TradeConfirmation.tsx
│       ├── PreflightResultCard.tsx
│       └── WizardProgress.tsx
│
├── risk/                      # Risk management
│   ├── DailyLossTracker.tsx
│   ├── RiskSettingsForm.tsx
│   ├── RiskEventLog.tsx
│   ├── RiskSummaryCard.tsx
│   ├── RiskAlertBanner.tsx
│   ├── RiskProfileSummaryCard.tsx
│   ├── CorrelationMatrix.tsx
│   ├── MarginHistoryTab.tsx
│   ├── PositionSizeCalculator.tsx
│   ├── index.ts
│   └── calculator/
│       ├── CalculatorInputs.tsx
│       ├── CalculatorResults.tsx
│       ├── ContextWarnings.tsx
│       ├── RiskAdjustmentBreakdown.tsx
│       ├── VolatilityStopLoss.tsx
│       ├── QuickReferenceR.tsx
│       └── index.ts
│
├── strategy/                  # Strategy management
│   ├── StrategyCard.tsx
│   ├── StrategyFormDialog.tsx
│   ├── StrategyDetailDrawer.tsx
│   ├── StrategyShareDialog.tsx
│   ├── StrategyStats.tsx
│   ├── StrategyLeaderboard.tsx
│   ├── StrategyValidationBadge.tsx
│   ├── EntryRulesBuilder.tsx
│   ├── ExitRulesBuilder.tsx
│   ├── YouTubeStrategyImporter.tsx
│   ├── YouTubeImportDebugInfo.tsx
│   ├── YouTubeTranscriptGuide.tsx
│   ├── BacktestRunner.tsx
│   ├── BacktestResults.tsx
│   ├── BacktestSessionBreakdown.tsx
│   ├── BacktestComparison.tsx
│   ├── BacktestDisclaimer.tsx
│   ├── MarketFitSection.tsx
│   ├── PairRecommendations.tsx
│   └── index.ts
│
├── analytics/                 # Charts & visualizations
│   ├── DrawdownChart.tsx
│   ├── EquityCurveWithEvents.tsx
│   ├── TradingHeatmap.tsx
│   ├── TradingHeatmapChart.tsx
│   ├── CryptoRanking.tsx
│   ├── AIPatternInsights.tsx
│   ├── EmotionalPatternAnalysis.tsx
│   ├── ContextualPerformance.tsx
│   ├── CombinedContextualScore.tsx
│   ├── FearGreedZoneChart.tsx
│   ├── EventDayComparison.tsx
│   ├── VolatilityLevelChart.tsx
│   ├── SessionPerformanceChart.tsx
│   ├── SessionInsights.tsx
│   └── SevenDayStatsCard.tsx
│
├── market/                    # Market widgets
│   ├── MarketContextBadge.tsx
│   ├── MarketSentimentWidget.tsx
│   ├── TradingOpportunitiesWidget.tsx
│   ├── WhaleTrackingWidget.tsx
│   └── index.ts
│
├── market-insight/            # Market insight tabs
│   ├── MarketDataTab.tsx
│   ├── CalendarTab.tsx
│   ├── AIAnalysisTab.tsx
│   ├── CombinedAnalysisCard.tsx
│   └── index.ts
│
├── trading/                   # Binance trading & sync
│   ├── BinanceTradeHistory.tsx
│   ├── BinanceIncomeHistory.tsx
│   ├── BinanceTransactionHistory.tsx
│   ├── BinanceFullSyncPanel.tsx
│   ├── TradeHistoryCard.tsx
│   ├── DateRangeFilter.tsx
│   ├── SyncMonitoringPanel.tsx
│   ├── SyncStatusBadge.tsx
│   ├── SyncETADisplay.tsx
│   ├── SyncQuotaDisplay.tsx
│   ├── SyncRangeSelector.tsx
│   ├── SyncReconciliationReport.tsx
│   ├── ReSyncTimeWindow.tsx
│   ├── DataQualitySummary.tsx
│   ├── FeeHistoryTab.tsx
│   └── FundingHistoryTab.tsx
│
├── binance/                   # Binance-specific UI
│   ├── BinanceNotConfiguredState.tsx
│   └── index.ts
│
├── accounts/                  # Account management
│   ├── AccountCardList.tsx
│   ├── AccountSelect.tsx
│   ├── AddAccountForm.tsx
│   ├── AccountTransactionsTable.tsx
│   ├── AccountTransactionDialog.tsx
│   └── FinancialSummaryCard.tsx
│
├── settings/                  # Settings
│   ├── BinanceApiSettings.tsx
│   ├── BinanceAccountConfigCard.tsx
│   ├── BinanceAutoSyncToggle.tsx
│   ├── BinanceDataSourceToggle.tsx
│   ├── TradingConfigTab.tsx
│   ├── AISettingsTab.tsx
│   ├── JournalExportCard.tsx
│   ├── SettingsBackupRestore.tsx
│   ├── ApiKeyForm.tsx
│   ├── RateLimitDisplay.tsx
│   ├── RetentionPeriodSetting.tsx
│   ├── DeletedTradesPanel.tsx
│   └── ComingSoonExchangeCard.tsx
│
├── chat/                      # AI chatbot
│   ├── AIChatbot.tsx
│   ├── ChatMessage.tsx
│   ├── QuickActionsPanel.tsx
│   └── TipsPanel.tsx
│
├── layout/                    # Layout components
│   ├── DashboardLayout.tsx
│   ├── AppSidebar.tsx
│   ├── NavGroup.tsx
│   ├── NavUser.tsx
│   ├── HeaderControls.tsx
│   ├── CommandPalette.tsx
│   ├── CurrencyDisplay.tsx
│   └── GlobalSyncIndicator.tsx
│
└── ProtectedRoute.tsx         # Auth guard
```

## Features Directory

```
src/features/
├── binance/                   # Binance integration
│   ├── useBinanceFutures.ts
│   ├── useBinanceAccountData.ts
│   ├── useBinanceAdvancedAnalytics.ts
│   ├── useBinanceBulkExport.ts
│   ├── useBinanceExtendedData.ts
│   ├── useBinanceMarketData.ts
│   ├── useBinanceTransactionHistory.ts
│   ├── types.ts
│   ├── market-data-types.ts
│   ├── advanced-analytics-types.ts
│   └── index.ts
│
├── ai/                        # AI features
│   ├── useAIConfluenceDetection.ts
│   ├── useAIPreflight.ts
│   ├── useAITradeQuality.ts
│   └── useDashboardInsights.ts
│
├── market-insight/            # Market analysis
│   ├── useMarketSentiment.ts
│   ├── useMacroAnalysis.ts
│   ├── useMarketAlerts.ts
│   ├── useCombinedAnalysis.ts
│   ├── useMultiSymbolMarketInsight.ts
│   ├── types.ts
│   └── index.ts
│
├── calendar/                  # Economic calendar
│   ├── useEconomicCalendar.ts
│   ├── types.ts
│   └── index.ts
│
└── trade/                     # Trade entry
    ├── useTradeEntryWizard.ts
    └── usePreTradeValidation.ts
```

## Custom Hooks (`src/hooks/`)

### Trade Hooks
```typescript
use-trade-entries.ts          // Trade CRUD
use-trade-entries-paginated.ts // Paginated trade list
use-trading-strategies.ts     // Strategy CRUD
use-trading-pairs.ts          // Pair management
use-trading-gate.ts           // Trading gate status
use-trade-screenshots.ts      // Screenshot upload
use-trade-enrichment.ts       // Trade enrichment
use-trade-enrichment-binance.ts // Binance enrichment
use-trade-validation.ts       // Trade validation
use-trade-ai-analysis.ts      // AI analysis trigger
use-trade-stats.ts            // Trade statistics
use-trade-history-filters.ts  // Filter management
use-deleted-trades.ts         // Deleted trades recovery
use-post-trade-analysis.ts    // Post-trade AI
```

### Risk Hooks
```typescript
use-risk-profile.ts           // Risk profile CRUD
use-risk-events.ts            // Risk event log
use-context-aware-risk.ts     // Dynamic risk adjustment
use-daily-pnl.ts              // Local P&L calc
```

### Binance Sync Hooks
```typescript
use-binance-sync.ts           // Core sync
use-binance-full-sync.ts      // Full history sync
use-binance-incremental-sync.ts // Incremental sync
use-binance-aggregated-sync.ts  // Aggregated sync
use-binance-background-sync.ts  // Background sync
use-binance-auto-sync.ts       // Auto sync toggle
use-sync-quota.ts              // Quota management
use-sync-monitoring.ts         // Sync monitoring
```

### Analytics Hooks
```typescript
use-binance-daily-pnl.ts      // Binance daily P&L
use-binance-weekly-pnl.ts     // Weekly P&L
use-binance-week-comparison.ts// Week over week
use-contextual-analytics.ts   // Context-based stats
use-strategy-performance.ts   // Strategy metrics
use-unified-daily-pnl.ts      // Unified daily P&L
use-unified-weekly-pnl.ts     // Unified weekly P&L
use-unified-week-comparison.ts // Unified comparison
use-unified-portfolio-data.ts  // Portfolio data
use-symbol-breakdown.ts        // Symbol breakdown
use-monthly-pnl.ts             // Monthly P&L
```

### Market Hooks
```typescript
use-unified-market-score.ts   // Composite market score
use-economic-events.ts        // Economic events
use-capture-market-context.ts // Market context capture
use-strategy-context.ts       // Strategy context
```

### Account & Balance Hooks
```typescript
use-accounts.ts               // Account management
use-trading-accounts.ts       // Trading accounts
use-exchange-credentials.ts   // API credentials
use-exchange-balance.ts       // Exchange balance
use-combined-balance.ts       // Combined balance
use-balance-snapshots.ts      // Balance snapshots
use-balance-reconciliation.ts // Reconciliation
use-currency-conversion.ts    // Currency conversion
use-exchange-rate.ts          // Exchange rates
```

### Utility Hooks
```typescript
use-auth.ts                   // Authentication
use-realtime.ts               // Realtime subscriptions
use-notifications.ts          // Notification system
use-push-notifications.ts     // Push notifications
use-notification-triggers.ts  // Notification triggers
use-user-settings.ts          // User preferences
use-language.ts               // i18n
use-mobile.tsx                // Mobile detection
use-ai-settings-enforcement.ts // AI feature gating
use-api-rate-limit.ts         // API rate limiting
use-saved-filters.ts          // Saved filters
use-sidebar-persistence.ts    // Sidebar state
use-toast.ts                  // Toast notifications
```

### Export Hooks
```typescript
use-backtest.ts               // Backtest execution
use-backtest-export.ts        // Backtest export
use-performance-export.ts     // Performance export
use-contextual-export.ts      // Contextual export
use-strategy-export.ts        // Strategy export
use-weekly-report-export.ts   // Weekly report export
use-strategy-sharing.ts       // Strategy sharing
use-youtube-strategy-import.ts // YouTube import
use-ai-strategy-recommendation.ts // AI recommendations
use-paper-account-validation.ts // Paper account validation
use-local-fee-funding.ts       // Local fee calculation
use-positions.ts               // Positions management
use-background-sync.ts         // Background sync
```

## State Management

### Zustand Store

```typescript
// src/store/app-store.ts
interface AppState {
  // Currency
  currencyPair: { base: string; quote: string };
  currency: 'USD' | 'IDR';
  exchangeRate: number;
  
  // Notifications
  notifications: Notification[];
  addNotification: (n: Notification) => void;
  markAsRead: (id: string) => void;
  unreadCount: () => number;
  
  // Search
  searchQuery: string;
  isSearchOpen: boolean;
  
  // Chatbot
  isChatbotOpen: boolean;
  chatbotInitialPrompt: string | null;
}
```

### React Query Keys

```typescript
// Accounts
['accounts']
['accounts', accountId]
['trading-accounts']
['account-transactions', accountId]

// Trades
['trade-entries', userId]
['trade-entries', 'stats']
['trade-entries', 'paginated', filters]

// Strategies
['trading-strategies', userId]
['trading-strategy', strategyId]
['shared-strategy', token]

// Binance
['binance', 'connection-status']
['binance', 'balance']
['binance', 'positions']
['binance', 'income', { days, incomeType }]
['binance', 'daily-pnl']
['binance', 'weekly-pnl']

// Risk
['risk-profile', userId]
['risk-events', userId]
['daily-risk-snapshot', userId]

// Market
['market-sentiment']
['market-insight', symbol]
['unified-market-score', symbol]
['economic-calendar', { startDate, endDate }]

// AI
['ai-preflight', params]
['trade-quality', tradeId]
['dashboard-insights', userId]

// Backtest
['backtest', strategyId, params]
['backtest-session-breakdown', backtestId]

// YouTube Import
['youtube-import', url]
```

## UI Patterns

### Card-Based Layouts
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    {/* Actions */}
  </CardFooter>
</Card>
```

### Tabs Pattern
```tsx
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">
    {/* Content 1 */}
  </TabsContent>
  <TabsContent value="tab2">
    {/* Content 2 */}
  </TabsContent>
</Tabs>
```

### Dialog Pattern
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* Form content */}
    <DialogFooter>
      <Button onClick={handleSubmit}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Empty State Pattern
```tsx
<EmptyState
  icon={<FileX className="h-12 w-12" />}
  title="No trades found"
  description="Start by creating your first trade entry."
  action={
    <Button onClick={handleCreate}>
      <Plus className="mr-2 h-4 w-4" />
      Add Trade
    </Button>
  }
/>
```

### Loading State Pattern
```tsx
{isLoading ? (
  <LoadingSkeleton />
) : error ? (
  <ErrorState message={error.message} />
) : data ? (
  <DataDisplay data={data} />
) : (
  <EmptyState />
)}
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open Command Palette |
| `Escape` | Close dialogs/modals |

## Responsive Design

```tsx
// Mobile-first breakpoints
<div className="
  grid
  grid-cols-1        // Mobile: single column
  md:grid-cols-2     // Tablet: 2 columns
  lg:grid-cols-3     // Desktop: 3 columns
  xl:grid-cols-4     // Large: 4 columns
  gap-4
">
```

## Context Providers

### MarketContext
```typescript
// src/contexts/MarketContext.tsx
interface MarketContextState {
  selectedSymbol: string;
  watchlist: string[];
  setSelectedSymbol: (symbol: string) => void;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
}
```

Usage:
```tsx
const { selectedSymbol, setSelectedSymbol } = useMarketContext();
```
