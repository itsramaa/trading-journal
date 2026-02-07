
# Plan: Complete Currency Conversion Implementation Across All Components

## Problem Analysis

Cross-check menemukan **banyak komponen yang masih menggunakan hardcoded USD formatting**:

### Components dengan `formatCurrency(..., 'USD')` atau `formatPnl(..., 'USD')`:
| File | Lines | Issue |
|------|-------|-------|
| `src/pages/Dashboard.tsx` | 152, 157 | Hardcoded USD untuk Active Positions |
| `src/pages/TradingHeatmap.tsx` | 310, 328, 346, 373, 395 | Session P&L stats hardcoded USD |
| `src/components/journal/PositionDialogs.tsx` | 69, 128 | Entry price formatting |
| `src/components/trading/TradeHistoryCard.tsx` | 151, 200, 201 | P&L dan price formatting |
| `src/components/trading/BinanceTransactionHistory.tsx` | 107, 122, 141, 202 | Transaction amounts |
| `src/components/analytics/TradingHeatmap.tsx` | 268, 273 | Tooltip P&L formatting |
| `src/components/analytics/TradingHeatmapChart.tsx` | 195, 204 | Tooltip P&L formatting |

### Components dengan inline `${}...toFixed()` atau `${}...toLocaleString()`:
| File | Lines | Issue |
|------|-------|-------|
| `src/components/journal/PositionsTable.tsx` | 84, 87, 93, 96 | All position values hardcoded $ |
| `src/components/trade/entry/TradeConfirmation.tsx` | 102, 112, 118, 146, 150 | Entry/SL/TP prices hardcoded $ |
| `src/components/trade/entry/FinalChecklist.tsx` | 319 | Risk amount hardcoded $ |
| `src/components/market/MarketSentimentWidget.tsx` | 372 | Mark price hardcoded $ |
| `src/components/strategy/BacktestResults.tsx` | 262, 277 | Backtest chart tooltips |
| `src/components/analytics/DrawdownChart.tsx` | No currency, only % - OK |

---

## Implementation Strategy

### Approach: Props vs Hook

**Use `useCurrencyConversion()` hook** di komponen yang:
- Standalone (tidak menerima data dari parent)
- Page-level components

**Receive `formatCurrency` prop** di komponen yang:
- Child components yang dipanggil oleh parent
- Pure display components

---

## Phase 1: Dashboard & Active Positions

### 1.1 `src/pages/Dashboard.tsx`
**Current:**
```typescript
<span className="font-mono-numbers">${position.entryPrice.toFixed(2)}</span>
{pnl >= 0 ? '+' : ''}{formatCurrency(pnl, 'USD')}
```

**Fix:**
- Import `useCurrencyConversion`
- Use hook's `format()` and `formatPnl()` functions

---

## Phase 2: Trading Heatmap Page

### 2.1 `src/pages/TradingHeatmap.tsx`
**Current:**
```typescript
{formatPnl(sessionStats.asia.pnl, 'USD')}
```

**Fix:**
- Import `useCurrencyConversion`
- Replace all `formatPnl(..., 'USD')` with hook's `formatPnl()`

---

## Phase 3: Journal Components

### 3.1 `src/components/journal/PositionsTable.tsx`
**Current:**
```typescript
${position.entryPrice.toFixed(2)}
${position.markPrice.toFixed(2)}
${position.unrealizedPnl.toFixed(2)}
${position.liquidationPrice.toFixed(2)}
```

**Fix:**
- Import `useCurrencyConversion`
- Use `format()` for all price/value displays

### 3.2 `src/components/journal/PositionDialogs.tsx`
**Current:** Receives `formatCurrency` prop but caller passes hardcoded 'USD'

**Fix:** Caller (`TradingJournal.tsx`) must use hook and pass converted formatter

---

## Phase 4: Trading Components

### 4.1 `src/components/trading/TradeHistoryCard.tsx`
**Current:** Receives `formatCurrency` prop but often called with hardcoded formatter

**Fix:** Ensure all callers pass currency-converted formatter

### 4.2 `src/components/trading/BinanceTransactionHistory.tsx`
**Current:**
```typescript
{formatCurrency(summary.totalDeposits, 'USD')}
```

**Fix:**
- Import `useCurrencyConversion`
- Use hook's formatter

---

## Phase 5: Analytics Components

### 5.1 `src/components/analytics/TradingHeatmap.tsx`
**Current:**
```typescript
formatCurrency(cell.totalPnl, 'USD')
```

**Fix:**
- Import `useCurrencyConversion`
- Also fix inline `formatPnlDisplay()` to use conversion

### 5.2 `src/components/analytics/TradingHeatmapChart.tsx`
**Current:**
```typescript
{formatPnl(data.totalPnl)}
{formatPnl(data.avgPnl)}
```

**Fix:**
- Import `useCurrencyConversion`
- Use hook's `formatPnl()`

---

## Phase 6: Trade Entry Wizard

