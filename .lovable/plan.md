
# UI/UX Consistency & Best Practice Audit — Risk Overview, Performance, Daily P&L

## Issues Found

| # | Page | Issue | Severity |
|---|------|-------|----------|
| 1 | Daily P&L | Best Trade shows `+-Rp 16k` — double sign prefix (`+` hardcoded + `formatCompact` adds sign) | HIGH |
| 2 | Risk Overview | No loading skeleton — page renders empty cards while data loads | MEDIUM |
| 3 | Daily P&L | No loading skeleton — all values flash `0`/`Rp 0` on initial load | MEDIUM |
| 4 | Performance | Loading state only shows minimal `MetricsGridSkeleton` — no page header or filter skeleton | LOW |
| 5 | Daily P&L | `keepPreviousData` not applied to unified hooks (`useUnifiedDailyPnl`, `useUnifiedWeeklyPnl`, etc.) | MEDIUM |
| 6 | Risk Overview | `keepPreviousData` not applied to `useRiskProfile` / `useRiskEvents` hooks | LOW |

## Fixes

### 1. `src/pages/DailyPnL.tsx` — Fix double sign on Best Trade (line 237)

**Before:** `+{formatCompact(weeklyStats.bestTrade.pnl)}`
**After:** `{formatCompact(weeklyStats.bestTrade.pnl)}`

The `formatCompact` function already handles sign formatting. Hardcoding `+` creates `+-` for negative values and `++` for positive values.

### 2. `src/pages/DailyPnL.tsx` — Add loading skeleton

Add `isLoading` check from unified hooks. Show `PageHeader` + skeleton cards while data loads, preventing flash of zeros.

```typescript
// Check loading state from hooks
const isLoading = dailyStats.isLoading || weeklyStats.isLoading;

if (isLoading) {
  return (
    <div className="space-y-6">
      <PageHeader icon={DollarSign} title="Daily P&L" description="..." />
      <MetricsGridSkeleton />
    </div>
  );
}
```

### 3. `src/pages/RiskManagement.tsx` — Add loading skeleton

Add loading check for `useRiskProfile` and render skeleton during initial load.

```typescript
const { data: riskProfile, isLoading: profileLoading } = useRiskProfile();

if (profileLoading) {
  return (
    <div className="space-y-6">
      <PageHeader icon={Shield} title="Risk Management" description="..." />
      <MetricsGridSkeleton />
    </div>
  );
}
```

### 4. `src/pages/Performance.tsx` — Enhance loading skeleton

Add `PageHeader` to loading state so the title doesn't flash in. Already partially implemented — just ensure consistency.

### 5. Unified hooks — Add `keepPreviousData`

Apply `keepPreviousData` to the following hooks to prevent blink on mode/filter changes:
- `src/hooks/use-unified-daily-pnl.ts`
- `src/hooks/use-unified-weekly-pnl.ts`  
- `src/hooks/use-unified-week-comparison.ts`
- `src/hooks/use-symbol-breakdown.ts`
- `src/hooks/use-risk-profile.ts` (both queries)

This matches the pattern already applied to Trade History hooks.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/DailyPnL.tsx` | Fix `+-` sign bug, add loading skeleton |
| `src/pages/RiskManagement.tsx` | Add loading skeleton with `isLoading` guard |
| `src/hooks/use-unified-daily-pnl.ts` | Add `keepPreviousData` |
| `src/hooks/use-unified-weekly-pnl.ts` | Add `keepPreviousData` |
| `src/hooks/use-unified-week-comparison.ts` | Add `keepPreviousData` |
| `src/hooks/use-symbol-breakdown.ts` | Add `keepPreviousData` |
| `src/hooks/use-risk-profile.ts` | Add `keepPreviousData` |

## Impact

- Eliminates `+-` formatting bug on Best Trade card
- All three analytics pages show proper loading skeletons instead of flashing zeros
- `keepPreviousData` on 5 additional hooks prevents blink across Risk/DailyP&L pages during mode switches
- Consistent loading UX across the entire Analytics section
