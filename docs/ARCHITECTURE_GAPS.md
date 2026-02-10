# Architecture Gaps & Trade-offs

> **Version:** 1.0  
> **Updated:** 2026-02-10

---

## 1. Daily Reconciliation (M-03)

### Current State
- `useBalanceReconciliation` hook exists for on-demand reconciliation
- `account_balance_discrepancies` table stores detected mismatches
- No automated/scheduled reconciliation

### Documented Trade-off
Daily reconciliation cron is **not implemented** as an automated edge function. Rationale:
- Supabase Edge Functions do not natively support cron scheduling (requires external trigger)
- On-demand reconciliation is available via the Risk Management page
- Mismatch alerts are generated when detected during user-initiated checks
- `account_balance_discrepancies` table provides full audit trail

### Future Consideration
If automated reconciliation is needed:
1. Create a `daily-reconciliation` edge function
2. Use an external cron service (e.g., cron-job.org) to trigger it daily
3. Edge function compares local DB snapshots vs Binance account state
4. Mismatches → insert into `account_balance_discrepancies` + create notification

---

## 2. WebSocket vs REST Polling (M-04)

### Current Approach
All Binance data fetching uses **REST polling** via Edge Functions:
- Account balance: on-demand fetch
- Position data: on-demand fetch  
- Trade history sync: periodic user-triggered sync
- Market data: polling with configurable intervals

### Why REST Polling
1. **Edge Function architecture**: Supabase Edge Functions are request-response based, not persistent connections
2. **Simplicity**: No WebSocket connection management, reconnection logic, or heartbeat handling
3. **Rate limiting**: REST requests are easier to rate-limit and track via `api_rate_limits` table
4. **Security**: API credentials never leave the server (edge function decrypts per-request)

### Acceptable Latency
- Balance/position updates: 5-30 seconds (acceptable for journal/analysis use case)
- Trade sync: Near real-time not required (journal is retrospective)
- Market score: Cached with configurable refresh intervals

### Future Consideration
WebSocket would be beneficial for:
- Sub-second position monitoring (if live trading dashboard is added)
- Real-time P&L streaming
- Implementation: Would require a persistent WebSocket proxy service outside Edge Functions

---

## 3. Trade Mode Isolation Completeness

### Enforcement Layers
1. **Database**: `get_trade_stats` RPC accepts `p_trade_mode` parameter
2. **Hooks**: `useModeFilteredTrades` filters all trade datasets
3. **UI**: `useModeVisibility` controls component visibility
4. **Audit**: All mode switches are implicit via `user_settings.active_trade_mode`

### Known Limitations
- Legacy trades without `trade_mode` field use heuristic matching (source-based)
- Backfill migration has populated most records, but edge cases may exist
