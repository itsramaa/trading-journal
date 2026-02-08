
# Plan: Perbaikan Tab Fees & Funding untuk Menggunakan Data Lokal

## 1. Situasi Saat Ini

### Problem yang Ditemukan:

| Aspek | Status Saat Ini | Masalah |
|-------|-----------------|---------|
| **FeeHistoryTab** | Menggunakan `useBinanceAllIncome` | Fetch langsung dari Binance API setiap render |
| **FundingHistoryTab** | Menggunakan `useBinanceAllIncome` | Fetch langsung dari Binance API setiap render |
| **Data Lokal** | `trade_entries.commission`, `funding_fees` sudah tersedia | Tidak digunakan oleh tab ini |

### Arsitektur yang Salah:
```text
┌─────────────────────────────────────────────────┐
│           TAB FEES / FUNDING (CURRENT)          │
│                                                 │
│   useBinanceAllIncome() ─────► Binance API      │
│          (Live fetch setiap render)             │
│                                                 │
│   ❌ Inkonsisten dengan "Local DB as Truth"     │
│   ❌ Redundant API calls                        │
│   ❌ Data tidak match dengan trade_entries      │
└─────────────────────────────────────────────────┘
```

---

## 2. Arsitektur yang Benar

### Target State:
```text
┌─────────────────────────────────────────────────┐
│           TAB FEES / FUNDING (TARGET)           │
│                                                 │
│   useLocalFeeHistory() ─────► trade_entries     │
│          (Query dari database lokal)            │
│                                                 │
│   ✅ Konsisten dengan aggregated data           │
│   ✅ Cepat (no API calls)                       │
│   ✅ Data match dengan P&L di journal           │
└─────────────────────────────────────────────────┘
```

### Data Source Mapping:

| Tab | Field dari `trade_entries` | Aggregasi |
|-----|---------------------------|-----------|
| **Fees** | `commission`, `commission_asset` | SUM per trade, grouped by pair/date |
| **Funding** | `funding_fees` | SUM per trade, grouped by pair/date |

---

## 3. Implementation Plan

### Phase A: Create Local Fee/Funding Hooks

**File Baru:** `src/hooks/use-local-fee-funding.ts`

Hook ini akan query dari `trade_entries`:
- `useLocalFeeHistory(filters)` - Aggregated commission data
- `useLocalFundingHistory(filters)` - Aggregated funding_fees data

```text
Query: 
SELECT 
  pair, 
  DATE(entry_datetime) as date,
  SUM(commission) as total_commission,
  SUM(funding_fees) as total_funding,
  COUNT(*) as trade_count
FROM trade_entries
WHERE source = 'binance' AND deleted_at IS NULL
GROUP BY pair, DATE(entry_datetime)
ORDER BY date DESC
```

### Phase B: Update FeeHistoryTab

1. Ganti `useBinanceAllIncome` dengan `useLocalFeeHistory`
2. Update UI untuk menampilkan data per-trade (bukan per-income-record)
3. Tambahkan fallback message jika data kosong (belum Full Sync)

### Phase C: Update FundingHistoryTab

1. Ganti `useBinanceAllIncome` dengan `useLocalFundingHistory`
2. Update UI untuk menampilkan data per-trade
3. Tambahkan fallback message jika data kosong

### Phase D: Granular View (Optional Enhancement)

Untuk user yang ingin melihat detail per-transaksi (bukan per-trade), tambahkan:
- Toggle "Per Trade" vs "Per Transaction"
- "Per Transaction" tetap fetch dari API (existing behavior)
- Default: "Per Trade" (dari lokal)

---

## 4. Detail Teknis

### Hook: `useLocalFeeHistory`

```typescript
// Pseudocode
interface LocalFeeRecord {
  id: string;
  pair: string;
  date: string;
  commission: number;
  commission_asset: string;
  entry_datetime: string;
  direction: string;
  realized_pnl: number;
}

function useLocalFeeHistory(filters: {
  dateRange: DateRange;
  selectedPairs: string[];
}) {
  return useQuery({
    queryKey: ['local-fee-history', filters],
    queryFn: async () => {
      const { data } = await supabase
        .from('trade_entries')
        .select('id, pair, commission, commission_asset, entry_datetime, direction, realized_pnl')
        .eq('source', 'binance')
        .is('deleted_at', null)
        .gte('entry_datetime', filters.dateRange.from)
        .lte('entry_datetime', filters.dateRange.to);
      return data;
    }
  });
}
```

### UI Changes:

**FeeHistoryTab:**
- Summary: Total Fees, Total Trades, Avg Fee per Trade
- Table: Date, Pair, Direction, Commission, Trade P&L

**FundingHistoryTab:**
- Summary: Funding Paid, Funding Received, Net Funding
- Table: Date, Pair, Direction, Funding Fee, Trade P&L

---

## 5. Files to Modify

| File | Action |
|------|--------|
| `src/hooks/use-local-fee-funding.ts` | **CREATE** - New hooks for local data |
| `src/components/trading/FeeHistoryTab.tsx` | **MODIFY** - Use local hook |
| `src/components/trading/FundingHistoryTab.tsx` | **MODIFY** - Use local hook |

---

## 6. Scope Boundaries

### Dalam Scope:
- Tab Fees dan Funding menggunakan data dari `trade_entries`
- Konsisten dengan arsitektur "Local DB as Ledger of Truth"
- UI menampilkan data per-trade

### Di Luar Scope (Future Enhancement):
- Menyimpan raw income records ke tabel terpisah
- Toggle untuk melihat data granular vs aggregated
- Sync monitoring untuk fees/funding khusus

---

## 7. Testing Checklist

1. **Full Sync**: Jalankan Full Sync dari Trade History page
2. **Verify Data**: Cek tab Fees dan Funding menampilkan data dari lokal
3. **Filter Test**: Pastikan date range dan pair filter berfungsi
4. **Consistency Check**: Pastikan total fees di tab = SUM(fees) di journal
