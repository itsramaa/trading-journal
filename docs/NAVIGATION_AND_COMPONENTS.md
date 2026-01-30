# Trading Journey - Navigation & Component Architecture

> Dokumentasi lengkap struktur navigasi, penempatan komponen, dan arsitektur fitur aplikasi Trading Journey.

**Last Updated:** January 2025  
**Framework:** React + Vite + TypeScript  
**UI Library:** shadcn/ui + Tailwind CSS

---

## Table of Contents

1. [Application Structure](#application-structure)
2. [Navigation Architecture](#navigation-architecture)
3. [Route Configuration](#route-configuration)
4. [Page Layouts](#page-layouts)
5. [Component Directory](#component-directory)
6. [Feature Placement](#feature-placement)
7. [Design System](#design-system)
8. [Mobile Responsiveness](#mobile-responsiveness)

---

## Application Structure

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   ThemeProvider                          ││
│  │  ┌─────────────────────────────────────────────────────┐││
│  │  │               QueryClientProvider                    │││
│  │  │  ┌─────────────────────────────────────────────────┐│││
│  │  │  │                 BrowserRouter                    ││││
│  │  │  │  ┌───────────────────────────────────────────┐  ││││
│  │  │  │  │           ProtectedRoute                   │  ││││
│  │  │  │  │  ┌─────────────────────────────────────┐  │  ││││
│  │  │  │  │  │        DashboardLayout              │  │  ││││
│  │  │  │  │  │  ┌───────────┬─────────────────┐   │  │  ││││
│  │  │  │  │  │  │  Sidebar  │   Page Content  │   │  │  ││││
│  │  │  │  │  │  └───────────┴─────────────────┘   │  │  ││││
│  │  │  │  │  └─────────────────────────────────────┘  │  ││││
│  │  │  │  └───────────────────────────────────────────┘  ││││
│  │  │  │                                                  ││││
│  │  │  │  ┌───────────────────────────────────────────┐  ││││
│  │  │  │  │              AIChatbot (Floating)         │  ││││
│  │  │  │  └───────────────────────────────────────────┘  ││││
│  │  │  └─────────────────────────────────────────────────┘│││
│  │  └─────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Provider Stack

| Provider | Purpose | Location |
|----------|---------|----------|
| `QueryClientProvider` | React Query state management | App.tsx |
| `ThemeProvider` | Dark/Light mode theming | App.tsx |
| `TooltipProvider` | Global tooltip context | App.tsx |
| `SidebarProvider` | Sidebar collapse state | DashboardLayout.tsx |

---

## Navigation Architecture

### Sidebar Menu (10 Items)

```
┌──────────────────────────────┐
│ 🕯️ Trading Journey           │  ← Logo & Brand
│    Journal & Analytics       │
├──────────────────────────────┤
│ 📊 Dashboard          /      │  ← Home/Overview
│ 🏦 Accounts           /accounts │
│ 📅 Calendar           /calendar │
│ 📈 Market Insight     /market │
│ 🛡️ Risk Management    /risk  │
│ 🎯 Trade Quality      /ai    │  ← AI Assistant
│ 📓 Trade Management   /trading │
│ 💡 Strategy & Rules   /strategies │
│ 📉 Performance        /performance │
│ ⚙️ Settings           /settings │
├──────────────────────────────┤
│ 👤 User Profile              │  ← NavUser Component
│    user@email.com            │
│    [Sign Out]                │
└──────────────────────────────┘
```

### Navigation Order Rationale

1. **Dashboard** - Primary entry point, overview of all metrics
2. **Accounts** - Account setup (Binance connection, Paper Trading)
3. **Calendar** - Economic events for trade planning
4. **Market Insight** - AI sentiment & market analysis
5. **Risk Management** - Pre-trade risk assessment
6. **Trade Quality** - AI-powered trade validation
7. **Trade Management** - Active trading & journaling
8. **Strategy & Rules** - Strategy configuration
9. **Performance** - Post-trade analytics
10. **Settings** - System configuration

### Active State Detection

```typescript
const isActive = (url: string) => {
  if (url === "/") {
    return location.pathname === "/";
  }
  return location.pathname === url || location.pathname.startsWith(url + "/");
};
```

---

## Route Configuration

### Public Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/auth` | `Auth.tsx` | Login/Register/Password Reset |

### Protected Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Dashboard.tsx` | Main dashboard with stats |
| `/accounts` | `Accounts.tsx` | Account management |
| `/accounts/:accountId` | `AccountDetail.tsx` | Single account details |
| `/calendar` | `Calendar.tsx` | Economic calendar |
| `/market` | `MarketInsight.tsx` | AI market analysis |
| `/risk` | `RiskManagement.tsx` | Risk settings & tracking |
| `/ai` | `AIAssistant.tsx` | Trade quality assistant |
| `/trading` | `TradingJournal.tsx` | Trade journal & entries |
| `/strategies` | `StrategyManagement.tsx` | Strategy configuration |
| `/performance` | `Performance.tsx` | Analytics & reports |
| `/settings` | `Settings.tsx` | App settings |
| `/notifications` | `Notifications.tsx` | User notifications |
| `*` | `NotFound.tsx` | 404 page |

### Route Hierarchy

```
/
├── auth                    (public)
├── /                       (Dashboard)
├── accounts/
│   └── :accountId         (Account Detail)
├── calendar/
├── market/
├── risk/
├── ai/
├── trading/
├── strategies/
├── performance/
├── settings/
├── notifications/
└── *                       (404)
```

---

## Page Layouts

### DashboardLayout Structure

```typescript
<SidebarProvider>
  <div className="min-h-screen flex w-full">
    <AppSidebar />
    <SidebarInset>
      <header className="sticky top-0 z-50 ...">
        <SidebarTrigger />
        <Separator />
        <Breadcrumb />
        <HeaderControls />  {/* Currency, Notifications */}
      </header>
      <RiskAlertBanner />   {/* Conditional risk warnings */}
      <main className="flex-1 p-4 md:p-6 pt-4">
        {children}
      </main>
    </SidebarInset>
  </div>
</SidebarProvider>
```

### Page Template Pattern

```typescript
export default function PageName() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Page Title</h1>
            <p className="text-muted-foreground">Description</p>
          </div>
          <div className="flex gap-2">
            {/* Action buttons */}
          </div>
        </div>

        {/* Content Sections */}
        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Cards/Widgets */}
        </div>
      </div>
    </DashboardLayout>
  );
}
```

---

## Component Directory

### Component Organization

```
src/components/
├── accounts/               # Account management UI
│   ├── AccountCardList.tsx
│   ├── AccountSelect.tsx
│   ├── AccountTransactionDialog.tsx
│   ├── AccountTransactionsTable.tsx
│   └── AddAccountForm.tsx
│
├── analytics/              # Performance visualizations
│   ├── AIPatternInsights.tsx
│   ├── CryptoRanking.tsx
│   ├── DrawdownChart.tsx
│   └── TradingHeatmap.tsx
│
├── chat/                   # AI Chatbot system
│   ├── AIChatbot.tsx       # Main floating chatbot
│   ├── ChatMessage.tsx     # Message rendering
│   ├── QuickActionsPanel.tsx
│   └── TipsPanel.tsx
│
├── dashboard/              # Dashboard widgets
│   ├── AIInsightsWidget.tsx
│   ├── ActivePositionsTable.tsx
│   ├── BinanceBalanceWidget.tsx
│   ├── BinancePositionsTable.tsx
│   ├── MarketSessionsWidget.tsx
│   ├── SystemStatusIndicator.tsx
│   ├── TodayPerformance.tsx
│   └── TradingDashboardContent.tsx
│
├── journal/                # Trading journal components
│   ├── BinancePositionsTab.tsx
│   ├── OpenPositionsTable.tsx
│   ├── PositionDialogs.tsx
│   ├── TradeFilters.tsx
│   ├── TradeHistoryTabs.tsx
│   ├── TradeQuickEntryForm.tsx
│   ├── TradeSummaryStats.tsx
│   └── index.ts            # Barrel export
│
├── layout/                 # Layout components
│   ├── AppSidebar.tsx
│   ├── CurrencyDisplay.tsx
│   ├── DashboardLayout.tsx
│   ├── HeaderControls.tsx
│   └── NavUser.tsx
│
├── market-insight/         # Market analysis
│   └── CombinedAnalysisCard.tsx
│
├── risk/                   # Risk management
│   ├── calculator/         # Position size calculator
│   │   ├── CalculatorInputs.tsx
│   │   ├── CalculatorResults.tsx
│   │   ├── QuickReferenceR.tsx
│   │   └── index.ts
│   ├── CorrelationMatrix.tsx
│   ├── DailyLossTracker.tsx
│   ├── PositionSizeCalculator.tsx
│   ├── RiskAlertBanner.tsx
│   ├── RiskEventLog.tsx
│   ├── RiskProfileSummaryCard.tsx
│   ├── RiskSettingsForm.tsx
│   ├── RiskSummaryCard.tsx
│   └── index.ts
│
├── settings/               # Settings components
│   ├── AISettingsTab.tsx
│   └── BinanceApiSettings.tsx
│
├── strategy/               # Strategy management
│   ├── BacktestComparison.tsx
│   ├── BacktestResults.tsx
│   ├── BacktestRunner.tsx
│   ├── EntryRulesBuilder.tsx
│   ├── ExitRulesBuilder.tsx
│   ├── StrategyCard.tsx
│   ├── StrategyFormDialog.tsx
│   ├── StrategyStats.tsx
│   ├── StrategyValidationBadge.tsx
│   ├── YouTubeStrategyImporter.tsx
│   └── index.ts
│
├── trade/                  # Trade entry system
│   └── entry/              # 5-step wizard
│       ├── ConfluenceValidator.tsx
│       ├── FinalChecklist.tsx
│       ├── PositionSizingStep.tsx
│       ├── SetupStep.tsx
│       ├── TradeConfirmation.tsx
│       ├── TradeEntryWizard.tsx
│       └── WizardProgress.tsx
│
├── trading/                # Trading utilities
│   ├── BacktestAccountManager.tsx
│   ├── BinanceIncomeHistory.tsx
│   ├── BinanceTradeHistory.tsx
│   ├── DateRangeFilter.tsx
│   ├── FundingRateTracker.tsx
│   └── TradeHistoryCard.tsx
│
├── ui/                     # shadcn/ui components
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── ... (50+ components)
│   └── trading-pair-combobox.tsx
│
└── ProtectedRoute.tsx      # Auth guard
```

---

## Feature Placement

### Dashboard (`/`)

```
┌─────────────────────────────────────────────────────────────┐
│ DASHBOARD                                    [Currency] [🔔] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │             TodayPerformance (24H Stats)                │ │
│ │  [Net P&L] [Win Rate] [Trades] [Commissions]            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌──────────────────────┐ ┌──────────────────────┐          │
│ │ BinanceBalanceWidget │ │   AIInsightsWidget   │          │
│ │ - Total Balance      │ │ - AI Recommendations │          │
│ │ - Available          │ │ - Risk Alerts        │          │
│ │ - Unrealized PnL     │ │ - Suggestions        │          │
│ └──────────────────────┘ └──────────────────────┘          │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │              BinancePositionsTable                       │ │
│ │ Active Positions from Binance Futures                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐      │
│ │ Current Streak│ │   Best Day    │ │  Worst Day    │      │
│ │ 🔥 5 wins     │ │ +$1,234       │ │ -$567         │      │
│ └───────────────┘ └───────────────┘ └───────────────┘      │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │            MarketSessionsWidget                          │ │
│ │ [Sydney] [Tokyo] [London] [New York]                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Trading Journal (`/trading`)

```
┌─────────────────────────────────────────────────────────────┐
│ TRADING JOURNAL                              [+ New Trade]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                 TradeSummaryStats                        │ │
│ │ [Total P&L] [Win Rate] [Profit Factor] [Total Trades]   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Binance Positions] [Open] [History] [Import Binance]   │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │                                                          │ │
│ │ Tab: Binance Positions                                   │ │
│ │ └─ BinancePositionsTab.tsx                              │ │
│ │                                                          │ │
│ │ Tab: Open (Paper)                                        │ │
│ │ └─ OpenPositionsTable.tsx                               │ │
│ │                                                          │ │
│ │ Tab: History                                             │ │
│ │ └─ TradeHistoryTabs.tsx                                 │ │
│ │     ├─ [Binance History] - BinanceTradeHistory.tsx      │ │
│ │     └─ [Paper History] - TradeHistoryCard.tsx           │ │
│ │                                                          │ │
│ │ Tab: Import from Binance                                 │ │
│ │ └─ Bulk sync interface                                  │ │
│ │                                                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                   TradeFilters                           │ │
│ │ [Pair ▼] [Direction ▼] [Status ▼] [Date Range]         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Risk Management (`/risk`)

```
┌─────────────────────────────────────────────────────────────┐
│ RISK MANAGEMENT                              [Edit Profile]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                  DailyLossTracker                        │ │
│ │ [========================================] 45% used      │ │
│ │ Daily Loss: $225 / $500 limit                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌──────────────────────┐ ┌──────────────────────┐          │
│ │ RiskProfileSummary   │ │   RiskSummaryCard    │          │
│ │ - Risk per trade: 2% │ │ - Open positions     │          │
│ │ - Max daily loss: 5% │ │ - Capital deployed   │          │
│ │ - Max positions: 3   │ │ - Correlated exp     │          │
│ └──────────────────────┘ └──────────────────────┘          │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │              PositionSizeCalculator                      │ │
│ │ ┌─────────────────────┐ ┌─────────────────────┐         │ │
│ │ │  CalculatorInputs   │ │  CalculatorResults  │         │ │
│ │ │  - Entry Price      │ │  - Position Size    │         │ │
│ │ │  - Stop Loss        │ │  - Risk Amount      │         │ │
│ │ │  - Risk %           │ │  - R:R Ratio        │         │ │
│ │ └─────────────────────┘ └─────────────────────┘         │ │
│ │                  QuickReferenceR                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌──────────────────────┐ ┌──────────────────────┐          │
│ │  CorrelationMatrix   │ │    RiskEventLog      │          │
│ │  [BTC][ETH][SOL]     │ │ - Warning 70%        │          │
│ │  [correlation grid]  │ │ - Trading disabled   │          │
│ └──────────────────────┘ └──────────────────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Strategy Management (`/strategies`)

```
┌─────────────────────────────────────────────────────────────┐
│ STRATEGY & RULES                          [+ New Strategy]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                    StrategyStats                         │ │
│ │ [Total] [Active] [Win Rate] [Best Performer]            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌──────────────────────┐ ┌──────────────────────┐          │
│ │    StrategyCard      │ │    StrategyCard      │          │
│ │ ┌──────────────────┐ │ │ ┌──────────────────┐ │          │
│ │ │ValidationBadge   │ │ │ │ValidationBadge   │ │          │
│ │ └──────────────────┘ │ │ └──────────────────┘ │          │
│ │ Name: Scalping       │ │ Name: Swing Trading │          │
│ │ Trades: 45           │ │ Trades: 12          │          │
│ │ Win Rate: 68%        │ │ Win Rate: 75%       │          │
│ │ [Edit] [Backtest]    │ │ [Edit] [Backtest]   │          │
│ └──────────────────────┘ └──────────────────────┘          │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │              YouTubeStrategyImporter                     │ │
│ │ [Paste YouTube URL] [Import with AI]                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                   BacktestRunner                         │ │
│ │ [Select Strategy ▼] [Pair ▼] [Date Range] [Run]         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │               BacktestResults / Comparison               │ │
│ │ Equity Curve, Metrics, Trade List                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Trade Entry Wizard (Dialog)

```
┌─────────────────────────────────────────────────────────────┐
│ TRADE ENTRY WIZARD                                    [X]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                   WizardProgress                         │ │
│ │ (1)───(2)───(3)───(4)───(5)                             │ │
│ │ Setup Conf  Size  Check Execute                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Step 1: SetupStep                                            │
│ ├─ Account Selection                                         │
│ ├─ AI Pre-flight Check                                       │
│ ├─ Strategy Selection                                        │
│ ├─ Pair (TradingPairCombobox)                               │
│ ├─ Direction (Long/Short)                                    │
│ └─ Timeframe                                                 │
│                                                              │
│ Step 2: ConfluenceValidator                                  │
│ └─ Dynamic entry rules checklist                             │
│                                                              │
│ Step 3: PositionSizingStep                                   │
│ ├─ Entry Price                                               │
│ ├─ Stop Loss                                                 │
│ ├─ Take Profit                                               │
│ └─ R:R Calculator                                            │
│                                                              │
│ Step 4: FinalChecklist                                       │
│ ├─ Emotional State                                           │
│ ├─ Confidence Level                                          │
│ ├─ AI Final Verdict                                          │
│ ├─ Pre-Trade Summary                                         │
│ └─ Trade Comment                                             │
│                                                              │
│ Step 5: TradeConfirmation                                    │
│ └─ Final review & execute                                    │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [← Previous]                              [Next →]       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### AI Floating Chatbot

```
┌──────────────────────────────────────┐
│ 💬 AI Trading Assistant         [—][X]│
├──────────────────────────────────────┤
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ ChatMessage (AI)                 │ │
│ │ "Based on your recent trades..." │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ ChatMessage (User)               │ │
│ │ "Analyze BTCUSDT setup"          │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │         QuickActionsPanel        │ │
│ │ [Analyze] [Review] [Suggest]     │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │           TipsPanel              │ │
│ │ "Try asking about risk..."       │ │
│ └──────────────────────────────────┘ │
│                                      │
├──────────────────────────────────────┤
│ [Type your message...      ] [Send]  │
└──────────────────────────────────────┘
```

---

## Design System

### Spacing Guidelines

| Context | Class | Value |
|---------|-------|-------|
| Page sections | `space-y-8` | 32px |
| Card content | `space-y-4` | 16px |
| Grid gaps | `gap-4 md:gap-6` | 16px / 24px |
| Padding | `p-4 md:p-6` | 16px / 24px |

### Card Header Pattern

```tsx
<CardHeader className="flex flex-row items-center gap-2">
  <Icon className="h-5 w-5 text-primary" />
  <CardTitle>Title</CardTitle>
  <Badge variant="secondary">Optional</Badge>
</CardHeader>
```

### Empty State Pattern

```tsx
<div className="flex flex-col items-center justify-center p-8 text-center">
  <Icon className="h-12 w-12 text-muted-foreground/50 mb-4" />
  <h3 className="text-lg font-medium">No Data</h3>
  <p className="text-sm text-muted-foreground mb-4">Description</p>
  <Button>CTA</Button>
</div>
```

### Loading Skeleton Pattern

```tsx
<Card>
  <CardHeader>
    <Skeleton className="h-6 w-32" />
  </CardHeader>
  <CardContent className="space-y-4">
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
  </CardContent>
</Card>
```

---

## Mobile Responsiveness

### Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |

### Responsive Patterns

```tsx
// Grid columns
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

// Text visibility
<span className="hidden sm:inline">Full Text</span>
<span className="sm:hidden">Short</span>

// Padding
<div className="p-4 md:p-6">

// Sidebar collapse
<Sidebar collapsible="icon">
```

### Mobile-Specific Considerations

1. **Sidebar** - Collapsible to icon-only mode
2. **Tables** - Horizontal scroll on small screens
3. **Dialogs** - Full-screen on mobile (`DrawerDialog` pattern)
4. **Charts** - Simplified on mobile
5. **Forms** - Stacked layout on mobile

---

## Global Components

### Always Visible

| Component | Location | Purpose |
|-----------|----------|---------|
| `AppSidebar` | Left side | Navigation |
| `HeaderControls` | Top right | Currency, Notifications |
| `RiskAlertBanner` | Below header | Risk warnings |
| `AIChatbot` | Floating bottom-right | AI assistant |
| `Toaster` | Bottom right | Toast notifications |
| `Sonner` | Top right | Sonner notifications |

### Conditional Components

| Component | Condition |
|-----------|-----------|
| `RiskAlertBanner` | Daily loss > 70% |
| `TradeEntryWizard` | User initiates new trade |
| `StrategyFormDialog` | Create/edit strategy |
| `PositionDialogs` | View/close position |

---

## File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Page | `PascalCase.tsx` | `Dashboard.tsx` |
| Component | `PascalCase.tsx` | `TradeFilters.tsx` |
| Hook | `use-kebab-case.ts` | `use-auth.ts` |
| Utility | `kebab-case.ts` | `trading-calculations.ts` |
| Type | `kebab-case.ts` | `trade-wizard.ts` |
| Barrel export | `index.ts` | `src/components/risk/index.ts` |

---

## Related Documentation

- [Test Suite Documentation](./TEST_SUITE_DOCUMENTATION.md)
- [Trading Journey User Flow](./Trading_Journey_User_Flow.md)
- [AI Integration Documentation](./ai_plan.md)
- [Binance Futures Implementation](./binance/BINANCE_FUTURES_API_IMPLEMENTATION.md)

---

*This documentation reflects the current state of the Trading Journey application architecture.*
