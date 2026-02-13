

# Fix: Notifications 400, Sidebar Toggle, Console Logs

## 3 Issues

### 1. Notifications 400 Bad Request

**Root Cause:** The `notifications` table has a partial unique index:
```sql
CREATE UNIQUE INDEX idx_notifications_welcome_unique 
ON notifications (user_id) 
WHERE type = 'system' AND title = 'Welcome to Portfolio Manager!'
```

But the code in `use-auth.ts` (line 87-96) uses `upsert` with `onConflict: 'user_id,type,title'` and title `'Welcome to Deriverse!'`. The partial index doesn't match this title, so Postgres can't find a unique constraint for the ON CONFLICT clause.

**Fix:**
- Drop the old partial index
- Create new partial index matching the actual title `'Welcome to Deriverse!'`
- DB migration: 
  ```sql
  DROP INDEX IF EXISTS idx_notifications_welcome_unique;
  CREATE UNIQUE INDEX idx_notifications_welcome_unique 
  ON public.notifications (user_id) 
  WHERE type = 'system' AND title = 'Welcome to Deriverse!';
  ```

---

### 2. Sidebar Expand/Collapse Not Working

**Root Cause:** In `DashboardLayout.tsx` line 124-126, `SidebarProvider` receives `defaultOpen={sidebarOpen}` which is only read **once** on mount (uncontrolled mode). The `onOpenChange` callback saves to localStorage, but the sidebar's internal state is disconnected from the persisted value.

**Fix:** Change from `defaultOpen` to `open` prop (controlled mode):
```tsx
<SidebarProvider 
  open={sidebarOpen}
  onOpenChange={setSidebarOpen}
>
```

This makes the sidebar fully controlled by `useSidebarPersistence`.

---

### 3. Remove [FullSync] Console Logs

**Root Cause:** Both `use-binance-full-sync.ts` and `use-binance-aggregated-sync.ts` contain 200+ `console.log/warn` calls with `[FullSync]` prefix. These are now redundant since the sync log panel in the UI displays this information.

**Fix:** Remove all `console.log` and `console.warn` calls that start with `[FullSync]` from both files. Keep `console.error` calls for genuine error tracking.

---

## Files Modified

| File | Change |
|------|--------|
| Database migration | Drop + recreate partial unique index on `notifications` |
| `src/components/layout/DashboardLayout.tsx` | `defaultOpen` to `open` (line 125) |
| `src/hooks/use-binance-full-sync.ts` | Remove all `[FullSync]` console.log/warn |
| `src/hooks/use-binance-aggregated-sync.ts` | Remove all `[FullSync]` console.log/warn |
