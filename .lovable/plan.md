

# Deep Dive Audit — Gaps & 10 Perbaikan Signifikan

## Hasil Audit Menyeluruh

Setelah verifikasi file-by-file terhadap seluruh codebase, ditemukan **1 data isolation bug aktif**, **3 kelemahan dokumentasi**, dan **6 area yang perlu ditingkatkan** untuk memastikan coverage 100%.

---

## Gap yang Ditemukan

| # | Gap | Severity | Kriteria Terdampak |
|---|-----|----------|-------------------|
| 1 | **`useSymbolBreakdown`** menggunakan `useTradeEntries()` TANPA mode filter — Paper path mengagregasi SEMUA trade tanpa filter `tradeMode` | **Critical** | Accuracy |
| 2 | `useUnifiedDailyPnl`, `useUnifiedWeeklyPnl`, `useUnifiedWeekComparison` menggunakan `useTradeEntries()` dengan inline mode filter — pattern ini belum terdokumentasi/justified di eval doc | **Medium** | Accuracy, Code Quality |
| 3 | `Performance.tsx` menggunakan `useTradeEntries()` untuk multi-level analytics level "type" — belum terdokumentasi justified | **Medium** | Accuracy |
| 4 | `TradingJournal.tsx` import `useTradeEntries` tapi hanya untuk type/mutation re-exports — bukan untuk data query. Belum terdokumentasi. | **Low** | Code Quality |
| 5 | Eval doc tidak ada section "Error Handling & Fallback Behavior" — edge case handling (empty data, loading, error states) tidak dianalisis | **Medium** | Comprehensiveness |
| 6 | Eval doc tidak dokumentasikan `WidgetErrorBoundary` pattern per-widget | **Low** | Code Quality |
| 7 | Tidak ada unit test untuk `symbol-utils.ts` dan `trade-utils.ts` | **Low** | Code Quality |
| 8 | `useSymbolBreakdown` tidak menggunakan `useTradeMode()` sama sekali — tidak ada awareness terhadap mode aktif | **Critical** | Accuracy |
| 9 | Eval doc page inventory menuliskan 25 pages tapi TradingJournal ada di subfolder `trading-journey/` — perlu klarifikasi arsitektur routing | **Low** | Comprehensiveness |
| 10 | Eval doc edge function count "25" tapi listing menunjukkan 25 function dirs + `_shared/` — perlu klarifikasi bahwa `_shared/` bukan edge function | **Low** | Accuracy |

---

## 10 Perbaikan Signifikan

### Task 1: Fix `useSymbolBreakdown` Data Isolation (CRITICAL BUG)

