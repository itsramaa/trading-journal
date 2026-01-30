
# Refactor: Binance-Centered System (Complete)

## Ringkasan

Melanjutkan refactor yang sudah dimulai untuk menjadikan **Binance Futures API** sebagai sumber kebenaran utama untuk semua data trading. Berdasarkan review kode, ada beberapa area yang masih menggunakan data lokal (simulated) dan perlu di-align ke Binance.

---

## Status Saat Ini vs Target

```text
SUDAH BINANCE-CENTERED (✅):
├─ Dashboard > Binance Balance Widget
├─ Dashboard > Binance Positions Table  
├─ Dashboard > Today Performance (fallback to local)
├─ Accounts Page > Binance Tab
├─ trade_entries table > binance_trade_id column
└─ use-binance-sync hook

MASIH PERLU REFACTOR (❌):
├─ Trading Journal > Open Positions (masih simulated)
├─ Trading Journal > P&L Summary Cards (dari local DB)
├─ Performance Page > Equity Curve (dari local trades)
├─ Risk Management > Daily Loss (dari local snapshot)
├─ Trade Entry Wizard > Account Selection (masih ke trading_accounts)
├─ Risk Profile > Starting Balance (manual input)
└─ Position Size Calculator > Balance (dari local account)
```

---

## Files yang Akan Dimodifikasi

### 1. `src/pages/trading-journey/TradingJournal.tsx`

**Perubahan:**
- Tambahkan tab baru "Binance Positions" untuk menampilkan posisi langsung dari Binance
- Tab "Open Positions" yang existing dipertahankan untuk Paper Trading
- P&L Summary Cards mengambil data dari Binance jika connected
- Import button untuk sync Binance trades ke journal

**Struktur Tab Baru:**
```text
Tabs:
├─ Binance Positions (NEW - live dari API)
├─ Open (Paper Trading - local DB)
├─ History (merged: Binance + local dengan metadata)
├─ Pending (future feature)
└─ Import from Binance (bulk sync)
```

---

### 2. `src/components/trade/entry/SetupStep.tsx`

**Perubahan:**
- Menambahkan opsi untuk memilih "Binance Account" sebagai trading account
- Jika Binance connected, balance diambil dari API real-time
- Jika tidak connected atau memilih Paper account, fallback ke trading_accounts
- Pre-validation menggunakan Binance balance untuk perhitungan

**Logic:**
```typescript
const accountBalance = useMemo(() => {
  if (selectedAccountType === 'binance' && binanceBalance) {
    return binanceBalance.availableBalance;
  }
  return Number(selectedAccount?.current_balance) || 0;
}, [selectedAccountType, binanceBalance, selectedAccount]);
```

---

### 3. `src/hooks/use-daily-pnl.ts`

**Perubahan:**
- Prioritaskan data dari Binance 24H trades jika connected
- Fallback ke local DB untuk Paper Trading
- Tambahkan source indicator ("binance" | "local")

---

### 4. `src/hooks/use-trading-gate.ts`

**Perubahan:**
- `startingBalance` diambil dari Binance wallet balance (bukan manual)
- `currentPnl` dihitung dari Binance 24H realized P&L
- Daily risk snapshot di-update otomatis dari Binance data

---

### 5. `src/hooks/use-risk-profile.ts`

**Perubahan:**
- `useDailyRiskStatus` mengambil starting balance dari Binance
- Current P&L dihitung dari Binance trades dalam 24 jam terakhir
- Jika Binance tidak connected, fallback ke local calculation

---

### 6. `src/components/risk/RiskSummaryCard.tsx` & `src/components/risk/DailyLossTracker.tsx`

**Perubahan:**
- Menampilkan badge "Binance" jika menggunakan data real
- Metriks diambil dari Binance P&L untuk akurasi
- Loss limit dihitung berdasarkan Binance wallet balance

---

### 7. `src/components/risk/PositionSizeCalculator.tsx`

**Perubahan:**
- Default balance diambil dari Binance available balance
- Option untuk manual input tetap ada untuk paper trading

---

### 8. `src/pages/trading-journey/Performance.tsx`

**Perubahan:**
- Equity curve bisa toggle antara "Binance Data" dan "Journal Only"
- Menambahkan hook `useBinanceEquityCurve` untuk menghitung dari trade history
- Default ke Binance data jika connected

---

### 9. Buat Hook Baru: `src/hooks/use-binance-daily-pnl.ts`

**Purpose:** Dedicated hook untuk menghitung daily P&L dari Binance trades

**Exports:**
```typescript
export function useBinanceDailyPnl() {
  // Aggregate realized P&L dari semua symbol dalam 24 jam
  // Return: { totalPnl, trades, wins, losses, winRate }
}
```

---

### 10. Buat Hook Baru: `src/hooks/use-combined-balance.ts`

**Purpose:** Single source untuk account balance yang bisa switch antara Binance dan Paper

**Exports:**
```typescript
export function useCombinedBalance(accountType: 'binance' | 'paper', paperId?: string) {
  // Jika binance: return useBinanceBalance().availableBalance
  // Jika paper: return local account balance
}
```

---

## Database Changes

**Tidak ada perubahan schema** - Kolom `binance_trade_id`, `source`, `commission` sudah ada.

---

## Implementation Order

### Phase 1: Core Hooks (Priority)
1. Buat `src/hooks/use-binance-daily-pnl.ts`
2. Buat `src/hooks/use-combined-balance.ts`
3. Update `src/hooks/use-daily-pnl.ts` dengan Binance integration
4. Update `src/hooks/use-trading-gate.ts` dengan Binance balance

### Phase 2: Risk Management
5. Update `src/hooks/use-risk-profile.ts`
6. Update `src/components/risk/RiskSummaryCard.tsx`
7. Update `src/components/risk/DailyLossTracker.tsx`
8. Update `src/components/risk/PositionSizeCalculator.tsx`

### Phase 3: Trade Entry & Journal
9. Update `src/components/trade/entry/SetupStep.tsx`
10. Update `src/pages/trading-journey/TradingJournal.tsx` dengan Binance tab
11. Update P&L summary cards di Journal

### Phase 4: Performance Analytics
12. Update `src/pages/trading-journey/Performance.tsx`
13. Add data source toggle untuk Binance vs Journal

---

## Fallback Strategy

Setiap komponen HARUS memiliki fallback:
```typescript
if (isConnected && binanceData) {
  // Use Binance data
} else {
  // Fallback to local Paper Trading data
}
```

Paper Trading accounts tetap sepenuhnya functional untuk:
- Backtesting strategies
- Practice trading tanpa risiko
- Learning platform

---

## Technical Notes

### Yang Sengaja Tidak Diubah
1. **Paper Trading flow** - Tetap menggunakan local DB sepenuhnya
2. **Strategy management** - Metadata lokal, tidak terkait Binance
3. **AI analysis** - Enrichment layer tetap di local DB
4. **Trading Sessions** - Feature lokal untuk journaling

### Trade-offs
1. **Polling vs Real-time**: Binance data di-poll setiap 15-30 detik (Edge Function limitation)
2. **Rate Limits**: Batasi parallel requests ke Binance API
3. **Data Merge**: Binance trade = source of truth, local = enrichment only

---

## Success Metrics

| Area | Metric |
|------|--------|
| Balance | Real-time dari Binance |
| Daily P&L | Calculated dari Binance trades |
| Open Positions | Live dari Binance API |
| Risk Calculation | Based on Binance wallet |
| Trade History | Synced dengan local metadata |
| Paper Trading | Tetap 100% functional |
