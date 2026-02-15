

# Bulk Export Page: UX Polish & Information Clarity

Addresses feedback across all 5 tabs plus 3 system-level improvements.

---

## Tab 1: "Binance" → "Exchange"

### 1a. Rename tab and internal references

**File:** `src/pages/BulkExport.tsx`

- Tab trigger label: "Binance" → "Exchange"
- Tab value stays `binance` internally (no URL breakage)
- Alert title: "About Binance Exports" → "About Exchange Exports"
- Update the "Exchange Not Connected" alert to say: "Connect your exchange API in Settings to export..."

### 1b. Connection badge clarity

Replace the header badges:
```
Before: "Exchange Connected" + "Mode: Live"
After:  "Connected: Binance Futures (Live)" or "Connected: Binance Futures (Testnet)"
```

If not connected, keep "Paper Mode" badge as-is.

The mode badge currently shows `TRADE_MODE_LABELS[tradeMode]` which is "Live" or "Paper". Instead, when connected, combine into one badge showing exchange name + account type.

### 1c. UTC timezone notice

Add below the date range description (line 291):
```
All timestamps are in UTC. End date is inclusive.
```

### 1d. Export type descriptions - add clarification

Update `getExportTypeDescription` in `src/features/binance/useBinanceBulkExport.ts`:
```
order: "All placed orders (instructions to buy/sell) including cancelled and filled"
trade: "Executed fills with entry/exit prices, quantities, and commission details"
```

### 1e. Tax tips - adaptive currency note

Change line 409 from:
```
"All amounts are in USDT"
```
To:
```
"All amounts are denominated in your margin asset (typically USDT). Multi-asset margin accounts may include other stablecoins."
```

---

## Tab 2: Journal Export - Period context

**File:** `src/components/settings/JournalExportCard.tsx`

The button currently says "Export {trades.length} Trades" with no date context.

Compute the date range from the actual trades data:
```typescript
const dateRangeLabel = useMemo(() => {
  if (!trades || trades.length === 0) return '';
  const sorted = [...trades].sort((a, b) => 
    new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  );
  const from = format(new Date(sorted[0].trade_date), 'MMM d, yyyy');
  const to = format(new Date(sorted[sorted.length - 1].trade_date), 'MMM d, yyyy');
  return `${from} - ${to}`;
}, [trades]);
```

Update button text:
```
Export 115 Trades (Jan 1 - Feb 15, 2026)
```

---

## Tab 3: Analytics - Period context + empty states

**File:** `src/pages/BulkExport.tsx` (analytics tab section, lines 428-529)

### 3a. Performance & Heatmap cards: add date range

Same approach as Journal -- compute from `closedTrades` and show the period:
```
Badge: "114 trades (Jan 1 - Feb 15, 2026)"
```

### 3b. Heatmap card layout fix

The badge and button currently stack without spacing. Add proper `space-y-3` structure (already present but the badge text may run into the button). Ensure the badge is on its own line with the period label.

### 3c. Contextual Analytics empty state

Replace:
```
"0 trades analyzed"
```
With:
```
"No trades match contextual filters. Visit AI Insights to configure analysis."
```

When data exists but `tradesWithContext === 0`:
```
"No trades have market context attached. Enrich trades via Import & Sync."
```

---

## Tab 4: Reports - Better empty states + weekly details

**File:** `src/pages/BulkExport.tsx` (reports tab, lines 532-621)

### 4a. Sync Reconciliation empty state

Replace "No sync data" badge with an informative description:
```typescript
{!lastSyncResult && (
  <div className="text-sm text-muted-foreground space-y-1">
    <p>No reconciliation data available.</p>
    <p className="text-xs">This report compares exchange trades with journal records. Run a Full Recovery sync first.</p>
  </div>
)}
```

### 4b. Weekly Report - show date ranges

Add week range labels to the buttons:
```typescript
const now = new Date();
const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
const lastWeekStart = subDays(thisWeekStart, 7);
const lastWeekEnd = subDays(thisWeekStart, 1);
```

Display:
```
This Week (Feb 10 - Feb 16)
Last Week (Feb 3 - Feb 9)
```

Import `startOfWeek`, `endOfWeek` from date-fns.

---

## Tab 5: Backup - Grammar fix + restore warning

**File:** `src/components/settings/SettingsBackupRestore.tsx`

### 5a. Pluralization fix (line 241)

```typescript
{strategies.length} {strategies.length === 1 ? 'strategy' : 'strategies'}
```

### 5b. Restore warning

Already implemented! Lines 324-330 show a yellow warning alert: "This will overwrite your current settings. This action cannot be undone." -- This is already correct. No change needed.

---

## System-Level: Audit trail for exports

**File:** `src/pages/BulkExport.tsx`

Integrate `logAuditEvent` from `src/lib/audit-logger.ts` into export actions:

- On Binance export success: `logAuditEvent(userId, { action: 'sync_completed', entityType: 'sync_operation', metadata: { exportType: type, dateRange } })`
- On Journal export: same pattern
- On Backup export/restore: same pattern

This uses the existing audit system -- no new tables needed. Add a new audit action type if needed (e.g., `'export_completed'`).

**File:** `src/lib/audit-logger.ts`

Add new action:
```typescript
| 'export_completed'
| 'backup_exported'
| 'backup_restored'
```

---

## System-Level: Privacy/Encryption notice

**File:** `src/pages/BulkExport.tsx`

Add a small footer notice at the bottom of the page (below the Tabs):
```typescript
<p className="text-xs text-muted-foreground text-center pt-4">
  All data is stored encrypted at rest. Exported files are generated locally in your browser 
  and are not uploaded to any server. For exchange exports, data is fetched directly from 
  the exchange API via secure server-side functions.
</p>
```

---

## Out of Scope (Deferred)

- **Full Account Archive (ZIP)**: Requires bundling multiple export formats into a ZIP. Needs a ZIP library (e.g., JSZip). Good feature but separate task.
- **Export history log UI**: The audit trail captures metadata, but a dedicated "Export History" viewer is a separate feature.

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/pages/BulkExport.tsx` | Rename tab label, fix connection badge, add UTC notice, period context on analytics cards, contextual empty state, reconciliation empty state, weekly report date ranges, audit logging, privacy footer |
| `src/features/binance/useBinanceBulkExport.ts` | Update export type descriptions (order vs trade clarity) |
| `src/components/settings/JournalExportCard.tsx` | Add date range to export button label |
| `src/components/settings/SettingsBackupRestore.tsx` | Fix pluralization ("1 strategy") |
| `src/lib/audit-logger.ts` | Add export_completed, backup_exported, backup_restored actions |

