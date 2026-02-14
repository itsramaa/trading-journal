
# Fix: Trade Detail Page Crashes for Binance Positions

## Problem

Navigating to `/trading/binance-DUSKUSDT` causes a database error because the `TradeDetail` page queries `trade_entries.id` (a UUID column) with a non-UUID string like `binance-DUSKUSDT`. Binance positions are not stored in `trade_entries` -- they exist only as live API data mapped into `UnifiedPosition`.

## Root Cause

The `AllPositionsTable` generates IDs for Binance positions as `binance-{symbol}` (line ~108 in the table component). When the Eye icon navigates to `/trading/binance-DUSKUSDT`, the detail page tries to fetch from the database using this synthetic ID, which fails because PostgreSQL expects a UUID.

## Fix

The `TradeDetail` page needs to handle two cases:

1. **Paper trades** (UUID IDs) -- fetch from `trade_entries` as currently implemented
2. **Binance positions** (IDs starting with `binance-`) -- display available data from Binance API, not from database

### Changes

**File: `src/pages/trading-journey/TradeDetail.tsx`**

1. Detect if `tradeId` starts with `binance-` to determine the source
2. For Binance positions:
   - Extract the symbol from the ID (`binance-DUSKUSDT` -> `DUSKUSDT`)
   - Fetch live position data using the existing `useBinancePositions` hook (or `useBinanceAccount`)
   - Find the matching position by symbol
   - Render the detail page with available Binance fields (symbol, direction, entry price, mark price, unrealized P&L, leverage, quantity)
   - Sections not available from Binance API (journal enrichment, screenshots, strategies) show empty/dash states
3. For Paper trades:
   - Keep the existing UUID-based database fetch unchanged

### Technical Detail

```typescript
const isBinancePosition = tradeId?.startsWith('binance-');
const binanceSymbol = isBinancePosition ? tradeId.replace('binance-', '') : null;

// Conditional query: only fetch from DB for paper trades
const { data: trade, isLoading, error } = useQuery({
  queryKey: ["trade-detail", tradeId],
  queryFn: async () => {
    // ... existing DB fetch logic
  },
  enabled: !!user?.id && !!tradeId && !isBinancePosition,
});

// For Binance: use existing positions hook
const { positions: binancePositions } = useBinancePositions();
const binanceTrade = isBinancePosition
  ? binancePositions?.find(p => p.symbol === binanceSymbol)
  : null;

// Merge into a common display object
const displayData = isBinancePosition ? mapBinanceToDisplay(binanceTrade) : trade;
```

This ensures:
- No invalid UUID query is ever sent to the database
- Binance positions render with all available real-time data
- The page layout remains identical for both sources -- only the data differs
- The "Enrich" button still works (it already handles Binance positions via `UnifiedPosition`)
