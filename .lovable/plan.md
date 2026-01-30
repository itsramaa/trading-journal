
# Refactor Plan: Enhance Standalone Pages & Cleanup Unused Components

## Overview
This plan addresses two main objectives:
1. Enhance the **Daily P&L** and **AI Insights** standalone pages to match the features previously available in the Performance Overview tabs
2. Perform a comprehensive cleanup of all unused components across the project

---

## Part 1: Enhance Standalone Pages

### 1.1 Daily P&L Page Enhancement (`src/pages/DailyPnL.tsx`)

**Current Features:**
- Week comparison cards (This Week P&L, Net After Fees, Trades This Week, Win Rate)
- Best/Worst Trade (7 Days) cards
- 7-Day P&L Trend chart

**Features to Add:**
- Export buttons (CSV & PDF) for the weekly data
- Symbol breakdown section showing P&L by trading pair
- Today's P&L summary card at the top

**Implementation:**
- Add `usePerformanceExport` hook for export functionality
- Add export buttons in the header area
- Add a "Today's P&L" summary card using `useBinanceDailyPnl` data
- Add symbol breakdown table/cards showing per-pair performance

### 1.2 AI Insights Page Enhancement (`src/pages/AIInsights.tsx`)

**Current Features:**
- AI Pattern Insights (winning/losing patterns by pair)
- Crypto Ranking (pair performance with recommendations)

**Features to Add (if applicable):**
The AI Insights page already contains the core features. No additional features are required as the Pattern Insights and Crypto Ranking components provide comprehensive AI-powered analysis.

---

## Part 2: Comprehensive Unused Components Cleanup

### 2.1 Unused Dashboard Components (DELETE)

| File | Reason |
|------|--------|
| `src/components/dashboard/TradingDashboardContent.tsx` | Not imported anywhere |
| `src/components/dashboard/ActivePositionsTable.tsx` | Replaced by `BinancePositionsTable`, not imported |
| `src/components/dashboard/BinanceBalanceWidget.tsx` | Removed from Dashboard, not imported |
| `src/components/dashboard/BinancePositionsTable.tsx` | Removed from Dashboard, not imported |

### 2.2 Unused Trading Components (DELETE)

| File | Reason |
|------|--------|
| `src/components/trading/BacktestAccountManager.tsx` | Not imported anywhere, backtest tab removed |
| `src/components/trading/FundingRateTracker.tsx` | Not imported anywhere |

### 2.3 Potential Unused Hooks (REVIEW)

These hooks may need review but are likely still used:
- `src/hooks/use-daily-pnl.ts` - Used by `TodayPerformance` component (KEEP)

---

## Technical Implementation Details

### Step 1: Enhance Daily P&L Page

```text
src/pages/DailyPnL.tsx
├── Add import: usePerformanceExport
├── Add import: useBinanceDailyPnl (already present)
├── Add header export buttons (CSV/PDF)
├── Add Today's P&L summary card
└── Add Symbol Breakdown section (if bySymbol data available)
```

**New UI Layout:**
```text
┌─────────────────────────────────────────────────────┐
│ Daily P&L                    [Export CSV] [PDF]     │
├─────────────────────────────────────────────────────┤
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────┐ │
│ │This Week  │ │Net Fees   │ │Trades     │ │WinRate│ │
│ │P&L        │ │           │ │This Week  │ │       │ │
│ └───────────┘ └───────────┘ └───────────┘ └───────┘ │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────┐ ┌─────────────────────────┐ │
│ │Best Trade (7 Days)  │ │Worst Trade (7 Days)     │ │
│ └─────────────────────┘ └─────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ 7-Day P&L Trend Chart                           │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ Symbol Breakdown (P&L by Pair)                  │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Step 2: Delete Unused Files

Files to be deleted:
1. `src/components/dashboard/TradingDashboardContent.tsx`
2. `src/components/dashboard/ActivePositionsTable.tsx`
3. `src/components/dashboard/BinanceBalanceWidget.tsx`
4. `src/components/dashboard/BinancePositionsTable.tsx`
5. `src/components/trading/BacktestAccountManager.tsx`
6. `src/components/trading/FundingRateTracker.tsx`

### Step 3: Verify No Import Errors

After deletion, run a project-wide search to ensure no broken imports exist.

---

## Files to Modify

| File | Action |
|------|--------|
| `src/pages/DailyPnL.tsx` | Enhance with export buttons and symbol breakdown |
| `src/components/dashboard/TradingDashboardContent.tsx` | DELETE |
| `src/components/dashboard/ActivePositionsTable.tsx` | DELETE |
| `src/components/dashboard/BinanceBalanceWidget.tsx` | DELETE |
| `src/components/dashboard/BinancePositionsTable.tsx` | DELETE |
| `src/components/trading/BacktestAccountManager.tsx` | DELETE |
| `src/components/trading/FundingRateTracker.tsx` | DELETE |

---

## Expected Outcome

1. **Daily P&L Page**: Full-featured with export capability and symbol breakdown
2. **AI Insights Page**: Already complete with Pattern Insights and Crypto Ranking
3. **Codebase**: Cleaner with 6 unused component files removed
4. **Bundle Size**: Reduced by removing dead code

---

## Risk Assessment

- **Low Risk**: Deleting unused components that have no imports
- **Testing Required**: Verify all pages still load correctly after cleanup
- **No Breaking Changes**: Only removing dead code and enhancing existing features
