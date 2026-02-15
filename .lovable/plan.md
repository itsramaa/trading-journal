

# Import Page Restructure: From Dev Console to Professional Data Hub

The current `/import` page mixes three fundamentally different workflows (auto sync, full recovery, on-chain scanner) on one flat surface with inconsistent state feedback and no clear primary path. This plan restructures it into a layered, mode-switched interface.

---

## Problem Summary

1. Three distinct products (Auto Sync, Full Recovery, On-Chain Scanner) share one flat page
2. No clear "what am I doing right now?" context
3. Logs, progress, and controls are mixed on the same visual level
4. Solana scanner shows confusing "0 scanned, 0 found" in idle state (state machine ambiguity)
5. Feature highlight cards at the top add noise without guiding action

---

## Architecture

The page becomes a clean mode-switched interface with 3 explicit tabs:

```text
ImportTrades
  +-- PageHeader (same)
  +-- Mode Tabs: [ Incremental Sync | Full Recovery | On-Chain Scanner ]
  +-- Active Mode Content:
       +-- Action Layer (controls)
       +-- Status Layer (progress, separate card)
       +-- Diagnostic Layer (logs, collapsed by default)
```

Each tab owns its entire vertical space. No cross-tab visual bleed.

---

## Changes

### 1. Replace Feature Highlight Cards with Mode Tabs

**File:** `src/pages/ImportTrades.tsx`

Remove the 3 feature highlight cards (lines 84-128). They describe capabilities but do not guide action.

Replace with 3 explicit mode tabs:

| Tab | Label | Icon | When Disabled |
|-----|-------|------|---------------|
| `incremental` | Incremental Sync | Zap | Paper mode or not connected |
| `full-recovery` | Full Recovery | Database | Paper mode or not connected |
| `solana` | On-Chain Scanner | Globe | Never (works in both modes) |

The current "Binance Sync" tab conflates incremental + full sync. Splitting them makes each mode's purpose clear.

URL persistence stays via `useSearchParams` (existing pattern).

Default tab logic:
- Paper mode: `solana`
- Live + connected: `incremental`
- Live + not connected: `solana`

### 2. Incremental Sync Tab -- Clean Action-First Layout

Extract the current "Quick Actions" card content into its own tab. Structure:

```text
[Connection Status Banner -- if not connected]
[Action Card]
  - Sync button (primary CTA)
  - Last sync time
  - Stale indicator
[Enrichment Card -- only if trades need enrichment]
  - Count + Enrich button
  - Progress bar when running
```

No logs. No recovery options. Just "sync latest trades."

### 3. Full Recovery Tab -- Power Tool with Clear Layers

Move `BinanceFullSyncPanel` into its own tab. Add visual separation between layers:

```text
[Quota Display]
[Action Card]
  - Range selector
  - Force re-fetch toggle
  - Start button
[Status Card -- only when running or has result]
  - Progress indicator
  - ETA
  - Reconciliation report
[Diagnostic Logs -- collapsed by default, unchanged]
```

The key change: BinanceFullSyncPanel stays as-is internally, but it now owns the full tab width without competing with incremental sync controls.

### 4. Solana Scanner -- Fix State Machine Display

**File:** `src/components/wallet/SolanaTradeImport.tsx`

Fix the confusing idle state. Currently when `status === 'parsed'` and `result.totalTransactions === 0`, it shows "No DEX trades found in recent 0 transactions." This happens because the summary grid renders even before a real scan.

Add explicit state handling:

| State | What Shows |
|-------|-----------|
| `idle` | Scan controls only. No summary grid. No "0 Scanned" counters. |
| `fetching` | Spinner + "Scanning X transactions..." |
| `parsed` (trades > 0) | Summary grid + trade list + import button |
| `parsed` (trades = 0) | "No trades found" message with "Scan More" option |
| `importing` | Progress indicator |
| `done` | Success + actions |
| `error` | Error message + retry |

The summary grid (Scanned / Trades Found / Selected) only appears after a successful parse with `totalTransactions > 0`.

### 5. Remove "Experimental" Badge from Solana Tab

The tab label changes from:
```
Solana Import [Experimental]
```
to:
```
On-Chain Scanner
```

"Experimental" creates low confidence. The scanner works -- just label it by function.

### 6. Consistent Not-Connected State

When Binance is not connected:
- Incremental Sync tab: Shows connection CTA (link to Settings)
- Full Recovery tab: Shows same connection CTA
- On-Chain Scanner: Unaffected

Both Binance tabs share the same `NotConnectedBanner` component (extracted, DRY).

---

## Technical Details

### Tab Configuration

```typescript
type ImportMode = 'incremental' | 'full-recovery' | 'solana';

const tabs: Array<{ value: ImportMode; label: string; icon: LucideIcon; disabled: boolean }> = [
  { value: 'incremental', label: 'Incremental Sync', icon: Zap, disabled: isBinanceDisabled },
  { value: 'full-recovery', label: 'Full Recovery', icon: Database, disabled: isBinanceDisabled },
  { value: 'solana', label: 'On-Chain Scanner', icon: Globe, disabled: false },
];
```

### Default Tab Selection

```typescript
const defaultTab: ImportMode = isPaperMode
  ? 'solana'
  : isBinanceConnected
    ? 'incremental'
    : 'solana';
```

### Solana State Guard

In `SolanaTradeImport.tsx`, wrap the summary grid:

```typescript
{status === 'parsed' && result && result.totalTransactions > 0 && (
  <div className="grid grid-cols-3 gap-3">
    {/* Summary counters */}
  </div>
)}
```

This prevents showing "0 Scanned / 0 Found / 0 Selected" in any state.

### NotConnectedBanner (shared)

```typescript
function NotConnectedBanner() {
  return (
    <Alert>
      <Wifi className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>Connect your Binance API credentials in Settings to use this feature.</span>
        <Button asChild variant="outline" size="sm">
          <Link to="/settings">Go to Settings</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/ImportTrades.tsx` | Replace feature cards with 3 mode tabs; split Binance into Incremental + Full Recovery; extract NotConnectedBanner |
| `src/components/wallet/SolanaTradeImport.tsx` | Fix idle state display; guard summary grid behind successful parse |

---

## What Changes

| Before | After |
|--------|-------|
| 2 tabs (Binance Sync, Solana Import) | 3 tabs (Incremental Sync, Full Recovery, On-Chain Scanner) |
| Feature highlight cards at top | Removed (tabs self-describe) |
| Incremental + Full Sync in same tab | Separated into distinct modes |
| "0 Scanned / 0 Found" shown before scan | Only summary grid after actual scan |
| "Experimental" badge on Solana | Clean "On-Chain Scanner" label |
| Different not-connected banners | Shared NotConnectedBanner component |

---

## What Does NOT Change

- `BinanceFullSyncPanel` internal logic (sync engine, logs, reconciliation)
- `SolanaTradeImport` scan/import logic
- URL persistence pattern (`useSearchParams`)
- All hook integrations (sync store, enrichment, quota)
- Supported DEX protocols card (stays in Solana tab)

