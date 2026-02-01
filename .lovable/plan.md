
# Fix AI Insights Widget to Use Unified Portfolio Data (System-First Compliant)

## Problem Analysis

The **AI Insights Widget** (`src/components/dashboard/AIInsightsWidget.tsx`) always uses Paper Trading data, even when Binance is connected. This violates the System-First architecture where Binance should **enrich** the data when available.

### Root Cause

```
Current Flow (Broken):
┌─────────────────────────────────────────────────────────┐
│ AIInsightsWidget                                        │
├─────────────────────────────────────────────────────────┤
│ portfolioData = useMemo(() => {                         │
│   totalBalance = accounts.reduce(...)  ← Paper only ❌  │
│   openTrades = trades.filter(...)      ← Paper only ❌  │
│ })                                                      │
│                                                         │
│ Result: Always shows Paper data even if Binance live    │
└─────────────────────────────────────────────────────────┘

Correct Flow (System-First):
┌─────────────────────────────────────────────────────────┐
│ AIInsightsWidget                                        │
├─────────────────────────────────────────────────────────┤
│ portfolio = useUnifiedPortfolioData()  ← Unified hook   │
│                                                         │
│ if (portfolio.source === 'binance')                     │
│   → Use Binance balance + P&L               ✅          │
│ else                                                    │
│   → Use Paper accounts + trade_entries      ✅          │
└─────────────────────────────────────────────────────────┘
```

### Comparison with PortfolioOverviewCard

`PortfolioOverviewCard.tsx` correctly uses:
```typescript
const portfolio = useUnifiedPortfolioData(); // ✅ Correct
```

`AIInsightsWidget.tsx` incorrectly uses:
```typescript
const { data: allAccounts = [] } = useAccounts();       // ❌ Paper only
const accounts = useMemo(() => allAccounts.filter(...));
const portfolioData = useMemo(() => {
  const totalBalance = accounts.reduce(...);            // ❌ Paper only
  // ...
});
```

---

## Solution

### File: `src/components/dashboard/AIInsightsWidget.tsx`

**Key Changes:**

| Line | Change |
|------|--------|
| 31 | Add import for `useUnifiedPortfolioData` |
| 79-80 | Remove direct `useAccounts()` call |
| Add ~81 | Use `useUnifiedPortfolioData()` hook |
| 117-155 | Refactor `portfolioData` to use unified data |
| Add | Add source badge to show data origin |

---

### Change 1: Add Unified Hook Import (Line 31)

**After line 31:**
```typescript
import { useUnifiedPortfolioData } from "@/hooks/use-unified-portfolio-data";
```

---

### Change 2: Replace Direct Account Query with Unified Hook (Lines 79-80)

**Before:**
```typescript
const { data: allAccounts = [] } = useAccounts();
const accounts = useMemo(() => allAccounts.filter(a => a.is_active), [allAccounts]);
```

**After:**
```typescript
const portfolio = useUnifiedPortfolioData();
```

---

### Change 3: Refactor portfolioData Calculation (Lines 117-155)

**Before (Paper-only):**
```typescript
const portfolioData = useMemo(() => {
  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  const openTrades = trades.filter(t => t.status === 'open');
  const deployedCapital = openTrades.reduce((sum, t) => sum + (t.quantity * t.entry_price), 0);
  
  const today = new Date().toISOString().split('T')[0];
  const todayTrades = trades.filter(t => t.trade_date === today && t.status === 'closed');
  const currentDailyLoss = todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

  return {
    portfolioStatus: {
      totalBalance,
      deployedCapital,
      openPositions: openTrades.length,
    },
    riskStatus: {
      currentDailyLoss: Math.min(currentDailyLoss, 0),
      maxDailyLoss: totalBalance * 0.05,
      tradingAllowed: Math.abs(currentDailyLoss) < totalBalance * 0.05,
    },
    // ...
  };
}, [accounts, trades, strategies]);
```

