# Plan: Memindahkan Financial Details ke Trade History dengan Tab Fees & Funding

## ✅ STATUS: COMPLETED

## Ringkasan Perubahan

Memindahkan fitur "View Details" (Fee, Funding, Rebate breakdown) dari tab Financial di halaman Accounts ke halaman Trade History sebagai tab terpisah, sehingga pengguna dapat melihat biaya trading secara bersamaan dengan riwayat trade mereka.

---

## Perubahan Arsitektur

### Sebelum (Current State)

```text
Accounts Page
├── Tab: Accounts (Binance + Paper)
├── Tab: Transactions (Transfers/Deposits)
└── Tab: Financial ← Contains: Summary Cards + View Details

Trade History Page
├── Filters
└── Tabs: All | Binance | Paper
```

### Sesudah (Target State)

```text
Accounts Page
├── Tab: Accounts (Binance + Paper)
├── Tab: Transactions (Transfers/Deposits)
└── Tab: Financial ← Summary Cards ONLY (no details button)

Trade History Page
├── Filters
└── Tabs: All | Binance | Paper | Fees | Funding
                                  ↑       ↑
                              (NEW)   (NEW)
```

---

## Detail Implementasi

### 1. Modifikasi `src/pages/TradeHistory.tsx`

**Perubahan:**
- Tambah 2 tab baru: **Fees** dan **Funding**
- Import `FinancialSummaryCard` atau buat komponen khusus untuk tab
- Tambah state untuk filter periode (7/30/90/180/365 hari)
- Gunakan `useBinanceAllIncome` hook yang sudah ada

**Tab Structure Baru:**

```typescript
<TabsList className="mb-4">
  <TabsTrigger value="all">All</TabsTrigger>
  <TabsTrigger value="binance">Binance</TabsTrigger>
  <TabsTrigger value="paper">Paper</TabsTrigger>
  <TabsTrigger value="fees" disabled={!isBinanceConnected}>
    <Percent className="h-4 w-4" />
    Fees
  </TabsTrigger>
  <TabsTrigger value="funding" disabled={!isBinanceConnected}>
    <ArrowUpDown className="h-4 w-4" />
    Funding
  </TabsTrigger>
</TabsList>
```

**Tab Content untuk Fees:**

| Field | Deskripsi |
|-------|-----------|
| Trading Fees | COMMISSION dari Binance |
| Fee Rebates | COMMISSION_REBATE + API_REBATE |
| Net Fee Cost | Fees - Rebates |
| Details Table | Daftar fee per transaksi |

**Tab Content untuk Funding:**

| Field | Deskripsi |
|-------|-----------|
| Funding Paid | Negative FUNDING_FEE |
| Funding Received | Positive FUNDING_FEE |
| Net Funding | Total FUNDING_FEE |
| Details Table | Daftar funding per interval |

---

### 2. Buat Komponen Baru: `src/components/trading/FeeHistoryTab.tsx`

Komponen khusus untuk menampilkan fee history dengan:
- Period selector (7/30/90/180/365 days)
- Summary cards (Trading Fees, Rebates, Net Cost)
- Details table (Date, Symbol, Amount)
- Symbol filter

---

### 3. Buat Komponen Baru: `src/components/trading/FundingHistoryTab.tsx`

Komponen khusus untuk menampilkan funding rate history dengan:
- Period selector (7/30/90/180/365 days)
- Summary cards (Paid, Received, Net)
- Details table (Date, Symbol, Amount)
- Symbol filter

---

### 4. Modifikasi `src/components/accounts/FinancialSummaryCard.tsx`

**Perubahan:**
- Hapus/sembunyikan collapsible "View Details" section
- Tetap tampilkan 4 summary cards (Trading Fees, Funding Paid, Funding Received, Rebates)
- Tetap tampilkan Net Trading Cost
- Hapus Symbol Breakdown (pindah ke Trade History)
- Set `showDetails` default ke `false`

---

## File yang Akan Dimodifikasi

| File | Aksi | Deskripsi |
|------|------|-----------|
| `src/pages/TradeHistory.tsx` | MODIFY | Tambah tab Fees & Funding |
| `src/components/trading/FeeHistoryTab.tsx` | CREATE | Komponen tab fee history |
| `src/components/trading/FundingHistoryTab.tsx` | CREATE | Komponen tab funding history |
| `src/components/accounts/FinancialSummaryCard.tsx` | MODIFY | Hapus View Details, keep summary only |

---

## Technical Details

### Data Flow

```text
useBinanceAllIncome(days, limit)
    │
    ├── Filter: incomeType === 'COMMISSION' ──────────► Fees Tab
    │           incomeType === 'COMMISSION_REBATE'
    │           incomeType === 'API_REBATE'
    │
    └── Filter: incomeType === 'FUNDING_FEE' ─────────► Funding Tab
```

### Komponen FeeHistoryTab Props

```typescript
interface FeeHistoryTabProps {
  defaultDays?: number; // Default 30
  isConnected: boolean;
}
```

### Komponen FundingHistoryTab Props

```typescript
interface FundingHistoryTabProps {
  defaultDays?: number; // Default 30
  isConnected: boolean;
}
```

---

## UI Behavior

### Tabs di Trade History

| Tab | Kondisi | Perilaku |
|-----|---------|----------|
| All | Selalu aktif | Semua closed trades |
| Binance | Selalu aktif | Trades dari Binance |
| Paper | Selalu aktif | Trades manual/paper |
| Fees | `disabled={!isBinanceConnected}` | Fee breakdown + history |
| Funding | `disabled={!isBinanceConnected}` | Funding rate history |

### Tooltip untuk Tab Disabled

Jika Binance tidak terkoneksi, tampilkan tooltip: "Requires Binance connection"

---

## Expected Result

**Trade History Page:**
- 5 tabs: All, Binance, Paper, Fees, Funding
- Fees tab: Trading fee summary + detail table
- Funding tab: Funding rate summary + detail table
- Masing-masing tab memiliki period selector sendiri

**Accounts Page:**
- Financial tab: Summary cards only (tanpa View Details button)
- Lebih clean dan focused pada overview

