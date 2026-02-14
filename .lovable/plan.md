
# Settings Page: Deep UX Analysis & Fixes

## Scope & Coverage

Analyzed files (all read in full):
- `src/pages/Settings.tsx` (248 lines, page orchestrator with 5 tabs)
- `src/components/settings/TradingConfigTab.tsx` (273 lines, Trading tab)
- `src/components/settings/AISettingsTab.tsx` (provided in context, AI tab)
- `src/components/settings/BinanceApiSettings.tsx` (293 lines, Exchange tab)
- `src/components/settings/ComingSoonExchangeCard.tsx` (37 lines, exchange placeholder)
- `src/components/settings/ApiKeyForm.tsx`
- `src/components/settings/BinanceAccountConfigCard.tsx`
- `src/components/settings/BinanceAutoSyncToggle.tsx`
- `src/components/settings/BinanceDataSourceToggle.tsx`
- `src/components/settings/RetentionPeriodSetting.tsx`
- `src/components/settings/DeletedTradesPanel.tsx`
- `src/components/settings/RateLimitDisplay.tsx`
- `src/components/settings/SyncMonitoringPanel` (via BinanceApiSettings)
- `src/hooks/use-user-settings.ts` (provided in context)

## Issues Found

### 1. Uncontrolled Tabs -- No URL Write-Back

**Settings.tsx line 23-24**: `const [searchParams] = useSearchParams()` reads the `tab` param but does not destructure the setter.
**Line 74**: `<Tabs defaultValue={defaultTab}>` uses `defaultValue` (uncontrolled).

This means:
- Initial load from URL works (e.g., `/settings?tab=exchange`)
- But switching tabs does NOT update the URL
- Browser back/forward and bookmarking after tab switch are broken
- Inconsistent with the controlled `useSearchParams` pattern now established on Strategies, Backtest, Bulk Export, Performance, Risk, Position Calculator, AI Insights, and Import pages

**Fix**: Destructure the setter, replace `defaultValue` with controlled `value`/`onValueChange`.

### 2. Broken `text-warning` Color Token (2 files, 2 occurrences)

The CSS variable `--warning` does not exist in the project stylesheets.

**TradingConfigTab.tsx line 166**:
```
<AlertTriangle className="h-3 w-3 text-warning" />
```

**RateLimitDisplay.tsx line 37**:
```
isWarning ? 'text-warning' : 'text-muted-foreground'
```

Both render invisible/unstyled text because the token does not resolve.

**Fix**: Replace `text-warning` with `text-[hsl(var(--chart-4))]` (the orange/amber semantic token used for warnings throughout the app).

### 3. Mode Consistency (No Issues)

Settings is a user-level configuration page, not mode-dependent. The Exchange tab conditionally shows Binance sub-components based on connection status (`isConnected`), not trade mode. Both Paper and Live modes see the same settings structure. No fix needed.

### 4. Other Observations (No Fix Needed)

- **Notifications tab**: Inline in Settings.tsx with proper grouping (Trading Alerts, Reports, Channels). Clean implementation.
- **Appearance tab**: Theme switcher with visual preview cards. Correctly applies to DOM immediately.
- **AISettingsTab**: Full implementation with loading state, local state management, save button. No issues.
- **BinanceApiSettings**: Comprehensive CRUD with test connection, delete confirmation, conditional sub-panels. No issues.
- **ComingSoonExchangeCard**: Simple placeholder with dashed border. No issues.

---

## Implementation Plan

### File: `src/pages/Settings.tsx`
1. Destructure `setSearchParams` from `useSearchParams()`
2. Derive `activeTab` from search params with default `'trading'`
3. Replace `<Tabs defaultValue={defaultTab}>` with `<Tabs value={activeTab} onValueChange={...}>`

### File: `src/components/settings/TradingConfigTab.tsx`
1. Replace `text-warning` on line 166 with `text-[hsl(var(--chart-4))]`

### File: `src/components/settings/RateLimitDisplay.tsx`
1. Replace `text-warning` on line 37 with `text-[hsl(var(--chart-4))]`

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/pages/Settings.tsx` | Controlled tabs via `useSearchParams` (3 lines changed) |
| `src/components/settings/TradingConfigTab.tsx` | Replace 1 broken `text-warning` with semantic `chart-4` token |
| `src/components/settings/RateLimitDisplay.tsx` | Replace 1 broken `text-warning` with semantic `chart-4` token |
