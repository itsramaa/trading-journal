
# Multi-Level Analytics Architecture

## Analisis Situasi Saat Ini

**Yang sudah ada:**
- Isolasi Paper vs Live via `trade_mode` filter (Level 3 sudah partial)
- `trading_account_id` pada `trade_entries` — relasi ke `accounts` sudah ada
- `AccountDetail` page — sudah tampilkan stats per akun, tapi sangat basic (deposits, withdrawals, win rate)
- `get_trade_stats` RPC — hanya filter by `trade_mode`, belum support `account_id`
- `useModeFilteredTrades` — filter global by mode, bukan per akun

**Yang belum ada:**
- Per-Account analytics (full metrics: expectancy, drawdown, profit factor, equity curve)
- Per-Exchange grouping (accounts belum punya field `exchange`)
- Aggregate dashboard yang strictly live-only
- UI selector untuk switch analytics level

---

## Rencana Implementasi (4 Phase)

### Phase 1: Database — Extend Schema ✅ DONE

**Status:** Completed. Migration applied successfully.
```sql
ALTER TABLE accounts ADD COLUMN exchange text DEFAULT 'manual';
```
Values: `'binance'`, `'okx'`, `'manual'` (paper), dll.
Backfill existing: accounts dengan trades `source='binance'` → set `exchange='binance'`, sisanya `'manual'`.

**1b. Extend `get_trade_stats` RPC — tambah parameter `p_account_id`**
```sql
-- Add p_account_id parameter to existing RPC
-- When provided, filter WHERE trading_account_id = p_account_id
```

**1c. Buat RPC baru: `get_account_level_stats`**
Returns stats grouped by `trading_account_id`, sehingga satu query bisa return semua akun sekaligus untuk overview comparison.

---

### Phase 2: Hooks — Multi-Level Data Layer

**2a. `use-account-analytics.ts`** (baru)
- Accepts `accountId` parameter
- Calls `get_trade_stats` with `p_account_id`
- Returns full `TradingStats` (expectancy, drawdown, profit factor, sharpe ratio, equity curve)
- Reuse `calculateTradingStats()` dari `trading-calculations.ts`

**2b. `use-exchange-analytics.ts`** (baru)
- Groups accounts by `exchange` field
- Aggregates stats across accounts of same exchange
- Returns per-exchange metrics

**2c. Extend `useTradeStats`**
- Tambah optional `accountId` filter
- Backward compatible — tanpa accountId behavior sama seperti sekarang

---

### Phase 3: UI — AccountDetail Page Enhancement

**3a. Upgrade `AccountDetail.tsx`**
Dari stats basic (deposits, win rate) menjadi full analytics dashboard per akun:
- Equity Curve per akun
- Full metrics grid (PnL, Win Rate, Expectancy, Profit Factor, Max Drawdown, Sharpe)
- Trade distribution chart
- Strategy breakdown per akun
- Reuse existing components (`DrawdownChart`, `EquityCurveWithEvents`, `SessionPerformanceChart`)

**3b. Account Comparison View** (di `Accounts.tsx`)
- Tabel/cards perbandingan semua akun side-by-side
- Metrics: PnL, Win Rate, Expectancy, Trade Count, Drawdown
- Visual indicator akun mana yang perform/underperform

---

### Phase 4: UI — Performance Page Multi-Level Selector

**4a. Analytics Level Selector di Performance page**
Dropdown/tabs: `Per Account` | `Per Exchange` | `By Type` | `Overall`

- **Per Account**: Filter Performance metrics ke satu akun tertentu
- **Per Exchange**: Group by exchange, tampilkan comparative view
- **By Type**: Paper vs Live (sudah ada via trade_mode, formalize di UI)
- **Overall**: Aggregate semua live accounts (default saat ini)

**4b. Aggregate Rules**
- Overall hanya aggregate `trade_mode = 'live'`
- Paper terpisah, sebagai benchmark/validator strategi
- Label jelas di setiap level: "Account: Paper A", "Exchange: Binance", "Overall (Live)"

---

## Struktur Data Target

```text
User
 +-- Exchange (binance, okx, manual)
 |    +-- Account
 |    |     +-- type: paper | live
 |    |     +-- trades[]
 |    |     +-- account_analytics (full stats)
 |    +-- exchange_analytics (aggregated)
 +-- type_analytics (paper vs live)
 +-- global_analytics (live only)
```

---

## Technical Details

### File Changes Summary

| File | Action |
|------|--------|
| `accounts` table | ADD `exchange` column |
| `get_trade_stats` RPC | ADD `p_account_id` param |
| `get_account_level_stats` RPC | CREATE (grouped stats) |
| `src/hooks/use-account-analytics.ts` | CREATE |
| `src/hooks/use-exchange-analytics.ts` | CREATE |
| `src/hooks/use-trade-stats.ts` | EXTEND (accountId filter) |
| `src/types/account.ts` | ADD `exchange` field |
| `src/pages/AccountDetail.tsx` | MAJOR UPGRADE |
| `src/pages/Performance.tsx` | ADD level selector |
| `src/pages/Accounts.tsx` | ADD comparison overview |
| `docs/` | UPDATE architecture docs |

### Dependencies
- Phase 1 (DB) harus selesai sebelum Phase 2 (Hooks)
- Phase 2 harus selesai sebelum Phase 3-4 (UI)
- Phase 3 dan 4 bisa parallel

### Estimated Scope
Ini adalah perubahan arsitektural besar. Direkomendasikan mengerjakan per-phase, validasi tiap phase sebelum lanjut ke berikutnya. Tidak boleh dikerjakan sekaligus.
