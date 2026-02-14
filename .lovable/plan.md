
# Deep Dive Audit: Accounts Page

## Executive Summary

Audit terhadap seluruh domain Accounts berdasarkan 6 judging criteria menemukan **3 critical issues**, **4 medium issues**, dan **5 minor improvements**. Secara keseluruhan arsitektur sudah solid, tapi ada inkonsistensi identifikasi paper account yang bisa menyebabkan data isolation leak.

---

## 1. ACCURACY - Paper Account Identification Inconsistency (CRITICAL)

**Problem:** Terdapat 2 metode berbeda untuk mengidentifikasi paper account:
- **Method A** (Accounts.tsx, AccountCardList): `exchange === 'manual' || null || ''`
- **Method B** (AccountDetail, AccountSelect, usePaperAccountValidation): `metadata.is_backtest === true`

Memory `paper-account-identification-rule` menetapkan Method A sebagai yang benar. Namun `AccountDetail.tsx` line 133 masih menggunakan Method B:
```typescript
const isBacktest = account?.metadata?.is_backtest === true; // WRONG
```

**Impact:** Badge "Paper Trading", ikon, dan warna di AccountDetail bisa salah jika `metadata.is_backtest` tidak di-set tapi `exchange` null.

**Fix:** Buat utility function `isPaperAccount(account)` di `src/lib/account-utils.ts` dan gunakan di semua komponen:
```typescript
export function isPaperAccount(account: Account): boolean {
  return !account.exchange || account.exchange === 'manual' || account.exchange === '';
}
```

**Files affected:**
- NEW: `src/lib/account-utils.ts`
- `src/pages/AccountDetail.tsx` (line 133)
- `src/components/accounts/AccountSelect.tsx` (lines 54, 73)
- `src/components/accounts/AccountCardList.tsx` (lines 52, 112)
- `src/pages/Accounts.tsx` (line 106)
- `src/hooks/use-paper-account-validation.ts` (line 42)

---

## 2. ACCURACY - AddAccountForm Missing `exchange` Field (CRITICAL)

**Problem:** `AddAccountForm` tidak meng-set field `exchange` saat create account. Paper accounts yang dibuat akan memiliki `exchange = null` di DB.

Saat ini ini "kebetulan" bekerja karena filter paper menggunakan `exchange === null`. Tapi ini implicit, bukan explicit. Jika ada migration atau default value berubah, logic bisa rusak.

**Fix:** Set `exchange: 'manual'` secara eksplisit saat creating paper account di `useCreateAccount` hook:
```typescript
// di src/hooks/use-accounts.ts, useCreateAccount
exchange: account.metadata?.is_backtest ? 'manual' : (account.exchange || ''),
```

---

## 3. ACCURACY - AccountDetail Drawdown Calculation Edge Case

**Problem:** Line 91 di `AccountDetail.tsx`:
```typescript
const drawdown = peak > 0 ? ((peak - cumulative) / peak) * 100 : 0;
```
Jika semua trade loss (peak = 0 karena cumulative selalu negatif), drawdown selalu 0. Ini secara teknis benar (no peak to draw down from), tapi bisa membingungkan user yang melihat kerugian tapi drawdown chart kosong.

**Fix (minor):** Tambahkan note di UI bahwa drawdown dihitung dari peak equity, bukan dari initial balance.

---

## 4. COMPREHENSIVENESS - Missing Edit Account Functionality

**Problem:** `useUpdateAccount` hook ada di `use-accounts.ts`, tapi tidak ada UI untuk edit account (rename, change broker, dll). User hanya bisa delete atau deposit/withdraw.

**Fix:** Tambahkan "Edit" option di dropdown menu `AccountCardList.tsx` dan buat `EditAccountDialog` component.

---

## 5. CLARITY - FinancialSummaryCard Link Uses `<a>` Instead of `<Link>`

**Problem:** Line 291 di `FinancialSummaryCard.tsx`:
```typescript
<a href="/trade-history" className="text-primary hover:underline">
```
Menggunakan native `<a>` tag yang menyebabkan full page reload, bukan SPA navigation.

**Fix:** Ganti dengan React Router `<Link to="/trade-history">`.

---

## 6. CLARITY - AccountComparisonTable Shows Even in Paper Mode with No Data

