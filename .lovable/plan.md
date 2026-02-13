

# Reposition Full Sync as Advanced/Recovery Tool

## Problem
Currently on `/import`, the Full Sync panel renders **first** (above Quick Actions), giving it primary visual prominence. Per the feature matrix note, Full Sync is rarely used — incremental sync + re-sync range covers daily use. Full Sync should be positioned as an **advanced/recovery** option.

## Solution
Swap the rendering order and wrap Full Sync in a `Collapsible` component so it's collapsed by default. Daily-use tools (Incremental Sync, Enrichment) become the primary visible section.

## Changes

### File: `src/pages/ImportTrades.tsx`

Reorder the Binance tab content:

1. **Move "Quick Actions" card ABOVE Full Sync** — Incremental Sync and Enrichment are the daily drivers, they should be first.

2. **Wrap `BinanceFullSyncPanel` in a Collapsible** — collapsed by default with a trigger like:
   ```
   [Shield icon] Advanced: Full Sync (Recovery)  [chevron]
   ```
   - Auto-expands when Full Sync is actively running (`isFullSyncing === true`) or has a checkpoint to resume
   - Collapsed by default in idle state

3. **Add a subtle description** below the collapsible trigger:
   ```
   "Complete re-download of all trade history. Use when incremental sync misses data or for initial setup."
   ```

### File: `src/components/trading/BinanceFullSyncPanel.tsx`

- Update `CardTitle` text from "Full Sync (Aggregated)" to "Full Sync — Recovery / Initial Setup"
- Add a small `Badge` with "Advanced" label next to the title
- No logic changes — all sync mechanics remain identical

### Visual Layout (After)

```text
Binance Sync Tab:
+--------------------------------------------+
| Quick Actions (always visible)             |
|   [Incremental Sync]  [Enrich N Trades]    |
+--------------------------------------------+

v Advanced: Full Sync (Recovery)    [collapsed]
+--------------------------------------------+
| Full Sync — Recovery / Initial Setup       |
| [SyncQuotaDisplay]                         |
| [SyncRangeSelector]                        |
| [Force Re-fetch]                           |
| [Start Full Sync]                         |
+--------------------------------------------+
```

When sync is running or checkpoint exists, the collapsible auto-opens.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/ImportTrades.tsx` | Swap order: Quick Actions first, Full Sync in Collapsible |
| `src/components/trading/BinanceFullSyncPanel.tsx` | Update title + add "Advanced" badge |

## Technical Notes
- Uses `@radix-ui/react-collapsible` (already installed)
- `isFullSyncing` or `canResume` from sync store controls auto-expand
- Zero logic changes to sync engine, hooks, or store
