

# Trade History & Cards: UX Fixes

## Issues Found

### 1. Gallery & List Cards Missing Key Trade Data (Entry, SL, TP)

**TradeGalleryCard** shows: pair, direction, P&L, date, strategy, source. Missing: **Entry price, SL, TP**.

**TradeHistoryCard** shows: Entry, Exit, R:R, Confluence, Fee. Missing: **SL, TP**. Has **Fee** and implicitly time-related data that per user should only be in the detail page.

**Fix**:
- **TradeGalleryCard**: Add Entry, SL, TP rows below the existing pair info. Remove any fee/time if present.
- **TradeHistoryCard**: Add SL and TP to the grid. Remove the Fee column (move to detail only). Keep Entry and Exit (essential for list context).

### 2. Duplicate View Toggle (Gallery/List)

Currently there are **two** view toggles:
- One in the outer `Card` header (TradingJournal line 375-387) -- above tabs
- One inside `TradeHistoryToolbar` (Closed tab only, line 536-542)

The outer toggle only affects the Active tab (passed as `viewMode` prop to `AllPositionsTable`). The inner toggle also sets the same `viewMode` state but is visually separate.

**Fix**: Remove the `TradeHistoryToolbar` view toggle. The single outer toggle (above tabs) should control viewMode for ALL tabs (Active + Closed). Remove the duplicate from `TradeHistoryToolbar`.

### 3. Active vs Closed Trade Detail Uses Different ID Formats

- Active Binance trades navigate with `binance-SYMBOL` (e.g. `binance-BTCUSDT`)
- Closed trades (from DB) navigate with UUID

The detail page (`TradeDetail.tsx`) already handles both via `isBinancePosition` check. This is architecturally correct -- the ID format difference is intentional because live Binance positions don't have a DB UUID until they're enriched/closed. No fix needed here, this is working as designed.

**However**, the `PositionGalleryCard` (Active tab) navigates to `/trading/binance-SYMBOL` while `TradeGalleryCard` (Closed tab) navigates to `/trading/UUID`. This is correct behavior -- they're different data sources with different identifiers. The detail page unifies them.

---

## Implementation

### File: `src/components/journal/TradeGalleryCard.tsx`

Add Entry, SL, TP info rows in the CardContent section:

```
{/* Info Section */}
<CardContent className="p-3">
  <div className="flex justify-between items-center">
    <div className="flex items-center gap-1.5">
      <CryptoIcon symbol={trade.pair} size={16} />
      <span className="font-semibold text-sm">{trade.pair}</span>
    </div>
    <span className="text-xs text-muted-foreground">
      {format(...)}
    </span>
  </div>

  {/* NEW: Key prices */}
  <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
    <div className="flex justify-between">
      <span>Entry</span>
      <span className="font-mono">{trade.entry_price ? formatCurrency(trade.entry_price) : '-'}</span>
    </div>
    <div className="flex justify-between">
      <span>SL</span>
      <span className="font-mono">{trade.stop_loss ? formatCurrency(trade.stop_loss) : '-'}</span>
    </div>
    <div className="flex justify-between">
      <span>TP</span>
      <span className="font-mono">{trade.take_profit ? formatCurrency(trade.take_profit) : '-'}</span>
    </div>
  </div>

  {/* strategies row stays */}
</CardContent>
```

### File: `src/components/trading/TradeHistoryCard.tsx`

- Add SL and TP to the existing grid (currently has Entry, Exit, R:R, Confluence, Fee)
- Remove the Fee column (fee details belong in detail page only)
- Result: Entry, Exit, SL, TP, R:R, Confluence

### File: `src/components/journal/AllPositionsTable.tsx` (PositionGalleryCard)

Add SL and TP to the active position gallery card. Paper trades have SL/TP from the DB. Binance positions need the SL/TP from enrichment data (passed via `UnifiedPosition`).

- Add `stopLoss` and `takeProfit` fields to `UnifiedPosition` interface
- Map them from `TradeEntry.stop_loss` / `TradeEntry.take_profit` in `mapToUnifiedPositions`
- Display in `PositionGalleryCard` alongside Entry

### File: `src/pages/trading-journey/TradingJournal.tsx`

- Remove the outer `ToggleGroup` (lines 375-387) from the Card header
- Keep the `TradeHistoryToolbar` toggle for the Closed tab
- BUT: pass `viewMode` + `onViewModeChange` to `AllPositionsTable` from the same state
- Actually simpler: keep the outer toggle, remove the one from `TradeHistoryToolbar`

**Decision**: Keep the outer toggle (above tabs). Remove the toggle from `TradeHistoryToolbar`. The outer toggle already controls `viewMode` state which is passed to both `AllPositionsTable` (Active tab) and `TradeHistoryContent` (Closed tab).

### File: `src/components/history/TradeHistoryToolbar.tsx`

- Remove the `ToggleGroup` for view mode from this component
- Remove `viewMode` and `onViewModeChange` props

---

## Technical Summary

| File | Changes |
|------|--------|
| `src/components/journal/TradeGalleryCard.tsx` | Add Entry, SL, TP rows |
| `src/components/trading/TradeHistoryCard.tsx` | Add SL, TP columns; remove Fee column |
| `src/components/journal/AllPositionsTable.tsx` | Add SL/TP to UnifiedPosition + PositionGalleryCard + mapping |
| `src/pages/trading-journey/TradingJournal.tsx` | Keep outer view toggle as single source |
| `src/components/history/TradeHistoryToolbar.tsx` | Remove duplicate view toggle |

