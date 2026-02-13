

# Cross-Check: 13 Potensi Bug/Gap — Hasil & Remediation

## Hasil Cross-Check

### 1. Mode Isolation — Legacy trades tanpa trade_mode
**Status: SAFE (sudah diperbaiki)**

DB migration sebelumnya (`20260213140212`) sudah backfill `trade_mode = 'live'` untuk semua `source = 'binance'` yang null. Column default sudah diset `'live'`. Hook `useModeFilteredTrades` (line 22-27) sudah memiliki fallback logic untuk legacy trades: `source='binance'` -> live, lainnya -> paper. Dengan backfill + default, gap ini sudah tertutup.

### 2. Trading Gate — Race condition P&L saat wizard terbuka
**Status: SAFE**

`useTradingGate` menggunakan `useUnifiedDailyPnl` yang re-evaluates via `useMemo` setiap kali dependency berubah. React Query akan invalidate trade queries saat trade baru di-create (`invalidateTradeQueries`), sehingga `dailyPnl.totalPnl` akan update otomatis. `gateState` dihitung ulang setiap render. Wizard tidak cache gate state — ia membaca live dari hook. Tidak ada race condition.

### 3. AI Pre-flight — Fallback saat AI service down + bypass audit
**Status: NEEDS FIX (2 gap)**

**Gap A**: `useAIPreflight` (line 241-243) throws error saat edge function fails. Caller di `SetupStep.tsx` harus menangani error ini. Perlu dicek apakah error handling memberikan fallback yang aman (tidak block wizard jika AI down).

**Gap B**: Bypass SKIP verdict (line 681-693) **tidak di-audit**. Tidak ada `logAuditEvent` call saat user checks bypass checkbox. Untuk compliance dan tracing, bypass decision harus tercatat.

**Fix A**: Wrap preflight call di SetupStep dengan try-catch; jika error, set preflight state to null (already done implicitly since `preflightResult` stays null on error, dan `isPreflightBlocking` = false when null). **Actually SAFE** — if preflight fails, `preflightResult` remains null, `isPreflightBlocking` = false. User can proceed. This is safe-fail behavior.

**Fix B**: Add `logAuditEvent` saat `bypassSkipWarning` diaktifkan + trade submitted.

### 4. Post-Trade AI Analysis — Retry queue jika gagal
**Status: SAFE (acceptable risk)**

`usePostTradeAnalysis` (line 97-99) catches error and shows toast. Analysis result is not saved if edge function fails. This is acceptable because:
- Analysis is user-triggered (not automatic fire-and-forget)
- User can re-trigger manually
- No queue needed because it's an on-demand action, not a background job
- DB update failure is handled independently (line 91-93)

### 5. Real-time Binance Data Fetch — Rate limit + invalid credentials
**Status: SAFE**

`showExchangeData` (from `useModeVisibility`) prevents fetch in Paper mode. Binance hooks use `enabled: isConnected`, so invalid credentials won't trigger fetches. Rate limiting is handled by `RATE_LIMIT_DELAY` in sync hooks and React Query's `staleTime` prevents excessive refetching.

### 6. P&L Calculation — Rounding + missing fees
**Status: SAFE**

`useUnifiedDailyPnl` line 84: `trade.realized_pnl ?? trade.pnl ?? 0` — defaults to 0. Fees: `trade.fees ?? 0` (line 86). JavaScript floating point is used consistently. No precision mismatch risk for display purposes. Reconciliation has 0.1% threshold for tolerance.

### 7. Market Context Capture — API fail blocking wizard
**Status: SAFE**

`useCaptureMarketContext` has documented fallback patterns (all builders default to safe values, e.g., Fear&Greed defaults to 50). Market context capture is non-blocking — wizard can proceed even if API fails. Context is stored as best-effort JSONB.

### 8. Trade State Machine Display — Realtime refresh
**Status: SAFE**

`TradeStateBadge` renders from current trade data. When trades are synced/updated, `invalidateTradeQueries` cascades to refresh `trade-entries` query, which re-renders the badge. No stale state risk because data flows through React Query.

### 9. Live Time-in-Trade — Timer performance
**Status: MINOR GAP**

`TimeInTrade` component (AllPositionsTable line 143-151) creates one `setInterval(60000)` **per row**. For 50+ active positions, this creates 50+ intervals. While 60s intervals are lightweight, this doesn't scale well.

**Impact**: Low — unlikely to have 50+ active positions in practice. Acceptable for now.

**Future improvement**: Single shared timer at table level that triggers re-render for all rows.

### 10. Read-Only Enforcement — Server-side validation
**Status: MINOR GAP**

Client-side enforcement (line 95, 110, 233): `isReadOnly` based on `source === 'binance' || trade_mode === 'live'`. However, no corresponding RLS policy or trigger prevents UPDATE on core fields (entry_price, direction, quantity) for live trades server-side. A malicious API call could bypass this.

**Impact**: Low — requires authenticated user + intentional API manipulation. No external attack vector.

**Fix**: Add DB trigger to prevent updates on core fields when `source = 'binance'`.

