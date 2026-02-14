

# Bulk Export Page: Deep UX Analysis & Fixes

## Scope & Coverage

Analyzed files (all read in full):
- `src/pages/BulkExport.tsx` (629 lines, page orchestrator with 5 tabs)
- `src/components/settings/JournalExportCard.tsx` (309 lines, Journal tab content)
- `src/components/settings/SettingsBackupRestore.tsx` (359 lines, Backup tab content)
- `src/hooks/use-performance-export.ts` (299 lines, CSV/PDF export)
- `src/hooks/analytics/use-contextual-export.ts` (303 lines, contextual PDF export)
- `src/hooks/use-reconciliation-export.ts` (reconciliation CSV/PDF export)
- `src/hooks/use-weekly-report-export.ts` (411 lines, weekly PDF generation)
- `src/features/binance/useBinanceBulkExport.ts` (Binance bulk export workflow)
- `src/lib/export/heatmap-export.ts` (heatmap CSV export)
- `src/lib/export/trade-export.ts` (trade CSV/JSON export)

## Issue Found

### 1. Uncontrolled Tabs -- Partial URL Read Without Write-Back

**Line 69**: `const [searchParams] = useSearchParams()` reads the `tab` param but does not destructure the setter.
**Line 168**: `<Tabs defaultValue={resolvedDefaultTab}>` uses `defaultValue` (uncontrolled), meaning:

- The tab correctly initializes from URL on first render (e.g., `/export?tab=reports` works on initial load)
- But navigating between tabs does NOT update the URL
- Browser back/forward buttons do not work for tab changes
- Bookmarking after switching tabs captures the wrong tab
- Inconsistent with the controlled `useSearchParams` pattern now established on Position Calculator, Strategies, Backtest, Performance, AI Insights, Risk, and Import pages

**Fix**: Destructure the setter, replace `defaultValue` with controlled `value`/`onValueChange`.

### 2. No Other Issues Found

- **Mode consistency**: Correct. The page uses `useModeFilteredTrades()` for trade data and `useTradeMode()` for display labels. Binance tab correctly shows disconnected alert when not connected. Both Paper and Live modes see identical structure.
- **Color tokens**: The Tax Reporting Tips card uses `text-chart-4`, `border-chart-4/30`, `bg-chart-4/5` which are valid Tailwind theme utilities (not the broken `text-warning` pattern).
- **SettingsBackupRestore warning**: Uses `border-yellow-500/50 bg-yellow-500/10 text-yellow-500` -- standard destructive-override warning pattern, acceptable.
- **JournalExportCard**: Clean implementation with proper loading state, format selection, and context toggles. No issues.
- **Export hooks**: All pure utility hooks with no UI concerns. Mode isolation is enforced via `useModeFilteredTrades` and direct `trade_mode` filtering in weekly report queries.
- **Empty states**: All export cards properly disable buttons when data is unavailable and show descriptive badges ("No data", "No sync data").
- **Loading states**: Binance export shows progress bar with poll count. Weekly report shows spinner. Journal export shows spinner. All correct.

---

## Implementation Plan

### File: `src/pages/BulkExport.tsx`
1. Destructure the `setSearchParams` setter from `useSearchParams()`
2. Derive `activeTab` from search params with smart default (connected = "binance", else "journal")
3. Replace `<Tabs defaultValue={resolvedDefaultTab}>` with `<Tabs value={activeTab} onValueChange={...}>`

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/pages/BulkExport.tsx` | Controlled tabs via `useSearchParams` (3 lines changed) |

