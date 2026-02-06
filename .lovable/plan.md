
# Plan: Unify Trade History Data Flow & Filters

## Problem Summary

Setelah melakukan analisis mendalam, saya menemukan beberapa masalah arsitektur:

### 1. Data Source Separation
| Tab | Data Source | Apa yang ditampilkan |
|-----|-------------|---------------------|
| All/Binance/Paper | `trade_entries` table (via `useTradeEntriesPaginated`) | Agregated trades per posisi |
| Fees | Binance API `/income` (via `useBinanceAllIncome`) | Setiap transaksi fee |
| Funding | Binance API `/income` (via `useBinanceAllIncome`) | Setiap interval funding |
| Financial (Accounts) | Binance API `/income` (via `useBinanceAllIncome`) | Summary fees/funding |

Ini menyebabkan inkonsistensi karena 1 trade bisa punya multiple fees (partial fills).

### 2. Filter Separation
- **Trade tabs**: menggunakan `TradeHistoryFilters` (dateRange, result, direction, strategies, pairs, AI sort)
- **Fees/Funding tabs**: memiliki filter sendiri (`days`, `symbolFilter`) yang terpisah

### 3. Data Count Discrepancy
- **424 fee transactions** (1 tahun) karena setiap eksekusi order menghasilkan fee record
- **~50 trades** karena ini adalah posisi yang sudah diagregasi

Ini adalah **perilaku yang benar** - mereka mengukur hal yang berbeda.

---

## Solution Architecture

### Unified Filter State
Alih-alih memiliki filter terpisah di Fees/Funding tabs, kita akan:
1. Menggunakan `dateRange` dari filter utama untuk semua tabs
2. Menggunakan `selectedPairs` dari filter utama untuk semua tabs
3. Menghapus filter duplikat di `FeeHistoryTab` dan `FundingHistoryTab`

### Props Interface Update

```typescript
// FeeHistoryTab & FundingHistoryTab will receive filter props from parent
interface UnifiedIncomeTabProps {
  isConnected: boolean;
  dateRange: DateRange;           // From parent filter
  selectedPairs: string[];        // From parent filter
  showFullHistory: boolean;       // From parent toggle
}
```

### Data Limit Fix
Saat ini `useBinanceAllIncome` dipanggil dengan `limit = 1000`, tapi ini masih bisa kurang untuk 1 tahun data. Solusi:
1. Tetap gunakan limit 1000 (Binance API max per call)
2. Tampilkan pesan jika ada potensi data terpotong
3. Filter berdasarkan date range dari parent

### Default Gallery View
Ubah default `viewMode` dari `'list'` ke `'gallery'`

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/TradeHistory.tsx` | Pass filter props to Fees/Funding tabs, change default viewMode |
| `src/components/trading/FeeHistoryTab.tsx` | Accept unified filter props, remove local filter state |
| `src/components/trading/FundingHistoryTab.tsx` | Accept unified filter props, remove local filter state |

---

## Technical Implementation

### 1. TradeHistory.tsx Changes

**A. Change default view mode (line 74):**
```typescript
// Before
const [viewMode, setViewMode] = useState<ViewMode>('list');

// After
const [viewMode, setViewMode] = useState<ViewMode>('gallery');
```

**B. Pass unified props to Fees/Funding tabs (lines 593-600):**
```typescript
{/* Fees Tab Content */}
<TabsContent value="fees">
  <FeeHistoryTab 
    isConnected={isBinanceConnected}
    dateRange={dateRange}
    selectedPairs={selectedPairs}
    showFullHistory={showFullHistory}
  />
</TabsContent>

{/* Funding Tab Content */}
<TabsContent value="funding">
  <FundingHistoryTab 
    isConnected={isBinanceConnected}
    dateRange={dateRange}
    selectedPairs={selectedPairs}
    showFullHistory={showFullHistory}
  />