### 6.1 `src/components/trade/entry/TradeConfirmation.tsx`
**Current:**
```typescript
${priceLevels.entryPrice.toLocaleString()}
${priceLevels.stopLoss.toLocaleString()}
-${positionSizing.risk_amount.toFixed(2)}
```

**Fix:**
- Import `useCurrencyConversion`
- Use hook's `format()` for all monetary values

### 6.2 `src/components/trade/entry/FinalChecklist.tsx`
**Current:**
```typescript
${positionSizing?.risk_amount.toFixed(2) || 0}
```

**Fix:**
- Import `useCurrencyConversion`
- Use hook's `format()` for risk amount

---

## Phase 7: Market Components

### 7.1 `src/components/market/MarketSentimentWidget.tsx`
**Current:**
```typescript
${sentiment.rawData.markPrice.markPrice.toLocaleString(...)}
```

**Note:** Market prices should stay in USD as they are exchange prices, not user balances. 
**Decision:** Keep USD for market data prices (this is intentional - exchange prices are always in USD/USDT).

---

## Phase 8: Strategy/Backtest Components

### 8.1 `src/components/strategy/BacktestResults.tsx`
**Current:**
```typescript
tickFormatter={(v) => `$${v.toLocaleString()}`}
formatter={(value) => [`$${value.toFixed(2)}`, 'Balance']}
```

**Fix:**
- Import `useCurrencyConversion`
- Use hook for chart formatters

---

## Phase 9: AllPositionsTable

### 9.1 `src/components/journal/AllPositionsTable.tsx`
**Current:** Receives `formatCurrency` prop - OK
**Fix:** Ensure caller passes converted formatter

---

## Implementation Order

```text
Phase 1: Page-Level Components (highest impact)
├── 1.1 Dashboard.tsx - Active Positions section
└── 1.2 TradingHeatmap.tsx - Session stats

Phase 2: Journal/Position Components
├── 2.1 PositionsTable.tsx - Main positions view
├── 2.2 PositionDialogs.tsx - Already has prop, fix caller
└── 2.3 AllPositionsTable.tsx - Already has prop, verify caller

Phase 3: Trading History Components
├── 3.1 BinanceTransactionHistory.tsx - Transaction amounts
└── 3.2 TradeHistoryCard.tsx - Verify callers

Phase 4: Analytics Heatmaps
├── 4.1 TradingHeatmap.tsx - Tooltip values
└── 4.2 TradingHeatmapChart.tsx - Chart tooltips

Phase 5: Trade Entry Wizard
├── 5.1 TradeConfirmation.tsx - All price displays
└── 5.2 FinalChecklist.tsx - Risk amount

Phase 6: Strategy Components
└── 6.1 BacktestResults.tsx - Chart formatters
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Add hook, fix Active Positions formatting |
| `src/pages/TradingHeatmap.tsx` | Add hook, fix all session P&L displays |
| `src/components/journal/PositionsTable.tsx` | Add hook, fix all price/pnl cells |
| `src/components/trading/BinanceTransactionHistory.tsx` | Add hook, fix all amounts |
| `src/components/analytics/TradingHeatmap.tsx` | Add hook, fix tooltip and inline display |
| `src/components/analytics/TradingHeatmapChart.tsx` | Add hook, fix tooltip formatters |
| `src/components/trade/entry/TradeConfirmation.tsx` | Add hook, fix all prices and amounts |
| `src/components/trade/entry/FinalChecklist.tsx` | Add hook, fix risk amount |
| `src/components/strategy/BacktestResults.tsx` | Add hook, fix chart formatters |
| `src/pages/trading-journey/TradingJournal.tsx` | Verify passing converted formatter to dialogs |

---

## Exceptions (Keep USD)

Components where USD should remain (exchange/market prices):
- `MarketSentimentWidget.tsx` - Exchange mark prices
- `AIAnalysisTab.tsx` - Signal prices from exchange

These show actual exchange prices which are denominated in USDT, not user's display currency.

---

## Technical Notes

### Hook Usage Pattern
```typescript
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";

function MyComponent() {
  const { format, formatPnl, formatCompact } = useCurrencyConversion();
  
  // Use format() instead of formatCurrency(value, 'USD')
  // Use formatPnl() instead of formatPnl(value, 'USD')
  return <span>{formatPnl(pnlValue)}</span>;
}
```

### For Child Components
```typescript
// Parent provides formatter
<ChildComponent formatCurrency={format} />

// Child uses prop
function ChildComponent({ formatCurrency }: { formatCurrency: (v: number) => string }) {
  return <span>{formatCurrency(value)}</span>;
}
```

---

## Outcome

After implementation:
1. All monetary values converted to user's preferred currency (USD/IDR)
2. IDR values use Indonesian notation (k, jt, m, t)
3. Real-time exchange rate applied consistently
4. Exchange/market prices remain in USD (intentional)
5. Consistent display across all pages and components
