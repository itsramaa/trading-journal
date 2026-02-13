
# Perbaikan Kelemahan Nyata — 5 Tasks

## Kelemahan yang Ditemukan (Verified via Code Audit)

| # | Kelemahan | File | Severity |
|---|-----------|------|----------|
| 1 | `EquityCurveChart` masih pakai `useTradeEntries()` — **doc klaim sudah fix tapi BELUM** | `src/components/analytics/charts/EquityCurveChart.tsx` line 18, 29 | **Critical (Bug)** |
| 2 | `TradingHeatmap` pakai `useTradeEntries()` — data Paper/Live bocor | `src/components/analytics/charts/TradingHeatmap.tsx` line 11, 49 | **Critical** |
| 3 | `GoalTrackingWidget` pakai `useTradeEntries()` — goals dihitung dari semua trade tanpa mode filter | `src/components/dashboard/GoalTrackingWidget.tsx` line 17, 50 | **High** |
| 4 | `TradingHeatmap` tidak punya ARIA attributes — inkonsisten dengan chart lain | `TradingHeatmap.tsx` | **Medium** |
| 5 | Eval doc mengklaim 5 komponen sudah di-fix tapi EquityCurveChart + 2 komponen lain masih bocor | `JUDGING_CRITERIA_EVALUATION.md` | **Medium** |

---

## Task 1: Fix EquityCurveChart Data Isolation (CRITICAL BUG)

**Problem:** Line 18 masih `import { useTradeEntries }` dan line 29 masih `const { data: trades = [] } = useTradeEntries()`. Dokumen evaluasi mengklaim komponen ini sudah di-fix — ini **false claim**.

**Aksi:**
- Ganti `useTradeEntries` menjadi `useModeFilteredTrades` di import dan usage
- File: `src/components/analytics/charts/EquityCurveChart.tsx`

---

## Task 2: Fix TradingHeatmap Data Isolation

**Problem:** `TradingHeatmap` fetch semua trade via `useTradeEntries()` sebagai fallback saat `externalTrades` prop tidak diberikan. Ini berarti saat digunakan tanpa prop (e.g. di heatmap page), data Paper dan Live tercampur.

**Aksi:**
- Ganti fallback `useTradeEntries()` menjadi `useModeFilteredTrades()` di line 11 dan 49
- File: `src/components/analytics/charts/TradingHeatmap.tsx`

---

## Task 3: Fix GoalTrackingWidget Data Isolation

**Problem:** Dashboard goals (win rate target, P&L target, risk management) dihitung dari **semua trade** tanpa filter mode. User di Paper mode bisa melihat goals yang terhitung dari Live trades — menyesatkan.

**Aksi:**
- Ganti `useTradeEntries` menjadi `useModeFilteredTrades` di import dan usage
- File: `src/components/dashboard/GoalTrackingWidget.tsx`

---

## Task 4: Add ARIA Accessibility ke TradingHeatmap

**Problem:** `EquityCurveChart`, `RiskMetricsCards`, `PredictiveInsights`, dan `EmotionalPatternAnalysis` sudah punya ARIA attributes, tapi `TradingHeatmap` (komponen chart utama) belum.

**Aksi:**
- Tambahkan `role="region"` dan `aria-label="Trading performance heatmap by day and hour"` pada Card wrapper
- File: `src/components/analytics/charts/TradingHeatmap.tsx`

---

## Task 5: Update JUDGING_CRITERIA_EVALUATION.md

**Aksi:**
- Koreksi false claim tentang EquityCurveChart yang "sudah di-fix"
- Update daftar komponen yang telah di-migrate: tambahkan `TradingHeatmap` dan `GoalTrackingWidget`
- Dokumentasikan ARIA fix untuk TradingHeatmap
- Tambahkan entries baru di tabel "Perbaikan yang Sudah Dilakukan"
- Total komponen yang di-migrate: 7 (bukan 5)

---

## Urutan Pengerjaan

1. Task 1 — Fix EquityCurveChart (critical bug, doc discrepancy)
2. Task 2 — Fix TradingHeatmap
3. Task 3 — Fix GoalTrackingWidget
4. Task 4 — ARIA on TradingHeatmap
5. Task 5 — Doc update (koreksi + dokumentasi baru)

## Detail Teknis

### Task 1-3 — Pattern Edit (3 files, identical pattern)

```text
// BEFORE (EquityCurveChart line 18):
import { useTradeEntries } from "@/hooks/use-trade-entries";

// AFTER:
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";
```

```text
// BEFORE (usage):
const { data: trades = [] } = useTradeEntries();

// AFTER:
const { data: trades = [] } = useModeFilteredTrades();
```

Untuk `TradingHeatmap`, variable name berubah dari `fetchedTrades` ke tetap `fetchedTrades` — hanya hook source yang berubah.

### Task 4 — ARIA attribute

```text
<Card role="region" aria-label="Trading performance heatmap by day and hour">
```

### Task 5 — Doc corrections

- Ubah "5 analytics components" menjadi "7 analytics/dashboard components"
- Tambahkan `TradingHeatmap` dan `GoalTrackingWidget` ke daftar komponen
- Koreksi EquityCurveChart dari "claimed fixed" menjadi "actually fixed"
