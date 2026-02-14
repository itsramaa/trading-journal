

# Dashboard Page: Deep UX Analysis & Fixes

## Scope & Coverage (100%)

All files read in full:

**Page**: `src/pages/Dashboard.tsx` (221 lines)

**Dashboard Widgets (11 files)**: `PortfolioOverviewCard.tsx` (268 lines), `DashboardAnalyticsSummary.tsx` (234 lines), `AIInsightsWidget.tsx` (496 lines), `RiskMetricsCards.tsx` (177 lines), `GoalTrackingWidget.tsx` (235 lines), `MarketScoreWidget.tsx` (306 lines), `SystemStatusIndicator.tsx` (173 lines), `ADLRiskWidget.tsx` (253 lines), `SmartQuickActions.tsx` (137 lines), `MarketSessionsWidget.tsx` (220 lines), `StrategyCloneStatsWidget.tsx` (172 lines)

**Cross-domain Components**: `RiskSummaryCard.tsx` (207 lines), `EquityCurveChart.tsx` (245 lines), `ErrorBoundary.tsx` (WidgetErrorBoundary)

**Hooks Traced**: `use-unified-portfolio-data.ts` (299 lines), `use-mode-filtered-trades`, `use-mode-visibility`, `use-trade-entries`, `use-positions`, `use-trading-gate`, `use-currency-conversion`, `use-realtime`, `use-binance-connection-status`, `use-binance-daily-pnl`, `use-ai-settings-enforcement`, `use-unified-market-score`, `use-risk-events`, `use-risk-profile`

**Route verification**: App.tsx route definitions cross-referenced

---

## Issues Found

### 1. `RiskSummaryCard` Links to Non-Existent Route (Broken Navigation)

`src/components/risk/RiskSummaryCard.tsx` line 61: `<Link to="/risk-management">` -- this route does not exist. The actual route defined in `App.tsx` is `/risk`. When a user without a risk profile clicks "Set Up Risk Profile", they navigate to a 404 page.

**Fix**: Change `/risk-management` to `/risk`.

### 2. `AIInsightsWidget` Uses Wrong PnL Field (Calculation Standard Violation)

`src/components/dashboard/AIInsightsWidget.tsx` line 55: `pairStats[pair].pnl += trade.pnl || 0;`

The `calculatePairStats` function uses `trade.pnl` directly, bypassing the standardized `realized_pnl ?? pnl ?? 0` fallback chain. For Binance-synced trades, `realized_pnl` is the authoritative value. This produces inaccurate pair win rate recommendations for live mode users.

**Fix**: Change to `pairStats[pair].pnl += trade.realized_pnl ?? trade.pnl ?? 0;`

### 3. `MarketScoreWidget` Uses 28 Hardcoded Color Instances (UX Standard Violation)

`src/components/dashboard/MarketScoreWidget.tsx` contains extensive hardcoded Tailwind colors instead of semantic tokens:

- `getBiasConfig()` (lines 60-93): Uses `text-green-500`, `bg-green-500/10`, `border-green-500/30`, `text-red-500`, `bg-red-500/10`, `border-red-500/30`, `text-red-600`, `bg-red-600/10`, `border-red-600/30`, `text-yellow-500`, `bg-yellow-500/10`, `border-yellow-500/30`
- `getScoreColor()` (lines 95-101): Uses `text-green-500`, `text-green-400`, `text-yellow-500`, `text-orange-500`, `text-red-500`
- `getProgressColor()` (lines 103-107): Uses `bg-green-500`, `bg-yellow-500`, `bg-red-500`
- Compact event warning (line 136): `text-yellow-500`

Per UX Consistency Standard #2, these should use semantic tokens: `text-profit`/`text-loss` for favorable/unfavorable bias, and chart tokens for intermediate levels.

**Fix**: Replace all hardcoded colors with semantic token equivalents:
- Long Favorable: `text-profit`, `bg-profit/10`, `border-profit/30`
- Short Favorable: `text-loss`, `bg-loss/10`, `border-loss/30`
- Avoid: `text-destructive`, `bg-destructive/10`, `border-destructive/30`
- Neutral: `text-[hsl(var(--chart-4))]`, `bg-[hsl(var(--chart-4))]/10`, `border-[hsl(var(--chart-4))]/30`
- Score colors: `text-profit` (>=70), `text-chart-2` (>=55), `text-chart-3` (>=45), `text-chart-4` (>=30), `text-loss` (<30)

