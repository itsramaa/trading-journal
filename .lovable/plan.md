
# Convert BinanceFullSyncPanel from Dialog to Inline Card

## Problem
`BinanceFullSyncPanel` currently uses `AlertDialog` for sync configuration (range selection, force re-fetch, quota display). This made sense when it was embedded in Trade History as a compact widget, but now that it lives on a dedicated **Import & Sync** page, a dialog is unnecessary -- the configuration should be inline within a Card.

## Solution
Rewrite `BinanceFullSyncPanel` to render all sync configuration **inline within a Card** instead of behind dialogs. The user sees everything at a glance: quota, range selector, force re-fetch toggle, and the start button -- no extra click needed.

## New Layout (Inline Card)

```text
+----------------------------------------------------+
| Card: Full Sync (Aggregated)                       |
|----------------------------------------------------|
| [SyncQuotaDisplay]                                 |
|                                                    |
| Sync Range:                                        |
|   (o) 30 days  (o) 90 days  (o) 6 months          |
|   (o) 1 year   (o) 2 years  (o) All Time          |
|                                                    |
| [ ] Force Re-fetch (delete existing & re-download) |
|                                                    |
| Info bullets:                                      |
|   - Fetch income records (PnL, fees, funding)      |
|   - Checkpoint-based resume if interrupted         |
|   - Partial success - failed symbols won't block   |
|                                                    |
| [Start Full Sync (90 days)]                        |
+----------------------------------------------------+
```

**State-dependent views (same card, content changes):**
- **Idle**: Shows range selector + options + start button (above)
- **Running**: Shows `SyncProgressIndicator` (phases, ETA, progress bar)
- **Success**: Shows `SyncStatusBadge` + result details + "Sync Again" button (resets to idle)
- **Error**: Shows error badge + Resume/Retry buttons
- **Checkpoint exists**: Shows Resume/Discard/Fresh Sync options inline

## Changes

### File: `src/components/trading/BinanceFullSyncPanel.tsx`
- **Remove**: All `AlertDialog` imports and usage (3 dialog instances)
- **Remove**: `showConfirm` state (no longer needed)
- **Wrap** everything in a `Card` with `CardHeader` + `CardContent`
- **Idle state**: Render `SyncQuotaDisplay`, `SyncRangeSelector`, force re-fetch checkbox, info bullets, and start button **inline** (no dialog trigger)
- **Running state**: Render `SyncProgressIndicator` inside the card
- **Success state**: Render result badges + "Sync Again" button (clicking resets `useSyncStore` to idle, showing config again)
- **Error state**: Render error badge + Resume/Retry inline
- **Checkpoint state**: Render Resume/Discard/Fresh Sync inline
- **Remove** `compact` prop (no longer relevant -- always full layout on Import page)
- Keep `SyncProgressIndicator` sub-component unchanged

### File: `src/pages/ImportTrades.tsx`
- Remove `compact` prop from `<BinanceFullSyncPanel>` if passed
- No other changes needed (it's already rendering the panel correctly)

## Technical Notes
- `handleSync()` no longer calls `setShowConfirm(false)` -- just runs sync directly
- The "Sync Again" button in success state resets the sync store status to `idle` so the card shows the config form again
- `SyncRangeSelector` and `SyncQuotaDisplay` are already standalone components -- they render inline seamlessly
- `SyncProgressIndicator` stays as an internal sub-component, just renders inside the card instead of replacing the entire component
- No behavioral changes to sync logic, hooks, or store -- only UI layout changes
