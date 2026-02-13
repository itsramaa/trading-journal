
# UI/UX Polish — My Strategies, Backtest, Bulk Export

## Current State

All three pages are functionally complete. The remaining issues are loading state consistency and minor UX polish to match the standards already applied to Analytics pages.

## Issues Found

| # | Page | Issue | Severity |
|---|------|-------|----------|
| 1 | My Strategies | Loading skeleton uses raw `h1`/`p` instead of `PageHeader` component (lines 151-154) | MEDIUM |
| 2 | Backtest > Compare | Loading state is just "animate-pulse" text — no skeleton cards or structure (lines 112-122) | MEDIUM |
| 3 | Bulk Export | No loading state — page renders immediately but sub-hooks (`useModeFilteredTrades`, `useBinanceDailyPnl`) may still be loading | LOW |

All other aspects (forms, filters, charts, empty states, tooltips, responsiveness, modals, actions) are already fully implemented and consistent.

## Fixes

### 1. StrategyManagement Loading State (`src/pages/trading-journey/StrategyManagement.tsx`, lines 148-157)

Replace raw `h1`/`p` with `PageHeader` to match all other pages:

**Before:**
```tsx
<div>
  <h1 className="text-3xl font-bold tracking-tight">Strategy & Rules</h1>
  <p className="text-muted-foreground">Create and manage your trading strategies</p>
</div>
<MetricsGridSkeleton />
```

**After:**
```tsx
<PageHeader
  icon={Target}
  title="Strategy & Rules"
  description="Create, import, and backtest your trading strategies"
/>
<MetricsGridSkeleton />
```

### 2. BacktestComparison Loading State (`src/components/strategy/BacktestComparison.tsx`, lines 112-122)

Replace "Loading backtest history..." text with structured skeleton:

**Before:**
```tsx
<Card>
  <CardContent className="py-8">
    <div className="flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading backtest history...</div>
    </div>
  </CardContent>
</Card>
```

**After:**
```tsx
<div className="space-y-6">
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-72" />
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </CardContent>
  </Card>
</div>
```

### 3. No Changes Needed for Bulk Export

Bulk Export renders immediately with tab structure visible. Sub-components (`JournalExportCard`, `SettingsBackupRestore`) handle their own loading states internally. The Binance tab already handles disconnected state with an Alert. Adding a top-level loading guard would delay showing the entire tab structure unnecessarily.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/trading-journey/StrategyManagement.tsx` | Replace raw h1/p with PageHeader in loading state |
| `src/components/strategy/BacktestComparison.tsx` | Replace text-only loading with Skeleton cards |

## Impact

- Strategy page loading state matches all other pages (PageHeader + skeleton)
- Backtest comparison loading shows structured skeleton instead of plain text
- Full consistency across the Tools section (Strategies, Backtest, Export)
