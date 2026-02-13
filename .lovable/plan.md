

# Enhance Re-Sync, Reconciliation Report, and Sync Quality Display

## Overview

Three improvements to the Import & Sync page:
1. **Re-Sync Specific Date Range** — add Force Re-fetch option + progress indicator
2. **Sync Reconciliation Report** — convert from Dialog to inline Card (since we're already on the Import page)
3. **Sync Quality Score** — enhance badge with matched/failed trade counts in tooltip

---

## Changes

### 1. Re-Sync Date Range — Combine with Force Re-fetch

**File: `src/components/trading/ReSyncTimeWindow.tsx`**

- Add a `Checkbox` for "Force Re-fetch" inside the dialog, with a destructive warning (same pattern as `BinanceFullSyncPanel`)
- When Force Re-fetch is checked, show inline `Alert` explaining that existing trades in the selected range will be deleted first
- Add `ConfirmDialog` before executing sync with force re-fetch enabled
- Improve progress display: use `SyncProgressIndicator`-style layout with phase label + percentage instead of raw `progress.phase` string
- Add estimated duration hint based on selected range (e.g., "7 days ~ 1-2 min")

### 2. Reconciliation Report — Inline on Import Page (No Dialog)

**File: `src/components/trading/SyncReconciliationReport.tsx`**

- Extract all inner content into a new export: `SyncReconciliationReportInline` (no Dialog wrapper)
- Keep the existing `SyncReconciliationReport` dialog export for backward compatibility (used by `SyncStatusBadge`)
- `SyncReconciliationReportInline` renders the same content (Summary Cards, Reconciliation, Lifecycle Stats, Warnings, Failed Lifecycles, Trade Details) directly as stacked Cards

**File: `src/components/trading/BinanceFullSyncPanel.tsx`**

- In the `SUCCESS` state, replace the current compact `SyncStatusBadge` + "Sync Again" button layout with:
  - `SyncStatusBadge` + `SyncQualityIndicator` row (compact)
  - Below that, render `SyncReconciliationReportInline` directly — no click-to-open dialog needed
  - Keep "Sync Again" button at the bottom

Layout after sync success:

```text
+--------------------------------------------------+
| [v] 245 synced  [Excellent]   [Sync Again]       |
+--------------------------------------------------+
| Summary Cards (4-grid)                           |
| P&L Reconciliation Card                         |
| Processing Statistics Card                       |
| Validation Warnings (if any)                     |
| Failed Lifecycles (if any)                       |
| Trade Details Accordion                          |
+--------------------------------------------------+
```

### 3. Sync Quality Badge — Enhanced Tooltip

**File: `src/components/trading/SyncStatusBadge.tsx`**

- Enhance `SyncQualityIndicator` tooltip to include:
  - Matched trades count (from `result.stats.validTrades`)
  - Failed/invalid trades count (from `result.stats.invalidTrades`)
  - Warning trades count
  - Last sync timestamp (from `lastSyncInfo.timestamp`, formatted as relative time)
- This gives traders a quick hover-summary without opening the full report

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/trading/ReSyncTimeWindow.tsx` | Add Force Re-fetch checkbox + confirm dialog + duration hint |
| `src/components/trading/SyncReconciliationReport.tsx` | Extract `SyncReconciliationReportInline` for inline rendering |
| `src/components/trading/BinanceFullSyncPanel.tsx` | Render inline report on success state instead of dialog-only |
| `src/components/trading/SyncStatusBadge.tsx` | Enhance `SyncQualityIndicator` tooltip with trade counts |

## Technical Notes

- `SyncReconciliationReportInline` shares all sub-components (SummaryCard, ReconciliationSection, etc.) with the dialog version — zero duplication
- The dialog version remains available for use in other contexts (e.g., Dashboard badge click)
- Force Re-fetch in `ReSyncTimeWindow` uses the same `ConfirmDialog` pattern from `BinanceFullSyncPanel`
- No changes to sync engine, store, or hooks — purely UI/UX improvements

