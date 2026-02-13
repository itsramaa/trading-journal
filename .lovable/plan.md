
# Mengurangi Kelemahan & Memaksimalkan Skor — 5 Tasks

## Analisis Kelemahan yang Ditemukan

Setelah audit mendalam, ditemukan **kelemahan nyata** yang belum terdokumentasi:

| # | Kelemahan | Kategori | Severity |
|---|-----------|----------|----------|
| 1 | 5 analytics components pakai `useTradeEntries()` bukan `useModeFilteredTrades()` — data Paper/Live bocor | **Accuracy + Comprehensiveness** | Critical |
| 2 | EmotionalPatternAnalysis hanya inline di tab "patterns" — kurang prominent | **Clarity** | Medium |
| 3 | EmotionalPatternAnalysis tidak punya ARIA attributes (tidak konsisten dengan PredictiveInsights) | **Clarity** | Medium |
| 4 | Tidak ada unit tests untuk `emotional-states.ts` utility | **Code Quality** | Low |
| 5 | Eval doc belum mencerminkan data isolation fix | **Documentation** | Medium |

---

## Task 1: Fix Data Isolation — Analytics Components

**Problem:** `EmotionalPatternAnalysis`, `EquityCurveChart`, `DrawdownChart`, `CryptoRanking`, `AIPatternInsights` menggunakan `useTradeEntries()` langsung, sehingga menampilkan **semua trade tanpa filter Paper/Live mode**. Ini melanggar prinsip data isolation yang sudah diimplementasikan di tempat lain.

**Aksi:** Ganti `useTradeEntries()` menjadi `useModeFilteredTrades()` di 5 file:
- `src/components/analytics/EmotionalPatternAnalysis.tsx`
- `src/components/analytics/charts/EquityCurveChart.tsx`
- `src/components/analytics/charts/DrawdownChart.tsx`
- `src/components/analytics/CryptoRanking.tsx`
- `src/components/analytics/AIPatternInsights.tsx`

**Impact:** Accuracy + Comprehensiveness fix. Semua analytics kini konsisten dengan mode aktif.

---

## Task 2: Tambah Tab "Emotional" di AIInsights

**Problem:** EmotionalPatternAnalysis hanya inline di bawah pattern analysis, mudah terlewat oleh user.

**Aksi:** Tambahkan tab baru `emotional` di `AIInsights.tsx` `TabsList`:
- Pindahkan `<EmotionalPatternAnalysis />` dari inline di `patterns` tab ke tab dedicated `emotional`
- Icon: `Brain`
- Label: "Emotional"

**Impact:** Clarity improvement — fitur lebih mudah ditemukan.

---

## Task 3: ARIA Accessibility untuk EmotionalPatternAnalysis

**Problem:** `PredictiveInsights.tsx` sudah punya `role="region"` dan `aria-label`, tapi `EmotionalPatternAnalysis` belum.

**Aksi:** Tambahkan:
- `role="region"` dan `aria-label` pada Card wrapper
- `role="group"` dan `aria-label` pada stats list dan insights section

**Impact:** Clarity (Accessibility) — konsistensi ARIA di seluruh analytics.

---

## Task 4: Unit Tests untuk Emotional States Utility

**Problem:** `src/lib/constants/emotional-states.ts` punya beberapa utility functions (`getEmotionalStateConfig`, `getEmotionalStateIcon`, `getEmotionalStateColor`, `getEmotionalStateIds`) yang belum di-test.

**Aksi:** Buat `src/lib/__tests__/emotional-states.test.ts` dengan ~10 test cases:
- `getEmotionalStateConfig` returns correct config
- `getEmotionalStateConfig` handles unknown/uppercase input
- `getEmotionalStateIcon` returns fallback for unknown
- `getEmotionalStateColor` returns fallback for unknown
- `getEmotionalStateIds` returns all 6 IDs
- EMOTIONAL_STATES has correct count
- Each state has required fields

**Impact:** Code Quality — meningkatkan test coverage untuk business logic.

---

## Task 5: Update JUDGING_CRITERIA_EVALUATION.md

**Aksi:**
- Dokumentasikan fix data isolation (Task 1) di Accuracy + Comprehensiveness
- Dokumentasikan tab Emotional (Task 2) di Clarity
- Dokumentasikan ARIA fix (Task 3) di Clarity
- Dokumentasikan unit tests (Task 4) di Code Quality
- Tambahkan entries baru di tabel "Perbaikan yang Sudah Dilakukan"
- Update file referensi

---

## Urutan Pengerjaan

1. Task 1 (Data Isolation Fix) — paling kritikal, 5 file edits
2. Task 2 (Emotional Tab) — UI restructure
3. Task 3 (ARIA) — accessibility
4. Task 4 (Tests) — quality assurance
5. Task 5 (Doc Update) — finalisasi

## Detail Teknis

### Task 1 — Pattern Edit (5 files)
```typescript
// BEFORE (in each file):
import { useTradeEntries } from "@/hooks/use-trade-entries";
const { data: trades = [] } = useTradeEntries();

// AFTER:
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";
const { data: trades = [] } = useModeFilteredTrades();
```

### Task 2 — TabsList addition
```tsx
<TabsTrigger value="emotional" className="gap-2">
  <Brain className="h-4 w-4" />
  Emotional
</TabsTrigger>
// ...
<TabsContent value="emotional" className="mt-0">
  <EmotionalPatternAnalysis />
</TabsContent>
```

### Task 3 — ARIA attributes
```tsx
<Card role="region" aria-label="Emotional pattern analysis showing win rate by emotional state">
```

### Task 4 — New test file
- File: `src/lib/__tests__/emotional-states.test.ts`
- ~10 test cases covering all exported functions