</TabsContent>
```

### 2. FeeHistoryTab.tsx Changes

**A. Update props interface:**
```typescript
interface FeeHistoryTabProps {
  isConnected: boolean;
  dateRange: DateRange;
  selectedPairs: string[];
  showFullHistory: boolean;
}
```

**B. Remove local filter state:**
```typescript
// Remove these local states:
// const [days, setDays] = useState<number>(defaultDays);
// const [symbolFilter, setSymbolFilter] = useState<string>('ALL');
```

**C. Calculate days from dateRange:**
```typescript
const days = useMemo(() => {
  if (showFullHistory) return 365;
  if (dateRange.from && dateRange.to) {
    const diffMs = dateRange.to.getTime() - dateRange.from.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) || 30;
  }
  return 365; // Default 1 year lookback matching trade history
}, [dateRange, showFullHistory]);
```

**D. Apply pair filter from parent:**
```typescript
const filteredIncome = useMemo(() => {
  let filtered = feeIncome;
  
  // Apply date range filter
  if (dateRange.from) {
    const fromTime = dateRange.from.getTime();
    filtered = filtered.filter(item => item.time >= fromTime);
  }
  if (dateRange.to) {
    const toTime = dateRange.to.getTime();
    filtered = filtered.filter(item => item.time <= toTime);
  }
  
  // Apply pair filter from parent
  if (selectedPairs.length > 0) {
    filtered = filtered.filter(item => 
      selectedPairs.some(pair => item.symbol?.includes(pair.replace('USDT', '')))
    );
  }
  
  return filtered;
}, [feeIncome, dateRange, selectedPairs]);
```

**E. Remove local filter UI:**
Remove the `Select` components for days and symbol filter since they're now controlled by parent.

**F. Show info about unified filtering:**
```typescript
<div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
  <Info className="h-4 w-4" />
  <span>Filters from trade history apply to this tab</span>
</div>
```

### 3. FundingHistoryTab.tsx Changes
Same pattern as FeeHistoryTab - receive unified props, remove local state.

---

## Data Flow After Fix

```text
TradeHistory Page
├── Filter State (single source of truth)
│   ├── dateRange
│   ├── selectedPairs
│   ├── resultFilter
│   ├── directionFilter
│   └── showFullHistory
│
├── Tab: All/Binance/Paper
│   └── useTradeEntriesPaginated(filters) → trade_entries table
│
├── Tab: Fees
│   └── useBinanceAllIncome(days) → Binance API
│       └── Client-side filter by dateRange + selectedPairs
│
└── Tab: Funding
    └── useBinanceAllIncome(days) → Binance API
        └── Client-side filter by dateRange + selectedPairs
```

---

## UI Changes Summary

### Before:
- Fees tab: Has own "7 days/30 days/..." selector + symbol filter
- Funding tab: Has own "7 days/30 days/..." selector + symbol filter
- Default view: List

### After:
- Fees tab: Uses parent's date range + pair filters (no duplicate selectors)
- Funding tab: Uses parent's date range + pair filters (no duplicate selectors)
- Info text: "Filters from trade history apply to this tab"
- Default view: Gallery

---

## Expected Behavior

| Action | All/Binance/Paper Tab | Fees Tab | Funding Tab |
|--------|----------------------|----------|-------------|
| Select date range "Last 30 days" | Shows trades in range | Shows fees in range | Shows funding in range |
| Select pair "BTCUSDT" | Shows only BTC trades | Shows only BTC fees | Shows only BTC funding |
| Toggle "Full History" | Shows all trades | Shows all fees (1 year) | Shows all funding (1 year) |

---

## Why Different Record Counts

User bertanya mengapa fees = 424, trades = 50. Ini **bukan bug**:

1. **Trades** = agregasi per posisi (1 trade entry per open+close)
2. **Fees** = per eksekusi order (1 trade bisa punya 5-10 partial fills = 5-10 fee records)

Contoh:
```
BTCUSDT LONG:
- Open: 3 partial fills → 3 COMMISSION records
- Close: 2 partial fills → 2 COMMISSION records
= 1 trade, 5 fee records
```

Ini akan tetap berbeda karena mereka mengukur hal yang berbeda. Yang penting adalah **filter yang sama** menampilkan data dari **periode yang sama**.

---

## Technical Summary (Bahasa Indonesia)

1. **Default View**: Ubah dari 'list' ke 'gallery' untuk tabs closed trades
2. **Unified Filters**: Hapus filter terpisah di Fees/Funding tabs, gunakan filter utama dari Trade History
3. **Props Passing**: TradeHistory.tsx akan mengirim `dateRange`, `selectedPairs`, dan `showFullHistory` ke child components
4. **Client-side Filter**: Fees/Funding tabs akan filter data berdasarkan props yang diterima dari parent
5. **Info Display**: Tampilkan pesan bahwa filter berlaku untuk semua tabs

Hasil: Ketika user filter by date range atau pair, semua tabs akan menampilkan data yang konsisten untuk periode yang sama.
