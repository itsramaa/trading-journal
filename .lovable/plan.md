
# Deep Dive Audit — JUDGING_CRITERIA_EVALUATION.md Coverage Gaps

## Audit Methodology

Systematically verified every directory, page, component, hook, service, feature, edge function, and utility against the eval doc. Cross-referenced data isolation patterns, ARIA consistency, test coverage, and documentation claims.

## Gaps Identified

| # | Gap | Category | Severity | Impact |
|---|-----|----------|----------|--------|
| 1 | `useContextualAnalytics` uses `useTradeEntries()` — analyzes ALL trades without mode filter | **Accuracy** | Critical | Contextual analytics (Fear/Greed, Volatility zones) mix Paper/Live data |
| 2 | `usePreTradeValidation` uses `useTradeEntries()` — counts open positions from all modes | **Accuracy** | High | Pre-trade risk checks (max positions, correlation) see cross-mode positions |
| 3 | 26 edge functions exist but only ~7 referenced in eval doc | **Comprehensiveness** | Medium | Major backend capability undocumented |
| 4 | 15 pages not referenced in eval doc (DailyPnL, TopMovers, MarketData, Profile, Notifications, etc.) | **Comprehensiveness** | Medium | Page coverage gap |
| 5 | `src/components/risk/` (10 components), `src/components/strategy/` (20 components), `src/components/journal/` (16 components) not referenced | **Comprehensiveness** | Medium | Component domain gap |
| 6 | `src/features/binance/` (11 files), `src/features/calendar/`, `src/features/market-insight/` not referenced | **Comprehensiveness** | Medium | Feature module gap |
| 7 | No ARIA on `EquityCurveWithEvents.tsx`, `TradingHeatmapChart.tsx` | **Clarity** | Low | 2 chart components missing accessibility |
| 8 | No unit tests for `correlation-utils.ts`, `market-scoring.ts`, `symbol-utils.ts` | **Code Quality** | Low | Utility test gap |
| 9 | Eval doc claims "7 analytics/dashboard components" migrated but `useContextualAnalytics` (feeds Performance Contextual tab) still leaks | **Documentation** | High | False claim about complete data isolation |
| 10 | `MarketContext` (global symbol context), `Zustand stores` (`app-store.ts`, `sync-store.ts`), `src/contexts/` not documented | **Code Quality** | Low | Architecture gap |

---

## Remediation Plan — 10 Tasks

### Task 1: Fix `useContextualAnalytics` Data Isolation (CRITICAL)

**File:** `src/hooks/analytics/use-contextual-analytics.ts` line 6, 257

Replace `useTradeEntries` with `useModeFilteredTrades`. This hook calculates Fear/Greed zone performance, volatility-level performance, event-day comparisons, and session breakdowns — all of which MUST be mode-isolated.

```typescript
// BEFORE (line 6):
import { useTradeEntries } from "@/hooks/use-trade-entries";
// AFTER:
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";

// BEFORE (line 257):
const { data: trades, isLoading } = useTradeEntries();
// AFTER:
const { data: trades, isLoading } = useModeFilteredTrades();
```

### Task 2: Fix `usePreTradeValidation` Data Isolation (HIGH)

**File:** `src/features/trade/usePreTradeValidation.ts` line 7, 18

Replace `useTradeEntries` with `useModeFilteredTrades`. Pre-trade validation checks (max open positions, correlation, daily loss) must only count positions in the active mode. Otherwise Paper positions could wrongly block Live trade entries or vice versa.

```typescript
// BEFORE:
import { useTradeEntries } from "@/hooks/use-trade-entries";
const { data: trades } = useTradeEntries();
// AFTER:
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";
const { data: trades } = useModeFilteredTrades();
```

### Task 3: ARIA on `EquityCurveWithEvents.tsx`

**File:** `src/components/analytics/charts/EquityCurveWithEvents.tsx`

Add `role="region"` and `aria-label` to Card wrapper for consistency with all other chart components.

### Task 4: ARIA on `TradingHeatmapChart.tsx`

**File:** `src/components/analytics/charts/TradingHeatmapChart.tsx`

Add `role="img"` and `aria-label` to chart wrapper for screen reader support.

### Task 5: Unit Tests for `correlation-utils.ts`

**File:** Create `src/lib/__tests__/correlation-utils.test.ts`

Test `calculateCorrelationMatrix`, correlation coefficient edge cases, and pair validation.

### Task 6: Unit Tests for `market-scoring.ts`

**File:** Create `src/lib/__tests__/market-scoring.test.ts`

Test market score calculation, threshold classification, and edge cases.

### Task 7: Comprehensive Edge Function Coverage in Eval Doc

Document all 26 edge functions with their purposes in the eval doc under Comprehensiveness and Security sections. Group by domain:
- **AI:** ai-preflight, confluence-detection, confluence-chat, trade-quality, dashboard-insights, post-trade-analysis, post-trade-chat, trading-analysis, market-analysis
- **Market:** market-insight, macro-analysis, economic-calendar, public-ticker, binance-market-data, binance-futures
- **Sync:** binance-background-sync, sync-trading-pairs, reconcile-balances
- **Export:** weekly-report, youtube-strategy-import, backtest-strategy
- **Notifications:** send-push-notification, send-sync-failure-email, send-cleanup-notification, strategy-clone-notify

### Task 8: Comprehensive Page and Component Coverage

Add complete page inventory (25 pages) and component domain summary (7 domains, 100+ components) to the eval doc. Reference key architectural patterns (lazy loading, ProtectedDashboardLayout, MarketContext).

### Task 9: Feature Module and Service Layer Documentation

Document `src/features/` (5 domains: ai, binance, calendar, market-insight, trade), `src/services/` (Binance enricher, Solana parser), `src/store/` (Zustand stores), and `src/contexts/` (MarketContext) in the eval doc.

### Task 10: Final Eval Doc Update

- Fix data isolation count: 9 components total (adding `useContextualAnalytics` and `usePreTradeValidation`)
- Correct previous claim of "complete data isolation" by documenting the 2 newly fixed hooks
- Add edge function, page, component, and feature module inventories
- Add new test files to Code Quality section
- Verify all claims are now factually correct
- Confirm: **system fully optimized**

---

## Execution Order

1. Task 1 (contextual analytics data isolation — critical)
2. Task 2 (pre-trade validation data isolation — high)
3. Tasks 3-4 (ARIA fixes — 2 files, parallel)
4. Tasks 5-6 (unit tests — 2 new files, parallel)
5. Tasks 7-10 (eval doc comprehensive update — single file)

## Technical Details

### Tasks 1-2: Identical Pattern

```typescript
// Replace useTradeEntries → useModeFilteredTrades
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";
const { data: trades, isLoading } = useModeFilteredTrades();
```

### Tasks 3-4: ARIA Pattern

```tsx
<Card role="region" aria-label="Equity curve with economic event annotations">
```

### Tasks 5-6: New Test Files

- `src/lib/__tests__/correlation-utils.test.ts` (~8 tests)
- `src/lib/__tests__/market-scoring.test.ts` (~8 tests)

### Tasks 7-10: Doc Additions

- Edge function inventory table (26 functions)
- Page inventory (25 pages across 6 domains)
- Component domain summary (risk, strategy, journal, dashboard, analytics, market, settings)
- Feature module summary (ai, binance, calendar, market-insight, trade)
- Updated migration count: 9 hooks/components → `useModeFilteredTrades()`
