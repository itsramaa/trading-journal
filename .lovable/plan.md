

# Deep UX Analysis & Repair Plan: Accounts Domain

## Ringkasan Temuan

Setelah audit menyeluruh terhadap seluruh codebase Accounts (2 pages, 8 components, 5 hooks), ditemukan **5 bugs fungsional**, **4 UX gaps**, dan **3 improvement areas** yang perlu diperbaiki.

---

## A. BUGS FUNGSIONAL

### A1. AccountTransactionDialog: defaultTab dan defaultAccount Tidak Sync Saat Re-open (BUG)

**Problem:** `AccountTransactionDialog` menggunakan `useState(defaultTab)` dan `useState(defaultAccount?.id)` di line 61 dan 69. `useState` hanya membaca initial value sekali. Jika user klik "Deposit" di Account A, lalu close dialog, lalu klik "Withdraw" di Account B, dialog tetap menampilkan "Deposit" tab dan Account A.

**Fix:** Tambahkan `useEffect` untuk sync `activeTab` dan form `accountId` saat props berubah:
```typescript
useEffect(() => { setActiveTab(defaultTab); }, [defaultTab]);
useEffect(() => {
  if (defaultAccount?.id) {
    depositForm.setValue('accountId', defaultAccount.id);
    withdrawForm.setValue('accountId', defaultAccount.id);
  }
}, [defaultAccount]);
```

**File:** `src/components/accounts/AccountTransactionDialog.tsx`

---

### A2. useDeleteAccount: Hard Delete, Bukan Soft Delete (BUG - Melanggar Arsitektur)

**Problem:** `useDeleteAccount` di line 201 menggunakan `.delete()` langsung. Berdasarkan memory `database/soft-delete-architecture`, sistem menggunakan soft-delete via kolom `deleted_at`. Account deletion seharusnya set `deleted_at = now()`, bukan hard delete.

**Fix:** Ubah `.delete()` menjadi `.update({ deleted_at: new Date().toISOString(), is_active: false })`.

**File:** `src/hooks/use-accounts.ts`

---

### A3. useAccounts: Tidak Filter `deleted_at IS NULL` (BUG)

**Problem:** `useAccounts` query di line 41 tidak memfilter `deleted_at`. Jika soft-delete diterapkan (A2), akun yang sudah dihapus tetap muncul.

**Fix:** Tambahkan `.is('deleted_at', null)` ke query.

**File:** `src/hooks/use-accounts.ts`

---

### A4. AccountDetail: Tidak Ada Deposit/Withdraw Action (MISSING FEATURE)

**Problem:** Halaman AccountDetail menampilkan balance dan transaction history, tapi tidak ada button untuk melakukan Deposit atau Withdraw langsung dari halaman detail. User harus kembali ke halaman Accounts untuk melakukan transaksi.

**Fix:** Tambahkan Deposit/Withdraw buttons di header AccountDetail dan integrasikan `AccountTransactionDialog`.

**File:** `src/pages/AccountDetail.tsx`

---

### A5. AccountDetail: Tidak Ada Edit Action (MISSING FEATURE)

**Problem:** Sama seperti A4, tidak ada akses ke Edit dari halaman detail. User hanya bisa edit dari card list.

**Fix:** Tambahkan Edit button di header dan integrasikan `EditAccountDialog`.

**File:** `src/pages/AccountDetail.tsx`

---

## B. UX GAPS

### B1. AccountComparisonTable Muncul di Antara Binance dan Paper Section

**Problem:** `AccountComparisonTable` di-render di line 424 antara section Binance (Live) dan section Paper. Secara visual ini membingungkan karena posisinya tidak jelas milik section mana. Ketika mode Paper, section Binance hidden tapi Comparison Table tetap di atas Paper section tanpa konteks.

**Fix:** Pindahkan `AccountComparisonTable` ke bawah section Paper (setelah `AccountCardList`) agar secara visual berada di akhir tab Accounts sebagai rangkuman perbandingan.

**File:** `src/pages/Accounts.tsx`

---

### B2. Paper Accounts Section: Tidak Ada Summary Cards

**Problem:** Live mode menampilkan 3 detail cards (Wallet Balance, Available, Unrealized P&L). Paper mode hanya menampilkan card list tanpa summary setara. Ini membuat Paper mode terasa "kurang".

**Fix:** Tambahkan summary row untuk Paper mode: Total Paper Balance, Total Paper Trades, dan Average Win Rate (dari `AccountComparisonTable` data atau aggregasi lokal).

**File:** `src/pages/Accounts.tsx`

---

### B3. Empty State di Accounts Tab Ketika Live Mode Tapi Tidak Connected

**Problem:** Ketika user di Live mode tapi Binance belum terkoneksi, halaman menampilkan "Binance Not Configured" card dan AccountComparisonTable (yang mungkin kosong), tapi tidak ada guidance yang jelas tentang apa yang harus dilakukan selanjutnya.

**Fix:** Buat empty state yang lebih cohesive: sembunyikan AccountComparisonTable jika tidak ada data, dan tambahkan CTA yang lebih prominent.

**File:** `src/pages/Accounts.tsx`

---

### B4. AccountDetail: Header Tidak Responsive di Mobile

**Problem:** Header AccountDetail (line 197-222) menggunakan `flex items-center gap-4` dengan balance di `text-right`. Di mobile (< 640px), balance dan account name akan terlalu rapat atau overflow.

