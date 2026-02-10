
# Paper Mode — Full Analysis & Fix Plan

## Temuan Masalah

Setelah audit menyeluruh terhadap seluruh halaman dan komponen, ditemukan **6 masalah kritis** yang menyebabkan Paper Mode tidak berfungsi dengan benar:

---

### BUG 1: Accounts Page — Paper Accounts Tidak Muncul (CRITICAL)

**Root Cause:** Filter paper accounts menggunakan `account_type === 'backtest' || metadata?.is_backtest` (baris 103-105), tetapi data di database menunjukkan SEMUA akun memiliki `account_type: 'trading'` dan `is_backtest: null`.

**Dampak:** Saat Paper mode aktif, section "Paper Trading" tidak menampilkan akun apapun meskipun akun ada di database.

**Fix:** Ubah logika filter paper accounts. Akun Paper seharusnya diidentifikasi berdasarkan `exchange === 'manual'` atau field lain yang sudah di-backfill di Phase 1. Alternatif: tampilkan semua akun `account_type: 'trading'` yang bukan Binance di Paper mode.

---

### BUG 2: TradeHistory — Full Sync Visible di Paper Mode (CRITICAL)

**Root Cause:** `TradeHistory.tsx` TIDAK menggunakan `useModeVisibility`. `BinanceFullSyncPanel` hanya di-gate oleh `isBinanceConnected` (baris 452), bukan oleh mode. Jika Binance terkoneksi, Full Sync tetap tampil meskipun user di Paper mode.

Komponen yang terpengaruh:
- `BinanceFullSyncPanel` — tampil di Paper mode
- Incremental sync button — tampil di Paper mode
- Fee History & Funding History tabs — tampil di Paper mode

**Fix:** Tambahkan `useModeVisibility` ke `TradeHistory.tsx`. Gate semua komponen Binance-specific dengan `showExchangeData`.

---

### BUG 3: TradeHistory — Fee & Funding Tabs Tidak Di-gate (MEDIUM)

**Root Cause:** Tab "Fees" dan "Funding" adalah data Binance-only, tetapi tidak di-hide saat Paper mode. Tab ini tetap muncul dan mungkin menampilkan data Live.

**Fix:** Disable/hide tab Fees dan Funding saat `showExchangeData === false`.

---

### BUG 4: RiskManagement — Tidak Ada Mode Awareness (MEDIUM)

**Root Cause:** `RiskManagement.tsx` tidak menggunakan `useModeVisibility` sama sekali. `DailyLossTracker` dan `CorrelationMatrix` bisa berfungsi di Paper mode (karena hooks internal sudah mode-aware), tetapi `CorrelationMatrix` di memory disebut harus hidden di Paper mode.

**Fix:** Tambahkan `useModeVisibility` dan sembunyikan komponen yang seharusnya Paper-restricted (sesuai `use-mode-visibility.ts` spec).

---

### BUG 5: Accounts Page — Overview Cards Mencampur Data (LOW-MEDIUM)

**Root Cause:** Overview cards (Total Balance, Active Positions) menampilkan combined Binance + Paper data. Di Paper mode, seharusnya HANYA menampilkan Paper data, bukan aggregasi keduanya.

**Fix:** Di Paper mode, summary cards hanya tampilkan `paperTotalBalance` dan paper positions. Di Live mode, tampilkan Binance data. Jangan campur keduanya.

---

### BUG 6: Accounts Page — showPaperData Gate Terlalu Ketat (LOW)

**Root Cause:** Section "Paper Trading" (baris 442) hanya ditampilkan saat `showPaperData === true` (Paper mode). Ini benar, tapi saat Live mode, user tidak bisa melihat paper accounts sama sekali — yang mungkin diinginkan, tapi perlu dipastikan konsisten dengan spec.

---

## Rencana Fix

### Step 1: Fix Account Filter Logic (BUG 1)
- **File:** `src/pages/Accounts.tsx` (baris 103-108)
- Ubah filter dari `account_type === 'backtest' || metadata?.is_backtest` menjadi filter berdasarkan `exchange === 'manual'` atau tampilkan semua non-binance accounts
- Juga fix `AccountCardList.tsx` prop `backtestOnly` yang tidak match data real

### Step 2: Add Mode Gate ke TradeHistory (BUG 2 & 3)
- **File:** `src/pages/TradeHistory.tsx`
- Import dan gunakan `useModeVisibility`
- Wrap `BinanceFullSyncPanel` dengan `showExchangeData` check
- Wrap incremental sync button dengan `showExchangeData`
- Disable/hide Fee & Funding tabs saat `!showExchangeData`

### Step 3: Add Mode Gate ke RiskManagement (BUG 4)
- **File:** `src/pages/RiskManagement.tsx`
- Import `useModeVisibility`
- Hide `CorrelationMatrix` (Binance-dependent) saat Paper mode jika sesuai spec
- `DailyLossTracker` bisa tetap tampil (sudah mode-aware via hooks)

### Step 4: Fix Overview Cards di Accounts (BUG 5)
- **File:** `src/pages/Accounts.tsx`
- Di Paper mode: summary cards hanya tampilkan paper data
- Di Live mode: summary cards tampilkan Binance data
- Jangan aggregasi keduanya

### Step 5: Update Docs
- Update `docs/` untuk mencerminkan aturan mode visibility yang diperbaiki

---

## Technical Details

| File | Perubahan |
|------|-----------|
| `src/pages/Accounts.tsx` | Fix paper account filter, fix overview cards mode isolation |
| `src/pages/TradeHistory.tsx` | Add `useModeVisibility`, gate Binance UI components |
| `src/pages/RiskManagement.tsx` | Add `useModeVisibility`, gate exchange-only components |
| `src/components/accounts/AccountCardList.tsx` | Fix `backtestOnly` filter to match actual DB schema |
| `src/hooks/use-mode-visibility.ts` | Possibly extend with new flags if needed |
| `docs/` | Update mode visibility documentation |

### Urutan Eksekusi
Step 1 dan Step 2 adalah prioritas tertinggi (Critical bugs). Step 3-5 bisa dikerjakan setelahnya.

### Dampak
- Tidak ada perubahan database
- Tidak ada perubahan RPC
- Murni frontend logic fixes
- Backward compatible — Live mode behavior tidak berubah
