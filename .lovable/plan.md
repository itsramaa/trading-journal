

# Deep UX Analysis: Market Data Page

## Status: Solid — 2 Minor Issues Found

The Market Data page (`/market-data`) is architecturally sound. It is correctly **mode-agnostic** — all data comes from public Binance/CoinGecko/Alternative.me APIs, making it identical in both Paper and Live modes. This is the correct design since market data is external and has no dependency on user trading mode.

---

## Architecture Verification

| Aspect | Status | Detail |
|--------|--------|--------|
| Mode independence | OK | No `useTradeMode`, `useModeVisibility`, or mode branching — correct for public market data |
| Global symbol sync | OK | Uses `MarketContext` for cross-page symbol persistence (shared with Calculator, Trade Entry) |
| Data flow | OK | `useMultiSymbolMarketInsight` -> edge function `market-insight` -> Binance/CoinGecko APIs |
| Error handling | OK | `normalizeError` utility + `ErrorBoundary` wrappers on all widgets |
| Loading states | OK | Skeleton loaders on all 4 widgets |
| Empty states | OK | All widgets handle zero-data gracefully |
| Symbol selector | OK | Combobox with `useTradingPairs` for full pair list + quick access shortcuts |
| Refresh mechanism | OK | Global refresh button + per-widget retry on error |
| Constants centralization | OK | `market-config.ts` centralizes symbols, limits, periods, sources |

### Component Tree (verified correct)

```text
MarketData (page)
  +-- PageHeader (with Refresh button)
  +-- MarketSentimentWidget (symbol selector, sentiment gauge, factors)
  +-- Grid 2-col:
  |   +-- VolatilityMeterWidget (annualized volatility bars)
  |   +-- WhaleTrackingWidget (volume-based whale detection)
  +-- TradingOpportunitiesWidget (AI-ranked setups)
  +-- Data quality footer
```

---

## Issues Found

### ISSUE 1: Dead Code — `MarketDataTab.tsx` (Cleanup)

**File:** `src/components/market-insight/MarketDataTab.tsx`

This component (204 lines) is **not imported anywhere**. It was the original tab content before the Market Data page was extracted into standalone widgets (`WhaleTrackingWidget`, `TradingOpportunitiesWidget`, `VolatilityMeterWidget`).

It duplicates the same data rendering (volatility, opportunities, whale tracking) but with an older, non-reusable inline format.

**Fix:** Delete `src/components/market-insight/MarketDataTab.tsx`. It is dead code that creates maintenance confusion.

---

### ISSUE 2: `VolatilityMeterWidget` Domain Location (Minor)

**File:** `src/components/dashboard/VolatilityMeterWidget.tsx`

This component is located in `src/components/dashboard/` but is primarily used on the Market Data page, not the Dashboard. Its domain is market data, not dashboard.

**Fix:** Move to `src/components/market/VolatilityMeterWidget.tsx` and update the import in `MarketData.tsx` and the barrel export in `src/components/market/index.ts`. This aligns with single responsibility — all market widgets live in `src/components/market/`.

---

## No Mode-Related Issues

The Market Data page has **zero mode-related inconsistencies** because:

1. All data is from public APIs (Binance spot/futures, CoinGecko, Alternative.me) — no user trade data
2. No account-specific queries
3. No `trade_entries` reads
4. The `MarketContext` (symbol selection) is mode-independent by design

This is the correct architecture. Market intelligence data should be identical regardless of whether the user is in Paper or Live mode.

---

## Implementation Summary

| File | Action | Detail |
|------|--------|--------|
| `src/components/market-insight/MarketDataTab.tsx` | Delete | Dead code, not imported anywhere |
| `src/components/dashboard/VolatilityMeterWidget.tsx` | Move | Relocate to `src/components/market/VolatilityMeterWidget.tsx` |
| `src/components/market/index.ts` | Update | Add `VolatilityMeterWidget` export |
| `src/pages/MarketData.tsx` | Update import | Change import path for `VolatilityMeterWidget` |

Total: 2 cleanup changes, 0 bug fixes. The page is functionally complete and correct.