**Problem:** `AccountComparisonTable` di-render di luar conditional `showExchangeData` dan `showPaperData` blocks. Ini berarti tabel muncul di kedua mode tapi tanpa mode-awareness yang jelas di positioning.

Saat ini logic internal (`tradeMode` filter) sudah benar, tapi secara visual posisinya di antara Binance section dan Paper section bisa membingungkan.

**Fix:** Pindahkan `AccountComparisonTable` ke dalam masing-masing mode section, atau beri label mode-aware yang lebih jelas.

---

## 7. CODE QUALITY - Duplicated Paper Account Detection Logic

**Problem:** Logic `!exchange || exchange === 'manual'` di-copy-paste di 4+ lokasi. Melanggar DRY principle.

**Fix:** Sudah tercakup di Fix #1 (utility function `isPaperAccount`).

---

## 8. CODE QUALITY - AccountDetail.tsx Too Large (606 lines)

**Problem:** Single file 606 baris dengan equity curve, drawdown, strategy breakdown, transaction table, dan capital flow. Melanggar Single Responsibility.

**Fix:** Refactor menjadi sub-components:
- `AccountOverviewTab.tsx` (equity curve + drawdown + fee breakdown + capital flow)
- `AccountStrategiesTab.tsx` (strategy breakdown table)
- `AccountTransactionsTab.tsx` (transaction list with filters)

---

## 9. SECURITY - Account Deletion Without Cascade Check

**Problem:** `useDeleteAccount` langsung delete tanpa memeriksa apakah ada trade entries yang masih terkait. Konfirmasi hanya berupa browser `confirm()`.

**Fix:** Tambahkan pengecekan server-side atau UI warning yang menampilkan jumlah trades terkait sebelum delete.

---

## 10. CLARITY - Unrealized P&L Card Icon Logic in Paper Mode

**Problem:** Line 207 di Accounts.tsx, Active Positions card selalu menggunakan `balance?.totalUnrealizedProfit` untuk menentukan ikon (TrendingUp/Down), bahkan di paper mode dimana balance Binance tidak relevan.

**Fix:** Gunakan conditional: di paper mode, tampilkan icon netral atau berdasarkan paper trade PnL.

---

## 11. INNOVATION - Missing Return on Capital %

**Problem:** Account Detail menampilkan Net PnL tapi tidak menampilkan Return % (PnL / Initial Capital). Ini metrik penting untuk evaluasi performa akun.

**Fix:** Tambahkan card "Return %" di key metrics row, dihitung dari `totalPnlNet / initialBalance * 100`.

---

## 12. MINOR - Inconsistent Empty State Messages

**Problem:** Empty states di berbagai komponen menggunakan pesan yang tidak konsisten dan beberapa tidak memberikan actionable guidance.

---

## Implementation Priority

| Priority | Issue | Impact |
|----------|-------|--------|
| P0 | #1 Paper account identification utility | Data accuracy |
| P0 | #2 Set exchange='manual' on create | Data integrity |
| P1 | #5 Fix `<a>` to `<Link>` | UX (prevents full reload) |
| P1 | #10 Paper mode icon logic | Visual accuracy |
| P2 | #8 Refactor AccountDetail | Maintainability |
| P2 | #4 Edit account UI | Feature completeness |
| P2 | #6 Comparison table positioning | Clarity |
| P3 | #11 Return on Capital % | Innovation |
| P3 | #3 Drawdown edge case note | Clarity |
| P3 | #9 Cascade delete check | Security |
| P3 | #12 Empty state consistency | Polish |

## Technical Plan

### Phase 1: Data Integrity (P0)
1. Create `src/lib/account-utils.ts` with `isPaperAccount()` utility
2. Update all 6 files to use the utility
3. Add `exchange: 'manual'` to paper account creation flow

### Phase 2: UX Fixes (P1)
4. Fix FinancialSummaryCard `<a>` to `<Link>`
5. Fix Active Positions icon logic for paper mode

### Phase 3: Code Quality (P2)
6. Refactor AccountDetail into sub-components
7. Add Edit Account dialog
8. Reposition AccountComparisonTable

### Phase 4: Polish (P3)
9. Add Return on Capital % metric
10. Improve drawdown chart note
11. Standardize empty states