### 4. `DashboardAnalyticsSummary` Has One Hardcoded Color (UX Standard Violation)

`src/components/dashboard/DashboardAnalyticsSummary.tsx` line 111: `text-yellow-500` for profit factor between 1.0-1.5.

**Fix**: Replace with `text-[hsl(var(--chart-4))]` (warning-level chart token).

### 5. `DashboardAnalyticsSummary` Returns `null` When < 3 Trades (Layout Stability Violation)

`DashboardAnalyticsSummary.tsx` line 106: `if (analyticsData.trades30d < 3) return null;`

Per UX Consistency Standard #4, components must provide fallback empty states instead of returning `null`, preventing layout shifts. When a new user has 1-2 trades, this row completely disappears, causing the layout to jump.

**Fix**: Return a minimal card with an informative message instead of null (e.g., "Log 3+ trades this month to see performance analytics").

### 6. `RiskMetricsCards` Returns `null` When < 3 Trades (Layout Stability Violation)

`RiskMetricsCards.tsx` line 49: `if (closedTrades.length < 3) return null;`

Same issue as #5. The entire "Advanced Risk Metrics" row disappears, causing layout shift.

**Fix**: Return a minimal card with context instead of null.

### 7. No Issues Found (Verified Correct)

- **Mode-as-context parity**: Dashboard layout is 100% identical between Paper and Live. The only mode-driven differences are data-level: `showExchangeData` controls visibility of live positions section (Row 5), ADL widget shows "Live Only" placeholder in Paper mode. Both are structural parity compliant -- same cards, same rows.
- **Data isolation**: `useModeFilteredTrades` used consistently across widgets. `useUnifiedPortfolioData` correctly switches between Binance and paper sources based on mode. `useTradeEntries` (unfiltered) used only for global empty-state check -- intentionally mode-agnostic.
- **PnL standard (other components)**: `PortfolioOverviewCard` delegates to `useUnifiedPortfolioData` which uses correct chain. `GoalTrackingWidget` uses `t.realized_pnl ?? t.pnl ?? 0`. `RiskMetricsCards` passes `realized_pnl` to calculation. `EquityCurveChart` uses `trade.realized_pnl ?? trade.pnl ?? 0`. `DashboardAnalyticsSummary` uses `t.realized_pnl ?? t.pnl ?? 0`. All correct.
- **Loading states**: `PortfolioOverviewCard` has skeleton, `SystemStatusIndicator` has spinner, `ADLRiskWidget` has skeleton, `AIInsightsWidget` has skeleton, `MarketScoreWidget` shows '--'. All correct.
- **Empty states**: `PortfolioOverviewCard` has onboarding CTA, `ADLRiskWidget` has "No Active Positions" state, `AIInsightsWidget` has "Generate Insights" CTA + disabled state, `EquityCurveChart` has empty message. All correct.
- **Error handling**: `EquityCurveChart` and `GoalTrackingWidget` wrapped in `WidgetErrorBoundary`. `MarketScoreWidget` has its own `ErrorBoundary`. `AIInsightsWidget` has internal error state with retry. `SystemStatusIndicator` has loading state.
- **Color tokens (other components)**: `PortfolioOverviewCard` uses `text-profit`/`text-loss` exclusively. `SystemStatusIndicator` uses `text-profit`, `text-loss`, and chart tokens for warning. `RiskSummaryCard` uses `text-profit`, `text-loss`, chart tokens. `GoalTrackingWidget` uses `text-profit`/`text-loss`. All correct.
- **ARIA**: `SystemStatusIndicator` has `role="status"`, `aria-live="polite"`. `ADLRiskWidget` positions have proper labels. `RiskMetricsCards` has `role="group"` and `aria-label`. `EquityCurveChart` has `role="img"` with descriptive `aria-label`. Correct.
- **Realtime**: Dashboard subscribes to `accounts`, `account_transactions`, `trade_entries` for live updates. Correct.
- **Dead components**: `MarketSessionsWidget` is not used on Dashboard (verified unused on any page -- but not raising as issue since it may be planned for future use). `StrategyCloneStatsWidget` correctly moved to StrategyManagement page.
- **Navigation links**: All other widget links (`/performance`, `/risk`, `/settings?tab=exchange`, `/settings?tab=ai`, `/accounts`, `/market`, `/trading`, `/strategies`) verified against App.tsx routes. All valid except #1.

