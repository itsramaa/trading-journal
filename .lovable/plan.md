

# Deep UX Analysis: Accounts & AccountDetail

## Ringkasan Masalah

Setelah analisis menyeluruh terhadap kedua halaman beserta seluruh komponen pendukungnya, ditemukan **11 inkonsistensi** antara mode Paper dan Live yang melanggar prinsip "mode adalah konteks, bukan jenis fitur".

---

## 1. Temuan Inkonsistensi

### A. AccountDetail: Layout TIDAK Identik Antar Mode

**Masalah Kritis** -- File `AccountDetail.tsx` (1042 baris) memiliki branching `isBinanceVirtual` yang menciptakan **dua layout berbeda** alih-alih satu layout unified:

| Aspek | Paper Mode | Live (Binance) Mode | Seharusnya |
|-------|-----------|---------------------|------------|
| Metric Row | 5 cards: Net P&L, ROC, Win Rate, Profit Factor, Total Trades | 5 cards: Unrealized P&L, Available Balance, Open Positions, Margin Used, Total P&L | **Sama 5 cards, beda data source** |
| Tabs | Overview, Strategies, Transactions, Financial | Overview, Positions | **Sama 4 tabs, beda data** |
| Header Actions | DropdownMenu (Edit, Deposit, Withdraw, Delete) | Refresh button saja | Paper: full CRUD. Live: read-only + Refresh |
| Header Badge | "Paper Trading" | "Live" | OK -- ini konteks |
| Equity Curve | Ada (dari closed trades) | Kosong (selalu `[]`) | Live harus pakai data dari synced trades |
| Strategy Breakdown | Ada | Tidak ada tab Strategies | Harus ada, data dari synced live trades |

### B. Accounts Page: Summary Cards Inconsistency

| Metric | Paper | Live | Masalah |
|--------|-------|------|---------|
| Open Positions icon | Selalu cek `balance?.totalUnrealizedProfit` | Sama | Icon unrealized PnL selalu dari Binance API bahkan di Paper mode |
| Open Positions unrealized text | Tampil jika `isConnected && activePositions > 0` | Sama | Di Paper mode, `isConnected` selalu false, tapi icon masih referensi Binance balance |

### C. AccountCardList: Binance Card Styling Berbeda

- Binance card punya `border-primary/20` (highlighted border)
- Paper cards tidak punya highlight
- Ini membuat visual tidak konsisten -- semua card harus uniform

### D. AddAccountForm: Paper Trading Toggle Tidak Relevan

`AddAccountForm` punya switch "Paper Trading" (`is_backtest`), tapi form ini **hanya muncul di Paper mode**. Toggle ini membingungkan karena:
- Di Paper mode, semua akun yang dibuat seharusnya otomatis paper
- Toggle ini seharusnya di-hardcode `true` ketika dipanggil dari Paper mode

### E. AccountComparisonTable: Tidak Mode-Aware

`AccountComparisonTable` menampilkan **semua akun** tanpa filter mode. Di Paper mode, seharusnya hanya menampilkan paper accounts. Di Live mode, seharusnya hanya menampilkan exchange accounts.

### F. AccountDetail Transactions Tab: Tidak Ada di Live Mode

Live mode menghilangkan tab Transactions sepenuhnya. Padahal exchange accounts (jika ada di DB) juga bisa punya deposit/withdrawal history. Tab ini harus tetap ada, tapi **read-only** atau menampilkan pesan "Managed by exchange".

### G. AccountDetail Financial Tab: Tidak Ada di Live Mode

Tab Financial (P&L breakdown, fee analysis, capital efficiency) sangat relevan untuk Live trading. Data bisa diambil dari synced trade entries yang `trade_mode = 'live'`.

### H. Overview Tab: Equity Curve Selalu Kosong di Live

`accountTrades` di-set `[]` ketika `isBinanceVirtual`, sehingga equity curve dan drawdown chart selalu kosong. Seharusnya menggunakan closed trades dari `trade_entries` yang `trade_mode = 'live'`.

### I. Metric Cards: Label Berbeda Tapi Fungsi Sama

| Card Position | Paper Label | Live Label | Unified Label |
|--------------|-------------|------------|---------------|
| 1st | Net P&L | Unrealized P&L | Net P&L (+ unrealized jika ada) |
| 2nd | Return on Capital | Available Balance | Return on Capital |
| 3rd | Win Rate | Open Positions | Win Rate |
| 4th | Profit Factor | Margin Used | Profit Factor |
| 5th | Total Trades | Total P&L | Total Trades |

### J. Header Balance Label Berbeda

- Paper: "Current Balance"
- Live: "Wallet Balance"
- Seharusnya: "Balance" (unified)

### K. Delete Flow: Missing di Live Mode

Live (Binance virtual) tidak punya delete/edit karena bukan DB entry. Ini benar secara logika, tapi **dropdown actions** harus tetap ada dengan opsi yang sesuai (misalnya hanya "Refresh", "View on Exchange").

---

## 2. Rencana Implementasi

### Phase 1: Unified AccountDetail Layout

**File: `src/pages/AccountDetail.tsx`**

Refactor agar layout **identik** untuk kedua mode. Prinsip:
- 5 metric cards yang sama dengan label yang sama
- 4 tabs yang sama: Overview, Strategies, Transactions, Financial
- Data source berbeda berdasarkan `isBinanceVirtual`
- Actions berbeda: Paper = full CRUD, Live = Refresh only