### 11. Wizard Analytics Tracking
**Status: NEEDS FIX**

No wizard analytics tracking exists. Search for `wizard.*track`, `step.*abandon`, `trackWizard` returned zero results. Plan says "Track step progression, abandon, complete" but no implementation found.

**Fix**: Add lightweight analytics events via `logAuditEvent` for wizard lifecycle: `wizard_started`, `wizard_step_changed`, `wizard_abandoned`, `wizard_completed`.

### 12. Currency Conversion — Cache invalidation + fallback
**Status: SAFE**

`useExchangeRate` line 70-71: `staleTime: 60 * 60 * 1000` (1 hour cache). Fallback: `DEFAULT_USD_IDR_RATE = 16000` (line 10). Two API endpoints tried sequentially (line 13-18). If both fail, fallback rate is used. `useCurrencyConversion` line 70: triple fallback `rate || storedRate || 16000`. Robust.

### 13. Unified Position Mapping — Duplicate handling
**Status: SAFE**

`mapToUnifiedPositions` (AllPositionsTable line 88-140) receives `paperPositions` (from trade_entries) and `binancePositions` (from Binance API) as **separate arrays**. Paper positions have UUID IDs; Binance positions get `binance-${symbol}` IDs (line 119). No overlap possible because:
- Paper positions come from DB (filtered by mode)
- Binance positions come from live API (active positions only)
- A synced trade in DB is already closed and won't appear in Binance active positions

---

## Summary

| # | Area | Status | Action |
|---|------|--------|--------|
| 1 | Mode Isolation | SAFE | Already fixed in previous migration |
| 2 | Trading Gate Race | SAFE | Live recalculation via hooks |
| 3 | AI Pre-flight Fallback | SAFE | Fails-open by design |
| 3B | AI Pre-flight Bypass Audit | **NEEDS FIX** | Add audit log for bypass |
| 4 | Post-Trade Analysis | SAFE | User-triggered, not fire-and-forget |
| 5 | Binance Rate Limit | SAFE | Guarded by mode visibility + staleTime |
| 6 | P&L Rounding | SAFE | Consistent defaults |
| 7 | Market Context Fallback | SAFE | Non-blocking with defaults |
| 8 | Trade State Refresh | SAFE | React Query invalidation |
| 9 | Time-in-Trade Timers | MINOR | Acceptable, future improvement |
| 10 | Read-Only Server-Side | **NEEDS FIX** | Add DB trigger for immutability |
| 11 | Wizard Analytics | **NEEDS FIX** | Implement tracking events |
| 12 | Currency Fallback | SAFE | Triple fallback chain |
| 13 | Position Dedup | SAFE | Separate data sources, unique IDs |

---

## Implementation Plan (3 Fixes)

### Fix 1: AI Pre-flight Bypass Audit Log

**File: `src/components/trade/entry/SetupStep.tsx`**

When `bypassSkipWarning` is toggled to `true`, log an audit event:

```typescript
onCheckedChange={(checked) => {
  setBypassSkipWarning(checked === true);
  if (checked) {
    logAuditEvent(user.id, {
      action: 'trade_created', // reuse existing action
      entityType: 'trade_entry',
      metadata: { 
        bypass_preflight_skip: true, 
        pair, 
        direction,
        preflight_confidence: preflightResult?.confidence,
      },
    });
  }
}}
```

### Fix 2: Server-Side Immutability Trigger

**DB Migration**: Create a trigger that prevents updates on core fields for live/binance trades:

```sql
CREATE OR REPLACE FUNCTION prevent_live_trade_core_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.source = 'binance' OR OLD.trade_mode = 'live' THEN
    IF NEW.entry_price IS DISTINCT FROM OLD.entry_price
       OR NEW.direction IS DISTINCT FROM OLD.direction
       OR NEW.quantity IS DISTINCT FROM OLD.quantity
       OR NEW.stop_loss IS DISTINCT FROM OLD.stop_loss
    THEN
      RAISE EXCEPTION 'Cannot modify core fields of live/binance trades';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_live_trade_core_update
  BEFORE UPDATE ON trade_entries
  FOR EACH ROW
  EXECUTE FUNCTION prevent_live_trade_core_update();
```

### Fix 3: Wizard Analytics Tracking

**File: `src/features/trade/useTradeEntryWizard.ts`**

Add audit events in wizard navigation:

- `nextStep()`: Log step transition
- `submitTrade()`: Already logs `trade_created`
- `reset()`: Log if wizard was partially completed (abandon tracking)

Since `logAuditEvent` requires `userId` but Zustand store doesn't have it, the audit calls will be added at the component level (`TradeEntryWizard.tsx`) where `useAuth` is available, using `useEffect` to track step changes.

### Files Modified

| File | Change |
|------|--------|
| `src/components/trade/entry/SetupStep.tsx` | Add bypass audit log |
| DB Migration | Add immutability trigger for live trades |
| `src/components/trade/entry/TradeEntryWizard.tsx` | Add wizard lifecycle tracking |

