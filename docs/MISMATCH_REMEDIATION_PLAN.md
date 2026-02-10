# Mismatch Remediation Plan

> **Version:** 1.4  
> **Created:** 2026-02-10  
> **Updated:** 2026-02-10 (cross-check pass #6 — direct DB query + balance consumer audit)  
> **Reference:** `docs/DETAILED_USER_SCENARIO.md`  
> **Status:** Active — Phase A pending  
> **Summary:** 48 mismatches (11 Critical, 5 High, 32 Medium)

---

## 1. Mismatch Registry

### Critical (Data Isolation Violations)

| ID | Title | Spec Section | Current State | Required State | Affected Files | Phase |
|----|-------|-------------|---------------|----------------|----------------|-------|
| C-01 | Dashboard tidak enforce mode visibility | §3.1/3.2 | No `useModeVisibility` import. Active Positions shown regardless of mode. | Paper: hide Binance positions/balance. Live: hide paper data. | `src/pages/Dashboard.tsx` | A |
| C-02 | PortfolioOverviewCard ignores trade_mode | §12.1 | `useUnifiedPortfolioData` mixes paper + live balances. | Return only mode-relevant data. | `src/hooks/use-unified-portfolio-data.ts`, `PortfolioOverviewCard` | A |
| C-03 | Performance page zero mode filtering | §12.1 | All trades aggregated (paper + live). Equity curve cross-contaminated. | Filter all analytics by `trade_mode`. | `src/pages/Performance.tsx`, analytics hooks | A |
| C-04 | `get_trade_stats` RPC missing `p_trade_mode` | §12 | RPC has no `p_trade_mode` parameter. | Add `p_trade_mode` filter to RPC function. | `supabase/migrations/`, `src/hooks/use-trade-stats.ts` | A |
| C-05 | TradeHistory tidak filter by trade_mode | §12 | Separates by `source` tab only, not `trade_mode` field. | Add `trade_mode` to query filter. | `src/pages/TradeHistory.tsx`, `use-trade-entries-paginated.ts` | A |
| C-06 | SmartQuickActions ignores mode | §3.2 | "Add Trade" uses `useTradingGate` only, not `canCreateManualTrade`. | Hide/disable "Add Trade" in Live mode via `useModeVisibility`. | `src/components/dashboard/SmartQuickActions.tsx` | A |
| C-07 | AIInsights page zero mode filtering | §12.1 | `useTradeEntries()` unfiltered — all trades (paper+live) mixed in pattern analysis. | Filter trades by active `trade_mode`. | `src/pages/AIInsights.tsx` | A |
| C-08 | TradingHeatmap page zero mode filtering | §12.1 | `useTradeEntries()` unfiltered — heatmap data cross-contaminated. | Filter trades by active `trade_mode`. | `src/pages/TradingHeatmap.tsx` | A |
| C-09 | DashboardAnalyticsSummary zero mode filtering | §12.1 | 30-day sparkline and win rate use unfiltered `useTradeEntries()`. | Filter by `trade_mode` or consume mode-aware hook. | `src/components/dashboard/DashboardAnalyticsSummary.tsx` | A |
| C-10 | Performance analytics sub-components zero mode filtering | §12.1 | `EmotionalPatternAnalysis`, `AIPatternInsights`, `CryptoRanking` each independently call unfiltered `useTradeEntries()`. Pattern analysis cross-contaminated. | Filter by `trade_mode` or accept filtered trades as prop. | `src/components/analytics/EmotionalPatternAnalysis.tsx`, `AIPatternInsights.tsx`, `CryptoRanking.tsx` | A |
| C-11 | `useBestAvailableBalance` ignores trade_mode (ROOT CAUSE) | §3.1/12.1 | Returns Binance balance if connected, regardless of `trade_mode`. Cascades to PositionCalculator, TradingGate, DailyRiskStatus. | Paper: always paper balance. Live: Binance if connected. | `src/hooks/use-combined-balance.ts` | A |

### High (UX & Audit Gaps)

| ID | Title | Spec Section | Current State | Required State | Affected Files | Phase |
|----|-------|-------------|---------------|----------------|----------------|-------|
| H-01 | Audit logger only covers trade creation | §13 | `logAuditEvent` called only in `submitTrade()`. | Cover: trade close, delete, restore, API key save/delete, sync, settings change. | Multiple hooks + components | C |
| H-02 | RiskManagement no mode awareness | §3.1/3.2 | No mode hook imported. Shows Binance data in Paper mode. | Paper: simulator-based risk. Live: Binance-based risk. | `src/pages/RiskManagement.tsx` | D |
| H-03 | No SIMULATION banner in Paper mode | §3.1 | Only small "PAPER" badge in `TradeModeSelector`. | Persistent SIMULATION banner with amber styling across all pages. | `src/components/layout/DashboardLayout.tsx` | B |
| H-04 | No mandatory session context enforcement | §2.2 | Defaults to `live` silently. No explicit selection required. | Modal forces mode + style selection before first use. | `DashboardLayout.tsx`, new `SessionContextModal.tsx` | B |
| H-05 | DailyPnL page no mode filtering | §12.1 | `useUnifiedDailyPnl` and `useUnifiedWeeklyPnl` mix paper+live data. Source badge shown but data not filtered by `trade_mode`. | Filter all daily/weekly hooks by active `trade_mode`. | `src/pages/DailyPnL.tsx`, `use-unified-daily-pnl.ts`, `use-unified-weekly-pnl.ts` | A |

### Medium (Feature Polish)

| ID | Title | Spec Section | Current State | Required State | Affected Files | Phase |
|----|-------|-------------|---------------|----------------|----------------|-------|
| M-01 | Active Trade tab missing fees/funding + time-in-trade | §8.2 | Shows P&L and prices only. | Add fee/funding columns + time-in-trade duration. | `AllPositionsTable` | D |
| M-02 | AI Post-Mortem not structured in enrichment drawer | §11.1 | `usePostTradeAnalysis` exists but no structured UI. | Display structured sections: Entry timing, Exit efficiency, SL placement, Strategy adherence. | `TradeEnrichmentDrawer` | D |
| M-03 | No daily reconciliation cron | §13 | `useBalanceReconciliation` exists but not auto-triggered. | Scheduled reconciliation with mismatch alerts. | Edge function (new) | D |
| M-04 | No WebSocket fallback documentation | §13 | REST polling used. No WebSocket or fallback docs. | Document as acceptable trade-off in architecture docs. | `docs/` | D |
| M-05 | TodayPerformance widget no mode awareness | §3.1/3.2 | Mixes Binance + local data without checking `trade_mode`. In Paper mode, still tries Binance data. | Paper: show only local journal data. Live: show Binance-enriched data. | `src/components/dashboard/TodayPerformance.tsx` | D |
| M-06 | BulkExport no mode filtering | §12.1 | Exports all trades regardless of mode. | Export should respect active mode or allow explicit mode selection. | `src/pages/BulkExport.tsx` | D |
| M-07 | AccountDetail page no mode awareness | §3.1/3.2 | `useTradeEntries()` unfiltered in account detail view. | Filter trades by mode when displaying account-linked trades. | `src/pages/AccountDetail.tsx` | D |
| M-08 | AIInsightsWidget (dashboard) zero mode filtering | §12.1 | Independently calls unfiltered `useTradeEntries()` for AI analysis. | Filter trades by `trade_mode` before passing to AI. | `src/components/dashboard/AIInsightsWidget.tsx` | D |
| M-09 | RiskSummaryCard shows Binance positions in Paper mode | §3.1 | Uses `usePositions()` + `useBinanceConnectionStatus()` regardless of mode. Shows correlation risk for Binance positions in Paper mode. | Paper: hide Binance position data. Live: show full risk. | `src/components/risk/RiskSummaryCard.tsx` | D |
| M-10 | CorrelationMatrix zero mode filtering | §12.1 | Uses unfiltered `useTradeEntries()` for correlation analysis. | Filter by `trade_mode`. | `src/components/risk/CorrelationMatrix.tsx` | D |
| M-11 | JournalExportCard zero mode filtering | §12.1 | Exports all trades regardless of mode. | Respect active mode or add mode selector. | `src/components/settings/JournalExportCard.tsx` | D |
| M-12 | PositionCalculator + TradingGate balance source ignores mode | §3.1 | `useBestAvailableBalance` returns Binance balance in Paper mode. Cascaded fix via C-11. | Consumers automatically fixed when C-11 is resolved. | `src/pages/PositionCalculator.tsx`, `src/hooks/use-trading-gate.ts` | A (via C-11) |
| M-13 | ContextWarnings (risk calculator) zero mode filtering | §12.1 | Uses unfiltered `useTradeEntries()` for correlation context. | Filter by `trade_mode`. | `src/components/risk/calculator/ContextWarnings.tsx` | D |
| M-14 | use-context-aware-risk hook zero mode filtering | §12.1 | Uses unfiltered `useTradeEntries()` for dynamic risk adjustment. | Filter by `trade_mode` for mode-isolated risk calculations. | `src/hooks/use-context-aware-risk.ts` | D |
| M-15 | use-monthly-pnl hook zero mode filtering | §12.1 | Uses unfiltered `useTradeEntries()` for monthly comparison. MoM stats cross-contaminated. | Filter by `trade_mode`. | `src/hooks/use-monthly-pnl.ts` | A |
| M-16 | use-strategy-performance hook zero mode filtering | §12.1 | Uses unfiltered `useTradeEntries()` for per-strategy stats. | Filter by `trade_mode`. | `src/hooks/use-strategy-performance.ts` | A |
| M-17 | AIChatbot zero mode filtering | §12.1 | Uses unfiltered `useTradeEntries()` for chat context — AI analyzes all trades regardless of mode. | Filter trades by `trade_mode` before passing to AI chat context. | `src/components/chat/AIChatbot.tsx` | D |
| M-18 | use-trading-gate trades not mode-filtered | §12.1 | `useTradeEntries()` call (line 48) for AI quality scoring uses all trades. Separate from C-11 balance fix. | Filter by `trade_mode` for mode-isolated quality assessment. | `src/hooks/use-trading-gate.ts` | D |
| M-19 | DrawdownChart zero mode filtering | §12.1 | Uses unfiltered `useTradeEntries()` for drawdown calculation. Equity curve cross-contaminated. | Filter by `trade_mode` or accept filtered trades as prop. | `src/components/analytics/DrawdownChart.tsx` | A |
| M-20 | TradingHeatmap component fallback fetch unfiltered | §12.1 | Component has internal `useTradeEntries()` fallback when no `externalTrades` prop passed. Fallback is unfiltered. | Filter fallback by `trade_mode`. Page-level fix (C-08) should always pass filtered trades. | `src/components/analytics/TradingHeatmap.tsx` | A |
| M-21 | SevenDayStatsCard zero mode filtering | §12.1 | Uses unfiltered `useTradeEntries()` for 7-day summary stats. | Filter by `trade_mode`. | `src/components/analytics/SevenDayStatsCard.tsx` | D |
| M-22 | FinalChecklist (Trade Entry Wizard) zero mode filtering | §12.1 | Uses `useTradeEntries()` for AI quality scoring context. Includes trades from wrong mode in AI analysis. | Filter by `trade_mode` for mode-isolated AI scoring context. | `src/components/trade/entry/FinalChecklist.tsx` | D |
| M-23 | ADLRiskWidget visible in Paper mode | §3.1 | Uses `useBinancePositions()` directly without mode visibility check. Shows ADL risk for Binance positions in Paper mode. | Hide or show empty state in Paper mode via `useModeVisibility`. | `src/components/dashboard/ADLRiskWidget.tsx` | D |
| M-24 | MarginHistoryTab visible in Paper mode | §3.1 | Uses `usePositions()` without mode visibility check. Shows Binance margin history in Paper mode. | Hide or show empty state in Paper mode via `useModeVisibility`. | `src/components/risk/MarginHistoryTab.tsx` | D |
| M-25 | use-daily-pnl hook no mode awareness | §12.1 | Uses `useBinanceDailyPnl()` without mode check. Paper mode should never use Binance P&L data. Consumed by `TodayPerformance.tsx` (M-05). | Consume `useTradeMode()`. Paper → force local-only path. | `src/hooks/use-daily-pnl.ts` | D |
| M-26 | useDailyRiskStatus uses Binance data without mode check | §3.1/12.1 | `use-risk-profile.ts` → `useDailyRiskStatus` uses `useBinanceTotalBalance()` and `useBinanceDailyPnl()` without mode check. Paper mode risk calculations contaminated by Binance data. Related to C-11 but distinct hook. | Consume `useTradeMode()`. Paper → paper balance only. Live → Binance if connected. | `src/hooks/use-risk-profile.ts` | D |
| M-27 | TradingJournal trade list not filtered by trade_mode | §12.1 | `useTradeEntries()` returns all trades. Even with `useModeVisibility` hiding Binance UI widgets, the trade list itself shows paper+live trades mixed. | Filter `useTradeEntries()` by active `trade_mode`. | `src/pages/trading-journey/TradingJournal.tsx` | A |
| M-28 | SetupStep (Trade Entry Wizard) shows Binance balance in Paper mode | §3.1 | Uses `useBinanceBalance()` directly. In Paper mode (where wizard is active), still shows Binance balance instead of paper account balance. | Paper mode → show paper account balance only. Hide Binance balance display. | `src/components/trade/entry/SetupStep.tsx` | D |
| M-29 | BacktestRunner uses Binance balance without mode check | §3.1 | Uses `useBinanceBalance()` for initial capital quick-fill. In Paper mode, should default to paper balance. | Consume `useTradeMode()`. Paper → paper balance for quick-fill. Live → Binance if connected. | `src/components/strategy/BacktestRunner.tsx` | D |
| M-30 | useAIPreflight queries trade_entries without trade_mode filter | §12.1 | Fetches 730 days of closed trades without `trade_mode` filter. AI pre-flight check analyzes cross-mode data. | Add `.eq('trade_mode', activeMode)` to query. | `src/features/ai/useAIPreflight.ts` | D |
| M-31 | use-weekly-report-export queries trade_entries without trade_mode filter | §12.1 | Weekly report export fetches all closed trades regardless of mode. Export data cross-contaminated. | Add `trade_mode` filter to query. | `src/hooks/use-weekly-report-export.ts` | D |
| M-32 | use-ai-strategy-recommendation queries trade_entries without trade_mode filter | §12.1 | AI strategy recommendation analyzes last 100 trades without mode filter. Recommendations based on mixed data. | Add `trade_mode` filter to query. | `src/hooks/use-ai-strategy-recommendation.ts` | D |
---

## 2. Phase A: Data Isolation (C-01 → C-06)

**Goal:** Ensure zero cross-contamination between Paper and Live data across all pages.

### Step A.1: DB Migration — Add `p_trade_mode` to `get_trade_stats`

```sql
-- Add p_trade_mode TEXT parameter
-- Filter: WHERE (p_trade_mode IS NULL OR te.trade_mode = p_trade_mode)
```

**Acceptance:** RPC returns different results for `p_trade_mode='paper'` vs `p_trade_mode='live'`.

### Step A.2: Hook Updates

| Hook | Change |
|------|--------|
| `use-trade-stats.ts` | Pass `tradeMode` from `useTradeMode()` as `p_trade_mode` |
| `use-trade-entries-paginated.ts` | Add `trade_mode` to query `.eq()` filter |
| `use-unified-portfolio-data.ts` | Consume `useTradeMode()`, return mode-relevant data only |
| `use-combined-balance.ts` | **ROOT FIX (C-11)**: `useBestAvailableBalance` consumes `useTradeMode()`. Paper → always paper. Live → Binance if connected. Cascades fix to PositionCalculator, TradingGate, DailyRiskStatus. |

### Step A.3: Page & Component Updates

| Page/Component | Change |
|----------------|--------|
| `Dashboard.tsx` | Import `useModeVisibility`. Conditionally render Active Positions (Live only). Filter portfolio data by mode. |
| `Performance.tsx` | Import `useTradeMode`. Pass `trade_mode` to all analytics hooks. |
| `TradeHistory.tsx` | Add `trade_mode` to `TradeFilters`. Filter paginated query by active mode. |
| `SmartQuickActions.tsx` | Import `useModeVisibility`. Hide "Add Trade" when `canCreateManualTrade === false`. |
| `AIInsights.tsx` | Import `useTradeMode`. Filter `useTradeEntries()` by `trade_mode` before analysis. |
| `TradingHeatmap.tsx` | Import `useTradeMode`. Filter `useTradeEntries()` by `trade_mode`. |
| `DashboardAnalyticsSummary.tsx` | Import `useTradeMode`. Filter trades by `trade_mode` in `useMemo`. |
| `DailyPnL.tsx` | Pass `trade_mode` to unified daily/weekly hooks. |
| `EmotionalPatternAnalysis.tsx` | Accept filtered trades as prop OR import `useTradeMode` and filter internally. |
| `AIPatternInsights.tsx` | Accept filtered trades as prop OR import `useTradeMode` and filter internally. |
| `CryptoRanking.tsx` | Accept filtered trades as prop OR import `useTradeMode` and filter internally. |
| `DrawdownChart.tsx` | Accept filtered trades as prop OR import `useTradeMode` and filter internally. (M-19) |
| `TradingHeatmap.tsx` (component) | Filter internal `useTradeEntries()` fallback by `trade_mode`. (M-20) |
| `TradingJournal.tsx` | Filter `useTradeEntries()` by active `trade_mode`. (M-27) |

### Step A.4: Unified Hook Updates (NEW)

| Hook | Change |
|------|--------|
| `use-unified-daily-pnl.ts` | Consume `useTradeMode()`, Paper → force paper path, filter trades by `trade_mode` |
| `use-unified-weekly-pnl.ts` | Consume `useTradeMode()`, Paper → force paper path, filter trades by `trade_mode` |
| `use-unified-week-comparison.ts` | Consume `useTradeMode()`, filter data by mode |
| `use-symbol-breakdown.ts` | Consume `useTradeMode()`, filter data by mode |
| `use-contextual-analytics.ts` | Consume `useTradeMode()`, filter `useTradeEntries()` by `trade_mode` |
| `use-monthly-pnl.ts` | Consume `useTradeMode()`, filter `useTradeEntries()` by `trade_mode` (M-15) |
| `use-strategy-performance.ts` | Consume `useTradeMode()`, filter `useTradeEntries()` by `trade_mode` (M-16) |

### Verification Checklist — Phase A

- [ ] Paper mode: Dashboard shows NO Binance positions/balance
- [ ] Paper mode: Performance shows ONLY paper trade stats
- [ ] Paper mode: TradeHistory shows ONLY paper trades
- [ ] Paper mode: AIInsights analyzes ONLY paper trades
- [ ] Paper mode: TradingHeatmap shows ONLY paper trade heatmap
- [ ] Paper mode: DashboardAnalyticsSummary sparkline shows ONLY paper data
- [ ] Paper mode: DailyPnL shows ONLY paper P&L data
- [ ] Live mode: Dashboard shows Binance data, NO paper trades
- [ ] Live mode: "Add Trade" button is hidden/disabled
- [ ] Live mode: Performance shows ONLY live trade stats
- [ ] Switching mode immediately updates all views
- [ ] `get_trade_stats` RPC accepts and correctly filters by `p_trade_mode`

---

## 3. Phase B: UX Enforcement (H-03, H-04)

**Goal:** Make mode context visually clear and enforce explicit selection.

### Step B.1: SIMULATION Banner

- Location: `DashboardLayout.tsx`, below header, above main content
- Style: Amber background, non-dismissible, text "⚠ SIMULATION MODE — Data tidak mempengaruhi statistik Live"
- Condition: `tradeMode === 'paper'`

### Step B.2: Session Context Modal

- New component: `SessionContextModal.tsx`
- Trigger: First login OR if `active_trade_mode` has never been explicitly set
- Content: Mode selector (Paper/Live) + Style selector (Scalping/Short/Swing)
- Behavior: Blocks navigation until submitted. Saves to `user_settings`.
- Hook change: `use-trade-mode.ts` adds `hasSelectedContext` flag

### Verification Checklist — Phase B

- [ ] Paper mode shows persistent amber SIMULATION banner on ALL pages
- [ ] Live mode does NOT show SIMULATION banner
- [ ] New user sees mandatory session context modal on first visit
- [ ] Modal cannot be dismissed without selecting mode + style
- [ ] After selection, modal does not reappear on subsequent logins

---

## 4. Phase C: Audit Trail Expansion (H-01)

**Goal:** Full audit coverage for all sensitive operations.

### Integration Points

| Flow | File | Audit Action |
|------|------|-------------|
| Trade close | `use-close-position.ts` or equivalent | `trade.close` |
| Trade delete | `use-trade-entries.ts` | `trade.delete` |
| Trade restore | `use-trade-entries.ts` | `trade.restore` |
| API key save | `ApiKeyForm.tsx` | `api_key.save` |
| API key delete | `ApiKeyForm.tsx` | `api_key.delete` |
| Settings change | `use-user-settings.ts` | `settings.update` |
| Sync start | `use-binance-sync.ts` | `sync.start` |
| Sync complete | `use-binance-sync.ts` | `sync.complete` |
| Sync fail | `use-binance-sync.ts` | `sync.fail` |
| Risk profile update | Risk settings hook | `risk_profile.update` |

### Verification Checklist — Phase C

- [ ] Closing a trade creates an audit log entry
- [ ] Deleting a trade creates an audit log entry
- [ ] Saving API key creates an audit log entry
- [ ] Changing settings creates an audit log entry
- [ ] Sync operations create audit log entries
- [ ] All audit entries have correct `entity_type`, `entity_id`, `action`, `metadata`

---

## 5. Phase D: Polish (H-02, M-01 → M-04)

**Goal:** Complete remaining gaps for production readiness.

### D.1: Risk Page Mode Awareness (H-02)

- `RiskManagement.tsx`: Import `useModeVisibility`
- Paper mode: Use paper-sourced balance for risk calculations
- Live mode: Use Binance balance

### D.2: Active Trade Columns (M-01)

- `AllPositionsTable`: Add columns for:
  - `fees_funding`: Commission + funding fees
  - `time_in_trade`: Duration since entry (live updating)

### D.3: AI Post-Mortem UI (M-02)

- `TradeEnrichmentDrawer`: Add structured section displaying:
  - Entry timing analysis
  - Exit efficiency score
  - SL placement evaluation
  - Strategy adherence assessment
- Data source: `post_trade_analysis` JSONB field

### D.4: Daily Reconciliation (M-03)

- **Decision:** Document as known gap OR implement edge function cron
- If implemented: Edge function triggered daily, compares local DB vs Binance account state
- Mismatch → notification + `account_balance_discrepancies` entry

### D.5: WebSocket Gap Documentation (M-04)

- Document in `docs/ARCHITECTURE.md`:
  - Current approach: REST polling via edge functions
  - Trade-off: Acceptable latency (5-30s) vs WebSocket complexity
  - Future consideration: WebSocket for sub-second updates

### D.6: TodayPerformance Mode Awareness (M-05)

- `TodayPerformance.tsx`: Import `useModeVisibility`
- Paper mode: Show only local journal data, skip Binance stats entirely
- Live mode: Show Binance-enriched data as current

### D.7: BulkExport Mode Filtering (M-06)

- `BulkExport.tsx`: Add mode selector or respect active `trade_mode`
- Export metadata should include which mode the data belongs to
- Prevent accidental cross-mode data export

### D.8: AccountDetail Mode Awareness (M-07)

- `AccountDetail.tsx`: Filter trade entries by active `trade_mode`
- Paper mode: Show only paper-linked trades
- Live mode: Show only live/Binance-linked trades

### D.9: AIInsightsWidget Mode Filtering (M-08)

- `AIInsightsWidget.tsx`: Filter `useTradeEntries()` by `trade_mode` before AI analysis
- Ensures dashboard AI insights reflect only active mode's data

### D.10: RiskSummaryCard Mode Awareness (M-09)

- `RiskSummaryCard.tsx`: Import `useModeVisibility`
- Paper mode: Hide Binance position data, skip correlation risk for Binance positions
- Live mode: Full Binance risk display

### D.11: CorrelationMatrix Mode Filtering (M-10)

- `CorrelationMatrix.tsx`: Filter `useTradeEntries()` by `trade_mode`

### D.12: JournalExportCard Mode Filtering (M-11)

- `JournalExportCard.tsx`: Respect active `trade_mode` in export, add mode label to export metadata

### D.13: PositionCalculator + TradingGate (M-12) — Auto-fixed via C-11

- No additional code change needed. Once `useBestAvailableBalance` is mode-aware (C-11), these consumers inherit correct behavior.
- Verify: PositionCalculator shows paper balance in Paper mode.
- Verify: TradingGate uses paper balance for daily loss calculations in Paper mode.

### D.14: ContextWarnings Mode Filtering (M-13)

- `ContextWarnings.tsx`: Filter `useTradeEntries()` by `trade_mode` for correlation context

### D.15: AIChatbot Mode Filtering (M-17)

- `AIChatbot.tsx`: Filter `useTradeEntries()` by `trade_mode` before passing to AI chat context
- Ensures AI assistant analyzes only trades from the active mode

### D.16: TradingGate Trades Filtering (M-18)

- `use-trading-gate.ts`: Filter `useTradeEntries()` by `trade_mode` for AI quality scoring
- Separate from C-11 balance fix — this is about trade quality assessment data

### D.17: FinalChecklist Mode Filtering (M-22)

- `FinalChecklist.tsx`: Filter `useTradeEntries()` by `trade_mode` for AI quality scoring context

### D.18: ADLRiskWidget Mode Visibility (M-23)

- `ADLRiskWidget.tsx`: Import `useModeVisibility`. Paper mode → hide widget or show "Live mode only" state.

### D.19: MarginHistoryTab Mode Visibility (M-24)

- `MarginHistoryTab.tsx`: Import `useModeVisibility`. Paper mode → hide tab or show empty state.

### D.20: use-daily-pnl Mode Awareness (M-25)

- `use-daily-pnl.ts`: Consume `useTradeMode()`. Paper → skip Binance data, use local trades only.

### D.21: useDailyRiskStatus Mode Awareness (M-26)

- `use-risk-profile.ts`: `useDailyRiskStatus` must consume `useTradeMode()`. Paper → use paper balance/PnL. Live → Binance if connected.

### D.22: SetupStep Balance Source (M-28)

- `SetupStep.tsx`: In Paper mode, hide Binance balance display. Show paper trading account balance only.

### D.23: BacktestRunner Balance Source (M-29)

- `BacktestRunner.tsx`: Consume `useTradeMode()`. Paper → use paper balance for initial capital quick-fill. Live → Binance if connected.

### D.24: useAIPreflight Mode Filter (M-30)

- `useAIPreflight.ts`: Add `.eq('trade_mode', activeMode)` to `trade_entries` query. Ensures AI pre-flight only analyzes same-mode historical trades.

### D.25: Weekly Report Export Mode Filter (M-31)

- `use-weekly-report-export.ts`: Add `trade_mode` filter to `trade_entries` query. Export should only include trades from active mode.

### D.26: AI Strategy Recommendation Mode Filter (M-32)

- `use-ai-strategy-recommendation.ts`: Add `trade_mode` filter to `trade_entries` query. Recommendations should be based on active mode's data only.

### Verification Checklist — Phase D

- [ ] Risk page shows paper-sourced data in Paper mode
- [ ] Active positions table shows fees and time-in-trade
- [ ] AI Post-Mortem results displayed in enrichment drawer
- [ ] Reconciliation gap documented (or implemented)
- [ ] WebSocket trade-off documented
- [ ] TodayPerformance shows mode-appropriate data
- [ ] BulkExport respects active mode
- [ ] AccountDetail filters trades by mode
- [ ] AIInsightsWidget analyzes only active mode's trades
- [ ] RiskSummaryCard hides Binance positions in Paper mode
- [ ] CorrelationMatrix uses only active mode's trades
- [ ] JournalExportCard exports only active mode's trades
- [ ] PositionCalculator uses mode-appropriate balance (via C-11)
- [ ] ContextWarnings uses only active mode's trades
- [ ] use-context-aware-risk uses only active mode's trades
- [ ] AIChatbot provides mode-filtered trade context to AI
- [ ] TradingGate quality scoring uses mode-filtered trades
- [ ] FinalChecklist AI quality uses mode-filtered trades
- [ ] ADLRiskWidget hidden in Paper mode
- [ ] MarginHistoryTab hidden in Paper mode
- [ ] use-daily-pnl uses mode-appropriate data source
- [ ] useDailyRiskStatus uses mode-appropriate balance/PnL
- [ ] SetupStep shows paper balance in Paper mode (not Binance)
- [ ] BacktestRunner uses mode-appropriate balance for quick-fill
- [ ] AI Preflight analyzes only active mode's trades
- [ ] Weekly report exports only active mode's trades
- [ ] AI Strategy Recommendation uses only active mode's trades

---

## 6. Execution Order

```
Phase A (Data Isolation) ──→ Phase B (UX) ──→ Phase C (Audit) ──→ Phase D (Polish)
     [~4 messages]            [~2 messages]     [~2 messages]       [~5 messages]
```

**Total estimated: 13-15 implementation messages.**

---

## 7. Post-Completion

After all phases complete:
1. Update `docs/DETAILED_USER_SCENARIO.md` Implementation Status tables
2. Mark all 48 mismatches as ✅ Done in this document
3. Run full verification checklist

---

> **Maintenance:** Update this document after each phase completion. Mark items as ✅ Done with date and evidence.