**Metric Cards (unified):**

| Card | Label | Paper Data | Live Data |
|------|-------|-----------|-----------|
| 1 | Net P&L | `stats.totalPnlNet` | `stats.totalPnlNet` dari synced trades (+ unrealized badge) |
| 2 | Return on Capital | ROC calculation | ROC dari wallet balance vs initial |
| 3 | Win Rate | `stats.winRate` | `stats.winRate` dari synced live trades |
| 4 | Profit Factor | `stats.profitFactor` | `stats.profitFactor` dari synced trades |
| 5 | Total Trades | `stats.totalTrades` | `stats.totalTrades` + active positions count |

**Tabs (unified):**
- **Overview**: Equity curve + drawdown + fee breakdown + capital flow (Live: data dari synced trades, bukan kosong)
- **Strategies**: Strategy breakdown (Live: dari synced live trades)
- **Transactions**: Paper = deposit/withdraw history. Live = pesan "Managed by exchange" atau synced transaction history
- **Financial**: P&L breakdown, capital efficiency (data dari synced trades untuk kedua mode)

**Live-specific additions di Overview:**
- Tambahkan card "Active Positions" (collapsible) di bawah equity curve jika ada open positions
- Tambahkan unrealized P&L badge di metric card 1

### Phase 2: Fix Accounts Page

**File: `src/pages/Accounts.tsx`**

1. Fix Open Positions icon logic -- jangan referensi Binance balance di Paper mode
2. Summary card labels sudah OK ("Paper accounts" / "Exchange accounts")

**File: `src/components/accounts/AccountCardList.tsx`**

1. Hapus `border-primary/20` dari Binance card agar styling uniform
2. Tambahkan `ChevronRight` hover effect ke Binance card (sudah ada di DB cards)

**File: `src/components/accounts/AddAccountForm.tsx`**

1. Hardcode `is_backtest: true` dan sembunyikan toggle ketika dipanggil dari Paper mode context
2. Atau: hapus toggle entirely karena form hanya muncul di Paper mode

**File: `src/components/accounts/AccountComparisonTable.tsx`**

1. Tambahkan mode filter: gunakan `useModeVisibility` untuk filter akun berdasarkan `isPaperAccount`
2. Di Live mode, tambahkan row untuk Binance virtual account jika ada synced trade data

### Phase 3: AccountDetail Data Source untuk Live Mode

**File: `src/pages/AccountDetail.tsx`**

1. Untuk Binance virtual account, fetch trades dari `trade_entries` dengan `trade_mode = 'live'` (bukan hardcode `[]`)
2. Gunakan `useAccountAnalytics` dengan `tradeMode: 'live'` untuk stats
3. Equity curve dan strategy breakdown akan otomatis terisi dari synced live trades

### Phase 4: Cleanup & Consistency

1. Hapus semua branching `isBinanceVirtual` yang membuat layout berbeda
2. Pertahankan branching hanya untuk:
   - Data source switching (DB vs API)
   - Action availability (CRUD vs read-only)
   - Konteks badges (Paper Trading vs exchange name)
3. Refactor `AccountDetail.tsx` dari 1042 baris menjadi sub-components:
   - `AccountDetailHeader.tsx`
   - `AccountDetailMetrics.tsx`
   - `AccountDetailOverview.tsx`
   - `AccountDetailStrategies.tsx` (sudah ada inline)
   - `AccountDetailTransactions.tsx` (sudah ada inline)
   - `AccountDetailFinancial.tsx` (sudah ada inline)

---

## 3. Files yang Diubah

| File | Aksi | Detail |
|------|------|--------|
| `src/pages/AccountDetail.tsx` | Refactor besar | Unified layout, remove mode-specific branching, extract sub-components |
| `src/components/accounts/detail/AccountDetailHeader.tsx` | Create | Header + actions sub-component |
| `src/components/accounts/detail/AccountDetailMetrics.tsx` | Create | 5 metric cards sub-component |
| `src/components/accounts/detail/AccountDetailOverview.tsx` | Create | Overview tab content |
| `src/components/accounts/detail/AccountDetailStrategies.tsx` | Create | Strategies tab content |
| `src/components/accounts/detail/AccountDetailTransactions.tsx` | Create | Transactions tab content |
| `src/components/accounts/detail/AccountDetailFinancial.tsx` | Create | Financial tab content |
| `src/pages/Accounts.tsx` | Minor fix | Open Positions icon logic |
| `src/components/accounts/AccountCardList.tsx` | Minor fix | Uniform card styling |
| `src/components/accounts/AddAccountForm.tsx` | Minor fix | Hardcode paper toggle |
| `src/components/accounts/AccountComparisonTable.tsx` | Add mode filter | Filter by active mode |

---

## 4. Prinsip yang Ditegakkan

1. **Layout parity 100%**: Sama persis antara Paper dan Live
2. **Mode = konteks**: Hanya data dan business rules yang berubah
3. **Live = read-only**: Tidak ada CRUD untuk exchange data, hanya Refresh
4. **Paper = full control**: CRUD lengkap untuk simulasi
5. **Single Responsibility**: AccountDetail dipecah menjadi 6 sub-components
6. **No statistical contamination**: Data tetap terisolasi per mode

