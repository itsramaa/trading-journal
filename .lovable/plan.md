

# Bulk Export: Hardening & UX Gap Fixes

Addresses 7 feedback items: date range enforcement, privacy wording, contextual error states, backup version safety, export audit visibility, and minor polish.

---

## 1. Date Range Validation (Enforce 365-day Max)

**Problem:** The "Maximum range is 1 year" text exists but nothing prevents selecting > 365 days. API will fail silently.

**File:** `src/pages/BulkExport.tsx`

Add `differenceInDays` import from date-fns. Compute validation state:

```typescript
const rangeDays = differenceInDays(dateRange.to, dateRange.from);
const isRangeInvalid = rangeDays > 365;
```

Changes:
- Disable all 3 export buttons when `isRangeInvalid`
- Show inline validation error below date range text:
  ```
  {isRangeInvalid && (
    <p className="text-sm text-loss">
      Selected range is {rangeDays} days. Maximum allowed is 365 days.
    </p>
  )}
  ```
- Auto-clamp in calendar `disabled` prop: End Date calendar disables dates more than 365 days from `dateRange.from`

---

## 2. Privacy Notice Wording Fix

**Problem:** "Exported files are generated locally in your browser" -- Binance exports are NOT local; they go through the edge function to Binance API and return a server-generated URL. This is misleading.

**File:** `src/pages/BulkExport.tsx` (lines 689-692)

Replace with accurate wording:

```
Journal and analytics exports are generated locally in your browser.
Exchange exports are fetched securely via server-side functions and are not stored on our servers.
All data is encrypted at rest.
```

---

## 3. Contextual Analytics: Differentiate "No Data" vs "Service Unavailable"

**Problem:** When Fear/Greed API fails, contextual analytics shows "0 trades" without explaining why.

**File:** `src/hooks/analytics/use-contextual-analytics.ts`

The hook returns `null` when there are no trades or insufficient data. It does not distinguish API failure from lack of context.

**Fix in:** `src/pages/BulkExport.tsx` (lines 550-559)

The current logic already differentiates:
- `contextualData` exists but `tradesWithContext === 0` --> "No trades have market context"
- `contextualData` is `null` --> "No trades match contextual filters"

But the second case is wrong -- `null` means insufficient data, not a filter issue. Update:
```typescript
{contextualData
  ? 'No trades have market context attached. Enrich trades via Import & Sync.'
  : closedTrades.length > 0
    ? 'Insufficient data or context service unavailable. Ensure trades have been enriched with market context.'
    : 'No closed trades available for analysis.'}
```

---

## 4. Backup Version Compatibility Check

**Problem:** Restoring a backup from a future or incompatible version could crash the app. Current version is hardcoded `'1.0'` but no validation on import.

**File:** `src/components/settings/SettingsBackupRestore.tsx`

Add version compatibility constants and validation:

```typescript
const CURRENT_BACKUP_VERSION = '1.0';
const COMPATIBLE_VERSIONS = ['1.0'];
```

In `handleFileSelect`, after parsing:
```typescript
if (!COMPATIBLE_VERSIONS.includes(backup.version)) {
  toast.error(`Incompatible backup version: ${backup.version}. Current version: ${CURRENT_BACKUP_VERSION}`);
  setImportPreview(null);
  return;
}
```

Show version in the import preview alert:
```
Exported on: {date} (v{importPreview.version})
```

---

## 5. Backup Audit Logging

**Problem:** Export and restore actions are not audit-logged in the backup component.

**File:** `src/components/settings/SettingsBackupRestore.tsx`

Import `logAuditEvent` and `supabase`. After successful export:
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  logAuditEvent(user.id, {
    action: 'backup_exported',
    entityType: 'user_settings',
    metadata: { includeSettings, includeRiskProfile, includeStrategies },
  });
}
```

After successful restore:
```typescript
logAuditEvent(user.id, {
  action: 'backup_restored',
  entityType: 'user_settings',
  metadata: { version: importPreview.version, contents: Object.keys(importPreview.data) },
});
```

---

## 6. Export History Mini-Viewer (Lightweight)

**Problem:** No visibility into past exports. The audit_logs table already captures events, but there is no UI.

**File:** `src/pages/BulkExport.tsx`

Add a collapsible "Recent Export Activity" section at the bottom of the page (above the privacy notice). Query audit_logs for the current user filtered by export/backup actions:

```typescript
const { data: exportHistory } = useQuery({
  queryKey: ['export-history'],
  queryFn: async () => {
    const { data } = await supabase
      .from('audit_logs')
      .select('action, metadata, created_at')
      .in('action', ['export_completed', 'backup_exported', 'backup_restored'])
      .order('created_at', { ascending: false })
      .limit(10);
    return data || [];
  },
});
```

Display as a simple list with timestamp, action label, and metadata summary. Use a Collapsible component so it does not clutter the page by default.

---

## 7. Minor Polish

### 7a. Contextual Analytics empty state already addressed in item 3.

### 7b. Analytics/Reports tab naming -- No change needed.
The current split (Analytics = raw data breakdowns, Reports = formatted/official outputs) is semantically correct and matches the user's own mental model description.

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/pages/BulkExport.tsx` | Date range validation + auto-clamp; privacy wording fix; contextual empty state refinement; export history collapsible; import `differenceInDays` |
| `src/components/settings/SettingsBackupRestore.tsx` | Version compatibility check on import; audit logging for export/restore |
| `src/hooks/analytics/use-contextual-analytics.ts` | No changes needed (logic already correct) |

## What Does NOT Change
- Exchange export flow (already has loading/error/success states with progress bar)
- Journal export (already has loading spinner and date range label)
- Backup restore warning (already implemented)
- Pluralization fix (already applied in previous iteration)
- Tab naming structure (Analytics vs Reports)

