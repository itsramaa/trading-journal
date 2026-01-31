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
├── ui/                # shadcn primitives (50+ components)
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── table.tsx
│   └── ...
│
├── dashboard/         # Dashboard widgets
│   ├── TodayPerformance.tsx
│   ├── SmartQuickActions.tsx
│   ├── MarketScoreWidget.tsx
│   ├── SystemStatusIndicator.tsx
│   ├── MarketSessionsWidget.tsx
│   ├── RiskSummaryCard.tsx (also in risk/)
│   ├── AIInsightsWidget.tsx
│   ├── VolatilityMeterWidget.tsx
│   ├── DashboardAnalyticsSummary.tsx
│   └── ADLRiskWidget.tsx
│
├── journal/           # Trade journal
│   ├── AllPositionsTable.tsx
│   ├── OpenPositionsTable.tsx
│   ├── BinancePositionsTab.tsx
│   ├── TradeEnrichmentDrawer.tsx
│   ├── TradeSummaryStats.tsx
│   ├── ScreenshotUploader.tsx
│   ├── TradeFilters.tsx
│   ├── TradeHistoryFilters.tsx
│   ├── TradeHistoryTabs.tsx
│   └── PositionDialogs.tsx
│
├── trade/             # Trade entry wizard
│   └── entry/
│       ├── TradeEntryWizard.tsx
│       ├── SetupStep.tsx
│       ├── ConfluenceValidator.tsx
│       ├── PositionSizingStep.tsx
│       ├── FinalChecklist.tsx
│       ├── TradeConfirmation.tsx
│       └── WizardProgress.tsx
│
├── risk/              # Risk management
│   ├── DailyLossTracker.tsx
│   ├── RiskSettingsForm.tsx
│   ├── RiskEventLog.tsx
│   ├── RiskSummaryCard.tsx
│   ├── RiskAlertBanner.tsx
│   ├── RiskProfileSummaryCard.tsx
│   ├── CorrelationMatrix.tsx
│   ├── MarginHistoryTab.tsx
│   ├── PositionSizeCalculator.tsx
│   └── calculator/
│       ├── CalculatorInputs.tsx
│       ├── CalculatorResults.tsx
│       ├── ContextWarnings.tsx
│       ├── RiskAdjustmentBreakdown.tsx
│       ├── VolatilityStopLoss.tsx
│       └── QuickReferenceR.tsx
│
├── strategy/          # Strategy management
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
│   ├── BacktestRunner.tsx
│   ├── BacktestResults.tsx
│   ├── BacktestComparison.tsx
│   ├── MarketFitSection.tsx
│   └── PairRecommendations.tsx
│
├── analytics/         # Charts & visualizations
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
│   └── VolatilityLevelChart.tsx
│
├── market/            # Market widgets
│   ├── MarketContextBadge.tsx
│   └── MarketSentimentWidget.tsx
│
├── market-insight/    # Market insight tabs
│   ├── MarketDataTab.tsx
│   ├── CalendarTab.tsx
│   ├── AIAnalysisTab.tsx
│   └── CombinedAnalysisCard.tsx
│
├── trading/           # Binance trading
│   ├── BinanceTradeHistory.tsx
│   ├── BinanceIncomeHistory.tsx
│   ├── BinanceTransactionHistory.tsx
│   ├── TradeHistoryCard.tsx
│   └── DateRangeFilter.tsx
│
├── accounts/          # Account management
│   ├── AccountCardList.tsx
│   ├── AccountSelect.tsx
│   ├── AddAccountForm.tsx
│   ├── AccountTransactionsTable.tsx
│   ├── AccountTransactionDialog.tsx
│   └── FinancialSummaryCard.tsx
│
├── settings/          # Settings
│   ├── BinanceApiSettings.tsx
│   ├── BinanceAccountConfigCard.tsx
│   ├── TradingConfigTab.tsx
│   ├── AISettingsTab.tsx
│   ├── JournalExportCard.tsx
│   └── SettingsBackupRestore.tsx
│
├── chat/              # AI chatbot
│   ├── AIChatbot.tsx
│   ├── ChatMessage.tsx
│   ├── QuickActionsPanel.tsx
│   └── TipsPanel.tsx
│
└── layout/            # Layout components
    ├── DashboardLayout.tsx
    ├── AppSidebar.tsx
    ├── NavGroup.tsx
    ├── NavUser.tsx
    ├── HeaderControls.tsx
    ├── CommandPalette.tsx
    └── CurrencyDisplay.tsx
```

## Custom Hooks

### Binance Hooks (`src/features/binance/`)
```typescript
useBinanceFutures()           // Core API hook
useBinanceAccountData()       // Account summary
useBinanceAdvancedAnalytics() // ADL, volatility
useBinanceBulkExport()        // CSV export
useBinanceExtendedData()      // Extended data
useBinanceMarketData()        // Public market data
useBinanceTransactionHistory()// Transaction log
```

### Trade Hooks (`src/hooks/`)
```typescript
use-trade-entries.ts          // Trade CRUD
use-trading-strategies.ts     // Strategy CRUD
use-trading-pairs.ts          // Pair management
use-trading-gate.ts           // Trading gate status
use-trade-screenshots.ts      // Screenshot upload
```

### Risk Hooks (`src/hooks/`)
```typescript
use-risk-profile.ts           // Risk profile CRUD
use-risk-events.ts            // Risk event log
use-context-aware-risk.ts     // Dynamic risk adjustment
use-daily-pnl.ts              // Local P&L calc
```

### Analytics Hooks (`src/hooks/`)
```typescript
use-binance-daily-pnl.ts      // Binance daily P&L
use-binance-weekly-pnl.ts     // Weekly P&L
use-binance-week-comparison.ts// Week over week
use-contextual-analytics.ts   // Context-based stats
use-unified-market-score.ts   // Market score
use-strategy-performance.ts   // Strategy metrics
```

### AI Hooks (`src/features/ai/`)
```typescript
useAIConfluenceDetection.ts   // Confluence validation
useAIPreflight.ts             // Pre-trade check
useAITradeQuality.ts          // Quality scoring
useDashboardInsights.ts       // AI insights
```

### Utility Hooks (`src/hooks/`)
```typescript
use-auth.ts                   // Authentication
use-accounts.ts               // Account management
use-realtime.ts               // Realtime subscriptions
use-notifications.ts          // Notification system
use-user-settings.ts          // User preferences
use-language.ts               // i18n
use-mobile.tsx                // Mobile detection
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
