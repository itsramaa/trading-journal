
# Restructure Import Trades as Unified Data Import Hub

## Problem
Currently, sync/import functionality is scattered:
- **Trade History** (`/history`) contains: `BinanceFullSyncPanel`, Incremental Sync button, Enrichment controls, Sync Quota display
- **Import Trades** (`/import`) only contains: Solana on-chain import

This creates UX confusion -- users must navigate to Trade History to sync Binance data, which is conceptually an "import" operation, not a "history review" activity.

## Solution: Hybrid Import Hub
Transform `/import` into a **tabbed Import Hub** following the hybrid approach:
1. **Auto incremental fetch** when switching to Live mode (background, lightweight)
2. **Manual Full Sync / Re-sync** available in the Import page
3. **Solana import** remains as a separate tab

## Architecture

```text
/import (Import Trades Page)
+--------------------------------------------------+
| PageHeader: "Import & Sync Trades"                |
| Description: "Import trades from exchanges,       |
|  wallets, or sync your trading history"            |
+--------------------------------------------------+
| [Binance Sync] [Solana Import]                    |
+--------------------------------------------------+
| Tab: Binance Sync                                 |
|   - Connection status banner                      |
|   - Full Sync Panel (moved from TradeHistory)     |
|   - Incremental Sync status + trigger             |
|   - Enrichment controls                           |
|   - Sync Quota display                            |
|   - Sync Monitoring (Reconciliation, Quality)     |
+--------------------------------------------------+
| Tab: Solana Import                                |
|   - Existing SolanaTradeImport (unchanged)        |
|   - Supported Protocols card                      |
+--------------------------------------------------+
```

## Changes Required

### 1. Restructure `src/pages/ImportTrades.tsx`
- Rename page title: "Import & Sync Trades"
- Add Tabs component: `binance` | `solana`
- **Binance Tab**: Move all sync-related UI here:
  - `BinanceFullSyncPanel` (full, non-compact mode)
  - Incremental Sync status/button
  - Enrichment controls (Enrich Trades button + progress)
  - `SyncQuotaDisplay` (full version)
  - Binance connection status indicator
  - Mode visibility guard (hide tab content in Paper mode)
- **Solana Tab**: Keep existing `SolanaTradeImport` + Supported Protocols card
- Feature info cards updated to cover both sources
- Default tab based on mode: Live mode defaults to Binance, Paper mode defaults to Solana

### 2. Clean up `src/pages/TradeHistory.tsx`
Remove from Trade History:
- `BinanceFullSyncPanel` import and usage (line 38, 453)
- Incremental sync button/status UI (lines 455-486)
- Enrichment controls (Enrich Trades button + progress, lines 488-537)
- Related imports: `useBinanceIncrementalSync`, `useBinanceAggregatedSync`, `useSyncStore` selectors for sync progress, `useTradeEnrichmentBinance`, `useTradesNeedingEnrichmentCount`
- Keep: `isFullSyncing` check for loading awareness (read-only from global store)
- Keep: Fee/Funding tabs (they display data, not import it)
- Add: Small "Go to Import" link/button in the filter area pointing to `/import` for users who need to sync

### 3. Auto Incremental Sync (Background)
- Move `useBinanceIncrementalSync({ autoSyncOnMount: true })` to `DashboardLayout` level or a dedicated provider
- This ensures incremental sync runs once on app load (Live mode), not tied to any specific page
- `GlobalSyncIndicator` already exists in the header -- no changes needed there

### 4. Update Sidebar Label
- In `AppSidebar.tsx`: Change label from "Import Trades" to "Import & Sync" for clarity

### 5. Update Documentation
- Update `docs/FEATURE-MATRIX.md`: Move sync features from Trade History section to Import section
- Update `docs/CLASS-DIAGRAM.md` if component relationships change

## Files Modified

| File | Action |
|------|--------|
| `src/pages/ImportTrades.tsx` | Major rewrite -- tabbed layout with Binance sync + Solana import |
| `src/pages/TradeHistory.tsx` | Remove sync/enrichment UI, add "Go to Import" link |
| `src/components/layout/AppSidebar.tsx` | Rename menu item |
| `src/components/layout/DashboardLayout.tsx` | Add auto incremental sync hook at layout level |
| `docs/FEATURE-MATRIX.md` | Update feature locations |
| `docs/CLASS-DIAGRAM.md` | Update component mapping |

## What Stays in Trade History
- Filter controls (date, result, direction, session, strategy, pairs)
- View mode toggle (List/Gallery)
- Trade list with sub-tabs (All/Binance/Paper)
- Fee History tab (displays data from local DB)
- Funding History tab (displays data from local DB)
- Export CSV button
- Trade enrichment drawer (for individual trade enrichment on click)
- Infinite scroll pagination
- Server-side stats (P&L, win rate)

## What Moves to Import
- `BinanceFullSyncPanel` (Full Sync trigger + monitoring)
- Incremental Sync button + status
- Bulk Enrichment controls (Enrich N Trades button)
- Sync Quota display
- Sync progress indicators
- Resume/Retry/Discard checkpoint controls

## Technical Notes
- `GlobalSyncIndicator` in header remains unchanged -- sync progress visible globally regardless of current page
- Zustand sync store (`sync-store`) remains unchanged -- state persists across navigation
- Auto incremental sync at layout level ensures data freshness without requiring user to visit Import page
- Fee/Funding tabs in Trade History stay because they display already-synced data, not trigger sync operations
