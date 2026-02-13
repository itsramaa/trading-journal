

# Enhance Force Re-fetch, Resume, and Discard Checkpoint UX

## Problem
Three advanced/recovery features need UX hardening:
1. **Force Re-fetch** — destructive action (deletes all local trades) but has no confirmation dialog
2. **Resume Interrupted Sync** — shows minimal checkpoint info, no ETA or progress context
3. **Discard Checkpoint** — deletes sync progress without any confirmation warning

## Changes

### File: `src/components/trading/BinanceFullSyncPanel.tsx`

**1. Force Re-fetch — Add destructive warning + confirmation**

When user checks the "Force Re-fetch" checkbox, show an inline destructive `Alert` below it:

```text
[!] This will DELETE all existing synced trades from your local database
    and re-download everything from Binance for the selected range.
    Use this only if data is inconsistent or corrupted.
```

When user clicks "Start Full Sync" with `forceRefetch === true`, show a `ConfirmDialog` (variant `destructive`) before proceeding:
- Title: "Force Re-fetch — Delete & Re-download"
- Description: "All locally synced Binance trades will be permanently deleted before re-downloading. This cannot be undone. Continue?"
- Confirm label: "Delete & Re-sync"

Add new state: `showForceConfirm` to control the dialog.

**2. Resume Checkpoint — Enrich with details + ETA**

Enhance the checkpoint state section:
- Show checkpoint age as human-readable text (e.g., "Saved 2 hours ago")
- Show processed/total symbols count (already exists, keep)
- Show checkpoint phase label (mapped to human name, not raw key)
- Show the sync range that was used when the checkpoint was created
- Include `SyncETADisplay` hint: "Resume will continue from where it left off"

**3. Discard Checkpoint — Add confirmation dialog**

Replace direct `handleDiscardCheckpoint` call with a `ConfirmDialog` (variant `warning`):
- Title: "Discard Sync Checkpoint"
- Description: "This will discard all sync progress ({X}/{Y} symbols processed). You will need to start a fresh sync. Continue?"
- Confirm label: "Discard Progress"

Add new state: `showDiscardConfirm` to control the dialog.

### Updated Layout (Checkpoint State)

```text
+-----------------------------------------------------+
| [Clock] Incomplete sync (12/45 symbols)              |
|   Phase: Fetching Trades                             |
|   Range: 90 days | Saved 2 hours ago                 |
|                                                      |
| [Resume from Checkpoint]  [Discard]  [Fresh Sync]    |
+-----------------------------------------------------+
```

### Updated Layout (Idle State — Force Re-fetch checked)

```text
+-----------------------------------------------------+
| ...range selector...                                 |
|                                                      |
| [x] Force Re-fetch                                   |
|   Delete existing trades and re-download all data    |
|                                                      |
| [!] DESTRUCTIVE: All locally synced trades will be   |
|     deleted before re-downloading from Binance.      |
|     Only use if data is inconsistent or corrupted.   |
|                                                      |
| [Start Full Sync (90 days)]                          |
+-----------------------------------------------------+
```

Clicking Start with force re-fetch opens confirmation dialog before executing.

## Files Modified

| File | Change |
|------|--------|
| `src/components/trading/BinanceFullSyncPanel.tsx` | Add force-refetch warning + confirm dialog, enrich checkpoint display, add discard confirmation |

## Technical Notes
- Uses existing `ConfirmDialog` component from `@/components/ui/confirm-dialog`
- Phase label mapping reuses the same map from `SyncProgressIndicator`
- Checkpoint age calculated via `Date.now() - checkpoint.lastCheckpointTime` with `date-fns.formatDistanceToNow`
- No changes to sync logic, store, or hooks — purely UI safety improvements
- `handleSync` now checks `forceRefetch` flag: if true, opens confirm dialog instead of syncing directly

