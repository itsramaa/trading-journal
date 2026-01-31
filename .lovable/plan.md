# Plan: Hapus Algo Orders & Fix Market Data Page

## Status: ✅ COMPLETED

## Changes Made

### 1. Algo Orders Removal ✅
- **Deleted**: `src/features/binance/useBinanceAlgoOrders.ts`
- **Deleted**: `src/components/trading/AlgoOrdersTab.tsx`
- **Updated**: `src/features/binance/index.ts` - removed algo exports
- **Updated**: `src/features/binance/types.ts` - removed algo action types
- **Updated**: `src/pages/trading-journey/TradingJournal.tsx` - removed algo tab (grid-cols-3 → grid-cols-2)
- **Updated**: `supabase/functions/binance-futures/index.ts` - removed case handlers (functions left as dead code)

### 2. Whale & Opportunities Filter Fix ✅
- **Root cause**: API returns `asset: 'BTC'` but filter searched for `'BTCUSDT'`
- **Solution**: Added separate constants for each format:
  - `TOP_5_ASSETS = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB']` for whale
  - `TOP_5_PAIRS = ['BTCUSDT', ...]` for volatility
  - `TOP_5_OPP_PAIRS = ['BTC/USDT', ...]` for opportunities

### 3. Selected Pair Sync ✅
- Added `onSymbolChange` callback to `MarketSentimentWidget`
- `MarketData.tsx` now manages `selectedPair` state
- When user selects non-top-5 pair:
  - Volatility Meter: prepends pair to symbols list
  - Whale Tracking: adds pair data at top of list
  - Trading Opportunities: adds pair data at top of list
- Badge shows `+ASSET` when selected pair is not in top 5
