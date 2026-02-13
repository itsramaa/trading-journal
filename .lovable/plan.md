
# Consolidate All Exports to Bulk Export Page + UI Fixes

## Overview

Three changes:
1. **Remove export buttons** from Performance, DailyPnL, TradeHistory, TradingHeatmap, AIInsights — consolidate into the Bulk Export page
2. **Remove Collapsible** wrapper from Full Sync in ImportTrades
3. **Move Bulk Export** from Analytics sidebar group to Tools group (below Backtest)
4. **Add Reconciliation Report export** (CSV/PDF) to `SyncReconciliationReportInline`

## Inventory of Exports to Consolidate

| Page | Current Export | Action |
|------|---------------|--------|
| Performance | CSV + PDF (usePerformanceExport) | Remove buttons, add "Performance Report" tab/card in BulkExport |
| DailyPnL | CSV + PDF (usePerformanceExport) | Remove buttons (covered by Performance tab in BulkExport) |
| TradeHistory | CSV (exportTradesCsv) | Remove button (covered by Journal tab in BulkExport) |
| TradingHeatmap | CSV (inline) | Remove button, add "Heatmap" card in BulkExport |
| AIInsights | Contextual PDF (useContextualExport) | Remove button, add "Contextual Analytics" card in BulkExport |
| BulkExport | Binance / Journal / Backup tabs | Expand with new export types |

## Changes

### 1. Remove Collapsible from Full Sync (`src/pages/ImportTrades.tsx`)

- Remove `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` wrappers
- Render `BinanceFullSyncPanel` directly (always visible)
- Keep the description text and Shield icon as a simple heading
- Remove `ChevronDown` import

### 2. Move Bulk Export to Tools Group (`src/components/layout/AppSidebar.tsx`)

Move `{ title: "Bulk Export", url: "/export", icon: Download }` from `Analytics` group to `Tools` group, after Backtest:

```
Tools:
  - Risk Calculator
  - My Strategies
  - Backtest
  - Bulk Export    <-- moved here
```

### 3. Expand Bulk Export Page (`src/pages/BulkExport.tsx`)

Restructure tabs from 3 to 5:

```
Tabs: [Binance] [Journal] [Analytics] [Reports] [Backup]
```

- **Binance tab**: Keep as-is (Binance bulk export for tax)
- **Journal tab**: Keep `JournalExportCard` as-is (already handles CSV/JSON with market context)
- **Analytics tab** (NEW): Consolidate:
  - Performance Report export (CSV + PDF) — reuse `usePerformanceExport`
  - Heatmap export (CSV) — extract heatmap CSV logic into a reusable function
  - Contextual Analytics PDF — reuse `useContextualExport`
- **Reports tab** (NEW): 
  - Sync Reconciliation Report export (CSV + PDF) — new hook
  - Weekly Report export (already exists via `useWeeklyReportExport`)
- **Backup tab**: Keep `SettingsBackupRestore` as-is

### 4. Remove Export Buttons from Source Pages

| File | Remove |
|------|--------|
| `src/pages/Performance.tsx` | Remove CSV + PDF buttons, `usePerformanceExport` import, `handleExportCSV`/`handleExportPDF` functions |
| `src/pages/DailyPnL.tsx` | Remove CSV + PDF buttons, `usePerformanceExport` import, `handleExportCSV`/`handleExportPDF` functions |
| `src/pages/TradeHistory.tsx` | Remove Export CSV button, `exportTradesCsv` import |
| `src/pages/TradingHeatmap.tsx` | Remove Export CSV button, `exportToCSV` function |
| `src/pages/AIInsights.tsx` | Remove Export Contextual PDF button, `useContextualExport` import |

Each page gets a subtle link/hint: a small "Export" icon-button in the header that navigates to `/export` with appropriate query param (e.g., `/export?tab=analytics`) so users can still discover the export feature.

### 5. Add Reconciliation Report Export

**New file: `src/hooks/use-reconciliation-export.ts`**

Creates CSV and PDF exports from `AggregationResult`:
- **CSV**: Summary stats, reconciliation data, trade details table
- **PDF**: jsPDF with autoTable — same structure as `SyncReconciliationReportInline` (summary cards, reconciliation section, lifecycle stats, warnings, trade details)

**Update: `src/components/trading/SyncReconciliationReport.tsx`**

Add export buttons (CSV + PDF) to `SyncReconciliationReportInline` header area, using `useReconciliationExport`.

### 6. Extract Heatmap Export Logic

**New file: `src/lib/export/heatmap-export.ts`**

Extract heatmap CSV generation logic from `TradingHeatmap.tsx` into a reusable function so it can be called from BulkExport page.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/ImportTrades.tsx` | Remove Collapsible wrapper from Full Sync |
| `src/components/layout/AppSidebar.tsx` | Move Bulk Export from Analytics to Tools |
| `src/pages/BulkExport.tsx` | Add Analytics + Reports tabs with consolidated exports |
| `src/pages/Performance.tsx` | Remove export buttons, add nav link to /export |
| `src/pages/DailyPnL.tsx` | Remove export buttons, add nav link to /export |
| `src/pages/TradeHistory.tsx` | Remove export button, add nav link to /export |
| `src/pages/TradingHeatmap.tsx` | Remove export button + inline logic, add nav link to /export |
| `src/pages/AIInsights.tsx` | Remove export button, add nav link to /export |
| `src/hooks/use-reconciliation-export.ts` | NEW — CSV/PDF export for reconciliation report |
| `src/lib/export/heatmap-export.ts` | NEW — extracted heatmap CSV logic |
| `src/components/trading/SyncReconciliationReport.tsx` | Add export buttons to inline report |

## Technical Notes

- All existing export hooks (`usePerformanceExport`, `useContextualExport`, `exportTradesCsv`) remain intact — they're just called from BulkExport instead of individual pages
- Source pages get a minimal "Export" link button pointing to `/export?tab=<relevant-tab>` for discoverability
- `BulkExport` reads `?tab=` query param to auto-select the right tab on navigation
- No breaking changes to underlying data or hooks