**Fix:** Tambahkan responsive breakpoint: stack vertically di mobile, horizontal di desktop.

**File:** `src/pages/AccountDetail.tsx`

---

## C. IMPROVEMENTS

### C1. ARIA Labels dan Accessibility

**Problem:** Cards dan tabel di Accounts page tidak memiliki `role="region"` atau `aria-label` sesuai standar yang sudah diterapkan di analytics components.

**Fix:** Tambahkan ARIA attributes ke overview cards, Binance section, Paper section, dan AccountComparisonTable.

**Files:** `src/pages/Accounts.tsx`, `src/components/accounts/AccountComparisonTable.tsx`

---

### C2. AccountDetail: 634 Lines, Perlu Refactor

**Problem:** File masih 634 baris dengan equity curve, drawdown, strategy breakdown, dan transaction table dalam satu file. Ini sudah di-flag di audit sebelumnya tapi belum dieksekusi.

**Fix:** Extract ke sub-components:
- `AccountOverviewTab.tsx` - equity curve, drawdown, fee breakdown, capital flow
- `AccountStrategiesTab.tsx` - strategy breakdown table  
- `AccountTransactionsTab.tsx` - transaction list with search/filter

**Files:** 3 new files + refactored `AccountDetail.tsx`

---

### C3. Konsistensi Delete Confirmation

**Problem:** `AccountCardList` menggunakan `confirm()` browser native untuk delete confirmation. Ini tidak konsisten dengan UI library (Radix AlertDialog) yang sudah tersedia.

**Fix:** Ganti `confirm()` dengan `AlertDialog` component yang menampilkan jumlah trades terkait dan pesan bahwa deletion bisa di-recover via Settings.

**File:** `src/components/accounts/AccountCardList.tsx`

---

## Implementation Plan

### Phase 1: Bug Fixes (Prioritas Tertinggi)

| # | Task | File |
|---|------|------|
| A1 | Fix TransactionDialog prop sync | AccountTransactionDialog.tsx |
| A2 | Implementasi soft-delete | use-accounts.ts |
| A3 | Filter deleted accounts dari query | use-accounts.ts |

### Phase 2: Missing Features

| # | Task | File |
|---|------|------|
| A4 | Tambah Deposit/Withdraw di AccountDetail | AccountDetail.tsx |
| A5 | Tambah Edit di AccountDetail | AccountDetail.tsx |
| B2 | Paper mode summary cards | Accounts.tsx |

### Phase 3: UX & Layout

| # | Task | File |
|---|------|------|
| B1 | Reposisi AccountComparisonTable | Accounts.tsx |
| B3 | Improve Live mode empty state | Accounts.tsx |
| B4 | Responsive header AccountDetail | AccountDetail.tsx |
| C3 | AlertDialog untuk delete confirmation | AccountCardList.tsx |

### Phase 4: Code Quality & Polish

| # | Task | Files |
|---|------|-------|
| C1 | ARIA labels | Accounts.tsx, AccountComparisonTable.tsx |
| C2 | Refactor AccountDetail ke sub-components | 3 new files + AccountDetail.tsx |

---

## Detail Teknis Per Phase

### Phase 1 Detail:

**A2+A3 (use-accounts.ts):**
- `useDeleteAccount`: ubah `.delete()` menjadi `.update({ deleted_at: new Date().toISOString(), is_active: false })`
- `useAccounts`: tambah `.is('deleted_at', null)` pada query
- Konfirmasi message: "Account akan dipindahkan ke trash. Bisa di-recover dalam 30 hari via Settings."

**A1 (AccountTransactionDialog.tsx):**
- Tambahkan 2 `useEffect` untuk sync `defaultTab` -> `activeTab` dan `defaultAccount` -> form values
- Ini memastikan re-open dialog selalu menampilkan context yang benar

### Phase 2 Detail:

**A4+A5 (AccountDetail.tsx):**
- Tambahkan `DropdownMenu` di header area dengan opsi: Edit, Deposit, Withdraw, Delete
- Import dan integrasikan `EditAccountDialog` dan `AccountTransactionDialog`
- State management: `editDialogOpen`, `transactionDialogOpen`, `defaultTransactionTab`

**B2 (Accounts.tsx - Paper Summary):**
- Tambahkan 3 summary cards sebelum AccountCardList di Paper section
- Cards: Paper Balance (total), Paper Accounts (count), Open Paper Trades (from existing query)
- Reuse `paperTotalBalance`, `paperAccountsCount`, dan `paperOpenTradesCount` yang sudah di-compute

### Phase 3 Detail:

**B1:** Pindahkan `<AccountComparisonTable />` ke setelah Paper section (sebelum closing `</TabsContent>`)

**C3 (AccountCardList.tsx):**
- Ganti `confirm()` dengan AlertDialog dari Radix
- Tampilkan: "Delete '{name}'? This account will be moved to trash and can be recovered within 30 days."

### Phase 4 Detail:

**C2 Refactor AccountDetail:**
- `AccountOverviewTab`: terima props `equityData`, `stats`, `flowStats`, `formatCurrency`, `formatPnl`
- `AccountStrategiesTab`: terima props `strategyBreakdown`, `formatPnl`
- `AccountTransactionsTab`: terima props `transactions`, `formatCurrency`
- Parent `AccountDetail.tsx` tetap mengelola data fetching, sub-components hanya render