---

## Implementation Plan

### File 1: `src/components/risk/RiskSummaryCard.tsx`

**Fix broken route** (line 61): Change `/risk-management` to `/risk`.

### File 2: `src/components/dashboard/AIInsightsWidget.tsx`

**Fix PnL calculation** (line 55): Change `trade.pnl || 0` to `(trade.realized_pnl ?? trade.pnl ?? 0)`.

### File 3: `src/components/dashboard/MarketScoreWidget.tsx`

**Replace all hardcoded colors with semantic tokens**:

`getBiasConfig()` (lines 58-93):
- LONG_FAVORABLE: `text-green-500` -> `text-profit`, `bg-green-500/10` -> `bg-profit/10`, `border-green-500/30` -> `border-profit/30`
- SHORT_FAVORABLE: `text-red-500` -> `text-loss`, `bg-red-500/10` -> `bg-loss/10`, `border-red-500/30` -> `border-loss/30`
- AVOID: `text-red-600` -> `text-destructive`, `bg-red-600/10` -> `bg-destructive/10`, `border-red-600/30` -> `border-destructive/30`
- NEUTRAL: `text-yellow-500` -> `text-[hsl(var(--chart-4))]`, `bg-yellow-500/10` -> `bg-[hsl(var(--chart-4))]/10`, `border-yellow-500/30` -> `border-[hsl(var(--chart-4))]/30`

`getScoreColor()` (lines 95-101):
- `text-green-500` -> `text-profit`
- `text-green-400` -> `text-chart-2`
- `text-yellow-500` -> `text-[hsl(var(--chart-3))]`
- `text-orange-500` -> `text-[hsl(var(--chart-4))]`
- `text-red-500` -> `text-loss`

`getProgressColor()` (lines 103-107):
- `bg-green-500` -> `bg-profit`
- `bg-yellow-500` -> `bg-[hsl(var(--chart-4))]`
- `bg-red-500` -> `bg-loss`

Compact event warning (line 136): `text-yellow-500` -> `text-[hsl(var(--chart-4))]`

Non-compact event warning (line 211): `bg-yellow-500/10 border-yellow-500/30 text-yellow-600` -> `bg-[hsl(var(--chart-4))]/10 border-[hsl(var(--chart-4))]/30 text-[hsl(var(--chart-4))]`

Also line 220: `border-yellow-500 text-yellow-600` -> `border-[hsl(var(--chart-4))] text-[hsl(var(--chart-4))]`

### File 4: `src/components/dashboard/DashboardAnalyticsSummary.tsx`

**Fix hardcoded color** (line 111): Change `text-yellow-500` to `text-[hsl(var(--chart-4))]`.

**Fix layout stability** (line 106): Replace `return null` with a minimal empty-state card:
```tsx
if (analyticsData.trades30d < 3) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <BarChart3 className="h-5 w-5 text-primary" />
          <span>Log 3+ trades this month to unlock 30-day performance analytics</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

### File 5: `src/components/dashboard/RiskMetricsCards.tsx`

**Fix layout stability** (line 49): Replace `return null` with a minimal empty-state card:
```tsx
if (closedTrades.length < 3) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-5 w-5 text-primary" />
          Advanced Risk Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Close 3+ trades to unlock advanced risk metrics (Sharpe, Sortino, VaR, and more)
        </p>
      </CardContent>
    </Card>
  );
}
```

---

## Technical Summary

| File | Change |
|------|--------|
| `src/components/risk/RiskSummaryCard.tsx` | Fix broken route `/risk-management` to `/risk` |
| `src/components/dashboard/AIInsightsWidget.tsx` | Fix PnL calculation to use `realized_pnl ?? pnl ?? 0` |
| `src/components/dashboard/MarketScoreWidget.tsx` | Replace 28 hardcoded colors with semantic tokens |
| `src/components/dashboard/DashboardAnalyticsSummary.tsx` | Fix 1 hardcoded color + replace `null` return with empty state |
| `src/components/dashboard/RiskMetricsCards.tsx` | Replace `null` return with empty state card |

Total: 5 files modified. Fixes cover 1 broken navigation, 1 PnL calculation violation, 2 layout stability violations, and 29 hardcoded color instances across 2 components.