**Problem:** `src/hooks/analytics/use-symbol-breakdown.ts` line 8, 36 menggunakan `useTradeEntries()` dan Paper path (line 51-101) TIDAK memfilter berdasarkan `tradeMode`. Semua closed trades dari semua mode teragregasi ke symbol breakdown. Ini menyebabkan Dashboard symbol breakdown (Today's P&L by Symbol) menampilkan data Paper dan Live tercampur.

**Fix:**
- Import `useTradeMode` 
- Tambahkan inline mode filter di `trades.forEach()` block (identik dengan pattern di `useUnifiedWeeklyPnl` line 88-91)

```typescript
// Add import
import { useTradeMode } from '@/hooks/use-trade-mode';

// Inside hook, add:
const { tradeMode } = useTradeMode();

// In trades.forEach callback, after status check:
const matchesMode = trade.trade_mode 
  ? trade.trade_mode === tradeMode
  : (tradeMode === 'live' ? trade.source === 'binance' : trade.source !== 'binance');
if (!matchesMode) return;
```

**Dampak:** Accuracy +++ (menghilangkan data contamination di symbol breakdown)

### Task 2: Dokumentasikan "Inline Mode Filter" Pattern

**Problem:** 3 hooks (`useUnifiedDailyPnl`, `useUnifiedWeeklyPnl`, `useUnifiedWeekComparison`) menggunakan `useTradeEntries()` dengan inline mode filter sebagai alternative approach terhadap `useModeFilteredTrades()`. Ini pattern yang valid (mereka butuh `useTradeMode` anyway untuk source determination), tapi belum terdokumentasi.

**Fix:** Tambahkan section di eval doc yang menjelaskan dua pattern data isolation yang digunakan:
- Pattern A: `useModeFilteredTrades()` — untuk komponen yang hanya butuh filtered trades
- Pattern B: `useTradeEntries()` + inline mode filter — untuk hooks yang sudah import `useTradeMode` untuk source routing logic (menghindari double hook overhead)

**Dampak:** Accuracy, Code Quality (transparansi arsitektur)

### Task 3: Dokumentasikan `Performance.tsx` Multi-Level Analytics Justification

**Problem:** `Performance.tsx` line 65 menggunakan `useTradeEntries()` untuk `allTrades`. Ini digunakan HANYA saat `analyticsSelection.level === 'type'` (line 76-81) untuk memfilter berdasarkan Paper vs Live type. Pattern ini benar — multi-level analytics membutuhkan akses ke semua trades untuk tipe-level comparison.

**Fix:** Tambahkan justifikasi di Accuracy section eval doc.

**Dampak:** Accuracy (eliminasi false positive)

### Task 4: Dokumentasikan `TradingJournal.tsx` Import Pattern

**Problem:** `TradingJournal.tsx` import `useTradeEntries` (line 30) tapi menggunakan `useModeFilteredTrades()` (line 74) untuk data. Import `useTradeEntries` hanya digunakan untuk type re-export (`TradeEntry`) dan mutation hooks (`useDeleteTradeEntry`, `useClosePosition`, `useUpdateTradeEntry`).

**Fix:** Dokumentasikan di eval doc bahwa import ini hanya untuk types/mutations, bukan data query.

**Dampak:** Code Quality (transparansi)

### Task 5: Tambahkan Section "Error Handling & Fallback Behavior"

**Problem:** Eval doc tidak memiliki analisis terhadap edge case handling. Aplikasi memiliki banyak error handling patterns yang belum didokumentasikan.

**Fix:** Tambahkan section baru yang mencakup:
- `WidgetErrorBoundary` untuk isolasi failure per-widget
- Global `ErrorBoundary` untuk app-level crash recovery
- Loading skeletons di setiap section
- Empty state patterns (`EmptyState` component)
- React Query retry logic (exponential backoff)
- Edge function error sanitization (`sanitizeError`)
- Graceful degradation saat Binance disconnected

**Dampak:** Comprehensiveness, Code Quality

### Task 6: Unit Test untuk `symbol-utils.ts`

**Problem:** `symbol-utils.ts` digunakan di 10+ components tapi belum punya test coverage.

**Fix:** Buat `src/lib/__tests__/symbol-utils.test.ts` dengan test cases untuk:
- Symbol validation
- Symbol formatting/normalization
- Edge cases (empty, invalid, special characters)

**Dampak:** Code Quality

### Task 7: Unit Test untuk `trade-utils.ts`

**Problem:** `trade-utils.ts` berisi utility functions untuk trade processing tapi belum punya test coverage.

**Fix:** Buat `src/lib/__tests__/trade-utils.test.ts` dengan test cases untuk key functions.

**Dampak:** Code Quality

### Task 8: Update Data Isolation Count dan Inventory

**Problem:** Eval doc menyebutkan "9 components migrated to `useModeFilteredTrades()`" tapi tidak menyebutkan `useSymbolBreakdown` yang merupakan bug baru ditemukan.

**Fix:** Setelah fix Task 1, update count menjadi "10 analytics/dashboard/risk hooks" dan tambahkan `useSymbolBreakdown` ke daftar. Juga dokumentasikan 3 hooks dengan inline pattern (Task 2).

**Dampak:** Accuracy, Comprehensiveness

### Task 9: Klarifikasi Page Routing Architecture

**Problem:** Eval doc menuliskan "TradingJournal" di domain "Core" tapi file-nya ada di `src/pages/trading-journey/TradingJournal.tsx` (subfolder). Perlu klarifikasi.

**Fix:** Update page inventory untuk menunjukkan path lengkap dan routing structure.

**Dampak:** Comprehensiveness

### Task 10: Final Verification & Confirmation

**Fix:** 
- Verifikasi semua claims di eval doc terhadap kode aktual
- Update `_shared/` klarifikasi (bukan edge function, melainkan shared utility module)
- Update total test file count (13 files setelah Task 6-7)
- Update total migrated/justified count
- Konfirmasi: **sistem fully optimized**

**Dampak:** Semua kriteria

---

## Execution Order

1. **Task 1** (Critical bug fix — `useSymbolBreakdown` mode filter)
2. **Tasks 6-7** (New test files — parallel, 2 files)
3. **Task 5** (Error handling section — new doc content)
4. **Tasks 2-4, 8-10** (Documentation updates — single eval doc edit)

## Ringkasan Dampak per Kriteria

| Kriteria | Dampak |
|----------|--------|
| **Accuracy** | Fix data isolation bug di `useSymbolBreakdown` + dokumentasikan inline pattern + justify Performance.tsx |
| **Comprehensiveness** | Error Handling section + routing klarifikasi |
| **Code Quality** | 2 test files baru + pattern documentation |
| **Clarity** | Transparansi arsitektur |
| **Innovation** | Tidak berubah (sudah optimal) |
| **Security** | Tidak berubah (sudah optimal) |