**After (Unified - Binance-first, Paper fallback):**
```typescript
const portfolioData = useMemo(() => {
  // Use unified portfolio data (Binance if connected, Paper fallback)
  const totalBalance = portfolio.totalCapital;
  const deployedCapital = portfolio.source === 'binance' 
    ? 0 // Binance positions tracked separately
    : trades.filter(t => t.status === 'open').reduce((sum, t) => sum + (t.quantity * t.entry_price), 0);
  
  // Open positions count from appropriate source
  const openPositions = portfolio.source === 'binance'
    ? positions.filter(p => p.positionAmt !== 0).length
    : trades.filter(t => t.status === 'open').length;
  
  // Use unified daily P&L data
  const currentDailyLoss = Math.min(portfolio.todayNetPnl, 0);
  const maxDailyLoss = totalBalance * 0.05;

  return {
    portfolioStatus: {
      totalBalance,
      deployedCapital,
      openPositions,
    },
    riskStatus: {
      currentDailyLoss,
      maxDailyLoss,
      tradingAllowed: Math.abs(currentDailyLoss) < maxDailyLoss,
    },
    recentTrades: trades.slice(0, 20).map(t => ({
      pair: t.pair,
      direction: t.direction,
      result: t.result || 'pending',
      pnl: t.pnl || 0,
      date: t.trade_date,
    })),
    strategies: strategies.map(s => ({
      name: s.name,
      trades: 0,
      winRate: 0,
    })),
    source: portfolio.source, // Pass source to AI for context
  };
}, [portfolio, trades, strategies, positions]);
```

---

### Change 4: Add Source Badge Next to Title (Around Line 232)

**Before:**
```tsx
<CardTitle className="flex items-center gap-2 text-base">
  <Sparkles className="h-5 w-5 text-primary" />
  AI Insights
```

**After:**
```tsx
<CardTitle className="flex items-center gap-2 text-base">
  <Sparkles className="h-5 w-5 text-primary" />
  AI Insights
  <Badge variant="outline" className="text-xs ml-1">
    {portfolio.source === 'binance' ? '🔗 Live' : '📝 Paper'}
  </Badge>
```

---

## Visual Comparison

### Before (Broken - Always Paper)

```
Binance Connected:
┌─────────────────────────────────────────────────────┐
│ ✨ AI Insights                                      │
├─────────────────────────────────────────────────────┤
│ Using Paper Trading data: $5,000 balance            │
│ (Binance wallet: $50,000 - IGNORED) ❌              │
│                                                     │
│ Summary: "Based on your $5,000 portfolio..."        │
│ Recommendations based on wrong data                 │
└─────────────────────────────────────────────────────┘
```

### After (System-First)

```
Binance Connected:
┌─────────────────────────────────────────────────────┐
│ ✨ AI Insights                    [🔗 Live]         │
├─────────────────────────────────────────────────────┤
│ Using Binance data: $50,000 balance                 │
│                                                     │
│ Summary: "Based on your $50,000 portfolio..."  ✅   │
│ Recommendations based on real data                  │
└─────────────────────────────────────────────────────┘

Binance NOT Connected:
┌─────────────────────────────────────────────────────┐
│ ✨ AI Insights                    [📝 Paper]        │
├─────────────────────────────────────────────────────┤
│ Using Paper Trading data: $5,000 balance            │
│                                                     │
│ Summary: "Based on your $5,000 portfolio..."   ✅   │
│ Recommendations based on paper data                 │
└─────────────────────────────────────────────────────┘
```

---

## Files Summary

| File | Action | Lines Changed |
|------|--------|---------------|
| `src/components/dashboard/AIInsightsWidget.tsx` | MODIFY | ~25 lines |

---

## Behavior Matrix After Fix

| Scenario | Data Source | Balance Used | P&L Used |
|----------|-------------|--------------|----------|
| Binance Connected | `useUnifiedPortfolioData` | Binance wallet | Binance daily P&L |
| Binance Disconnected | `useUnifiedPortfolioData` | Paper accounts | Paper trade entries |
| No Accounts | `useUnifiedPortfolioData` | $0 | Trade journal P&L |

---

## Technical Notes

### Why This Approach?

1. **Reuses existing unified hook** - `useUnifiedPortfolioData` already handles all the logic
2. **Consistent with PortfolioOverviewCard** - Same data source, same behavior
3. **Minimal code changes** - Just swap the data source, keep the rest intact
4. **Visual feedback** - Source badge tells user where data comes from

### Dependencies

The widget already imports `useBinancePositions` (line 81) and `useBinanceConnectionStatus` (line 82), so Binance awareness is partially there. We just need to use it for the main portfolio data calculation.
