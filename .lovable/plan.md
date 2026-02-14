
# Trade History: Deep UX Analysis & Fixes

## Issues Found

### 1. CRITICAL: Back Navigation Always Goes to `/trading`, Not Referrer
`TradeDetail.tsx` line 340 hardcodes `navigate('/trading')` for the Back button. When a user navigates from `/history` (gallery or list card click) to `/trading/:id`, pressing Back takes them to the **Trading Journal** instead of **Trade History**. This breaks the navigation mental model.

**Fix**: Replace `navigate('/trading')` with `navigate(-1)` (browser history back). This respects the referrer regardless of entry point. Add a fallback: if there's no history (direct link), default to `/trading`.

### 2. HIGH: Header Badge Shows "Basic Mode" -- Stale/Hardcoded
`TradeHistory.tsx` line 154 renders `<Badge>Basic Mode</Badge>` which is a hardcoded label unrelated to the active trade mode (Paper/Live). This is inconsistent with the mode-aware architecture and confusing to users.

**Fix**: Replace with a dynamic badge showing the active `tradeMode` (`Paper` or `Live`), consistent with how other pages use mode indicators.

### 3. HIGH: Tabs (All/Binance/Paper) Violate Mode Isolation
`TradeHistoryContent.tsx` shows All/Binance/Paper tabs regardless of active mode. In **Paper mode**, showing a "Binance" tab with 0 trades is noise. In **Live mode**, showing "Paper" tab with 0 trades is equally confusing. The source-based tabs should be contextual to the active mode, or at minimum, the tabs irrelevant to the current mode should be hidden.

**Fix**: Pass `tradeMode` to `TradeHistoryContent` and conditionally render tabs:
- Paper mode: Show "All" tab only (all are paper trades by definition since the query already filters by `tradeMode`)
- Live mode: Show "All" and "Binance" tabs (hide "Paper" since mode filter already excludes them)
- Or simpler: remove the tabs entirely since the query already filters by `tradeMode`. The tabs are redundant with mode isolation.

### 4. MEDIUM: Gallery Card Click Navigates to Detail -- But No "View Detail" in Gallery View
Gallery cards navigate to `/trading/${trade.id}` via `handleGalleryCardClick`. This is correct and consistent with the Journal. However, the gallery card itself provides no visual hint that it's clickable to a detail page (no eye icon, no "View" text). Users may think clicking opens the enrichment drawer.

**Fix**: No code change needed -- the `cursor-pointer` and `hover:border-primary` on `TradeGalleryCard` are sufficient visual cues. The behavior is now consistent with Journal after the previous fix.

### 5. MEDIUM: `onEnrichTrade` in Trade History Creates `UnifiedPosition` with `leverage: 1` Hardcoded
`TradeHistory.tsx` line 138 hardcodes `leverage: 1` in the `UnifiedPosition` object for enrichment. Binance trades may have different leverage values stored in the database but this is ignored.

**Fix**: Use `trade.leverage || 1` instead of hardcoded `1`.

### 6. MEDIUM: TradeDetail "Not Found" State Shows "Back to Journal" -- Wrong Context
Line 314-316: When a trade is not found, the message says "Back to Journal" even when accessed from History.

**Fix**: Use `navigate(-1)` and change label to "Go Back".

### 7. LOW: TradeDetail Has Duplicate "Enrich" and "Edit" Buttons That Do Same Thing
Lines 375-381: Both "Enrich" and "Edit" buttons call `setEnrichDrawerOpen(true)`. The "Edit" button only shows for non-readOnly trades, but it opens the same enrichment drawer. This is redundant.

**Fix**: Remove the separate "Edit" button. The "Enrich" button already covers both use cases since the enrichment drawer handles read-only fields internally.

### 8. LOW: `formatHoldTime` Returns `-` for `0` Minutes
Line 91: `if (!minutes) return '-'` treats `0` as falsy. A trade with 0 hold time (instant fill) would show `-` instead of `0m`.

**Fix**: Change to `if (minutes === null || minutes === undefined) return '-'`.

---

## Implementation Plan

### File: `src/pages/trading-journey/TradeDetail.tsx`

1. **Fix Back navigation**: Replace `navigate('/trading')` (line 340) and `navigate('/trading')` (line 314) with `navigate(-1)`. Change "Back to Journal" label to "Go Back".

2. **Remove duplicate Edit button**: Remove lines 378-381 (the Edit button that duplicates Enrich).

3. **Fix `formatHoldTime`**: Change `if (!minutes)` to `if (minutes === null || minutes === undefined)`.

### File: `src/pages/TradeHistory.tsx`

4. **Fix "Basic Mode" badge**: Replace hardcoded "Basic Mode" with dynamic `tradeMode === 'paper' ? 'Paper Mode' : 'Live Mode'` badge with appropriate styling.

5. **Fix leverage in enrichment mapping**: Change `leverage: 1` to `leverage: (trade as any).leverage || 1`.

### File: `src/components/history/TradeHistoryContent.tsx`

6. **Remove redundant source tabs**: Since the paginated query already filters by `tradeMode`, the All/Binance/Paper tabs are mostly redundant. Simplify:
   - Remove `binanceTrades` and `paperTrades` props
   - Remove the Tabs component entirely
   - Render `sortedTrades` directly with the existing `renderTradeList`
   - Keep the "Closed Trades" card header with Binance badge indicator

   This removes visual noise and aligns with the mode isolation principle: the data is already filtered by mode, sub-filtering by source within a mode is unnecessary complexity.

### File: `src/pages/TradeHistory.tsx` (related cleanup)

7. **Remove unused `binanceTrades`/`paperTrades` memos**: Lines 106-107 become dead code after removing tabs from content.

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/pages/trading-journey/TradeDetail.tsx` | `navigate(-1)` for Back, remove duplicate Edit button, fix `formatHoldTime` for 0 |
| `src/pages/TradeHistory.tsx` | Dynamic mode badge, fix leverage mapping, remove `binanceTrades`/`paperTrades` memos |
| `src/components/history/TradeHistoryContent.tsx` | Remove source tabs (All/Binance/Paper), simplify to direct list rendering |
