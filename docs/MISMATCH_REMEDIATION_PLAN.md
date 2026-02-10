# Mismatch Remediation Plan

> **Version:** 1.0  
> **Created:** 2026-02-10  
> **Reference:** `docs/DETAILED_USER_SCENARIO.md`  
> **Status:** Active — Phase A pending  
> **Summary:** 14 mismatches (6 Critical, 4 High, 4 Medium)

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

### High (UX & Audit Gaps)

| ID | Title | Spec Section | Current State | Required State | Affected Files | Phase |
|----|-------|-------------|---------------|----------------|----------------|-------|
| H-01 | Audit logger only covers trade creation | §13 | `logAuditEvent` called only in `submitTrade()`. | Cover: trade close, delete, restore, API key save/delete, sync, settings change. | Multiple hooks + components | C |
| H-02 | RiskManagement no mode awareness | §3.1/3.2 | No mode hook imported. Shows Binance data in Paper mode. | Paper: simulator-based risk. Live: Binance-based risk. | `src/pages/RiskManagement.tsx` | D |
| H-03 | No SIMULATION banner in Paper mode | §3.1 | Only small "PAPER" badge in `TradeModeSelector`. | Persistent SIMULATION banner with amber styling across all pages. | `src/components/layout/DashboardLayout.tsx` | B |
| H-04 | No mandatory session context enforcement | §2.2 | Defaults to `live` silently. No explicit selection required. | Modal forces mode + style selection before first use. | `DashboardLayout.tsx`, new `SessionContextModal.tsx` | B |

### Medium (Feature Polish)

| ID | Title | Spec Section | Current State | Required State | Affected Files | Phase |
|----|-------|-------------|---------------|----------------|----------------|-------|
| M-01 | Active Trade tab missing fees/funding + time-in-trade | §8.2 | Shows P&L and prices only. | Add fee/funding columns + time-in-trade duration. | `AllPositionsTable` | D |
| M-02 | AI Post-Mortem not structured in enrichment drawer | §11.1 | `usePostTradeAnalysis` exists but no structured UI. | Display structured sections: Entry timing, Exit efficiency, SL placement, Strategy adherence. | `TradeEnrichmentDrawer` | D |
| M-03 | No daily reconciliation cron | §13 | `useBalanceReconciliation` exists but not auto-triggered. | Scheduled reconciliation with mismatch alerts. | Edge function (new) | D |
| M-04 | No WebSocket fallback documentation | §13 | REST polling used. No WebSocket or fallback docs. | Document as acceptable trade-off in architecture docs. | `docs/` | D |

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

### Step A.3: Page Updates

| Page/Component | Change |
|----------------|--------|
| `Dashboard.tsx` | Import `useModeVisibility`. Conditionally render Active Positions (Live only). Filter portfolio data by mode. |
| `Performance.tsx` | Import `useTradeMode`. Pass `trade_mode` to all analytics hooks. |
| `TradeHistory.tsx` | Add `trade_mode` to `TradeFilters`. Filter paginated query by active mode. |
| `SmartQuickActions.tsx` | Import `useModeVisibility`. Hide "Add Trade" when `canCreateManualTrade === false`. |

### Verification Checklist — Phase A

- [ ] Paper mode: Dashboard shows NO Binance positions/balance
- [ ] Paper mode: Performance shows ONLY paper trade stats
- [ ] Paper mode: TradeHistory shows ONLY paper trades
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

### Verification Checklist — Phase D

- [ ] Risk page shows paper-sourced data in Paper mode
- [ ] Active positions table shows fees and time-in-trade
- [ ] AI Post-Mortem results displayed in enrichment drawer
- [ ] Reconciliation gap documented (or implemented)
- [ ] WebSocket trade-off documented

---

## 6. Execution Order

```
Phase A (Data Isolation) ──→ Phase B (UX) ──→ Phase C (Audit) ──→ Phase D (Polish)
     [~3 messages]            [~2 messages]     [~2 messages]       [~2 messages]
```

**Total estimated: 8-10 implementation messages.**

---

## 7. Post-Completion

After all phases complete:
1. Update `docs/DETAILED_USER_SCENARIO.md` Implementation Status tables
2. Mark all 14 mismatches as ✅ Done in this document
3. Run full verification checklist

---

> **Maintenance:** Update this document after each phase completion. Mark items as ✅ Done with date and evidence.
