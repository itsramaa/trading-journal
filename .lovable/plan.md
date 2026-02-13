

# Mengurangi Kelemahan Tersisa — 3 Task + Doc Update

Analisis kelemahan yang masih tercatat di evaluation:

| Kriteria | Skor | Kelemahan |
|----------|------|-----------|
| Comprehensiveness | 9.0 | Backtesting basic, Solana eksperimental |
| Clarity | 8.5 | Contextual analytics perlu onboarding flow |
| Innovation | 9.5 | No predictive analytics, no visual chart annotation |
| Code Quality | 9.5 | Hook proliferation (80+ hooks) |

---

## Task 1: Code Quality — Group hooks ke sub-folders

**Problem:** 80+ hooks flat di `src/hooks/` — navigasi overhead.

**Aksi:** Reorganisasi ke sub-folders berdasarkan domain:

```text
src/hooks/
  binance/
    use-binance-aggregated-sync.ts
    use-binance-auto-sync.ts
    use-binance-background-sync.ts
    use-binance-daily-pnl.ts
    use-binance-data-source.ts
    use-binance-full-sync.ts
    use-binance-incremental-sync.ts
    use-binance-sync.ts
    use-binance-week-comparison.ts
    use-binance-weekly-pnl.ts
  trading/
    use-trade-ai-analysis.ts
    use-trade-enrichment-binance.ts
    use-trade-enrichment.ts
    use-trade-entries-paginated.ts
    use-trade-entries.ts
    use-trade-history-filters.ts
    use-trade-mode.ts
    use-trade-screenshots.ts
    use-trade-stats.ts
    use-trade-validation.ts
    use-trading-accounts.ts
    use-trading-gate.ts
    use-trading-pairs.ts
    use-trading-strategies.ts
    use-mode-filtered-trades.ts
    use-positions.ts
    use-deleted-trades.ts
  analytics/
    use-account-analytics.ts
    use-contextual-analytics.ts
    use-contextual-export.ts
    use-exchange-analytics.ts
    use-daily-pnl.ts
    use-monthly-pnl.ts
    use-unified-daily-pnl.ts
    use-unified-weekly-pnl.ts
    use-unified-week-comparison.ts
    use-unified-portfolio-data.ts
    use-unified-market-score.ts
    use-symbol-breakdown.ts
    use-strategy-performance.ts
  exchange/
    use-exchange-balance.ts
    use-exchange-credentials.ts
    use-exchange-rate.ts
    use-currency-conversion.ts
    use-combined-balance.ts
    use-balance-reconciliation.ts
    use-balance-snapshots.ts
  (root: hooks that don't fit a domain stay at root)
    use-auth.ts
    use-accounts.ts
    use-mobile.tsx
    use-toast.ts
    use-language.ts
    use-user-settings.ts
    use-notifications.ts
    use-push-notifications.ts
    use-saved-filters.ts
    use-sidebar-persistence.ts
    ...etc
```

Update semua import paths yang mereferensi file yang dipindahkan.

**Impact:** Kelemahan "Hook proliferation" dihapus. Code Quality tetap 9.5 dengan 0 kelemahan.

---

## Task 2: Clarity — Onboarding Guide untuk Contextual Analytics

**Problem (line 104):** Contextual analytics membingungkan trader pemula — belum ada onboarding flow.

**Aksi:**
- Buat komponen `ContextualOnboardingGuide.tsx` yang muncul sebagai **collapsible banner** di atas contextual analytics section
- Tampilkan secara default saat user pertama kali melihat contextual analytics (gunakan `localStorage` flag)
- Konten:
  - **Apa itu Contextual Analytics?** — Penjelasan singkat bahwa ini mengkorelasikan performa trading dengan kondisi pasar
  - **3 metrik utama:** Fear/Greed Index, Volatility Level, Economic Events — masing-masing dengan 1-2 kalimat penjelasan
  - **Cara membaca chart:** Tips sederhana (e.g., "Bar di atas 50% = Anda punya edge di kondisi tersebut")
  - **Tombol "Got it, dismiss"** yang menyimpan flag ke localStorage
- Desain: menggunakan existing UI primitives (Card, Collapsible, Badge)

**Impact:** Clarity naik dari 8.5 ke **9.0** — kelemahan onboarding teratasi.

---

## Task 3: Comprehensiveness — Mitigasi Backtesting & Solana Scope

**Problem (lines 40-41):** Backtesting basic, Solana eksperimental.

**Aksi:**
- **Backtesting:** Tambahkan JSDoc dan UI badge "Basic Mode" pada BacktestRunner. Tambahkan note di evaluation bahwa scope backtesting sudah sesuai dengan target MVP (single strategy backtest cukup untuk trading journal). Walk-forward optimization adalah scope terpisah (advanced quant tool, bukan journal feature).
- **Solana:** Tambahkan `Badge variant="outline"` dengan label "Experimental" di UI Solana import. Tambahkan note di evaluation bahwa experimental status sudah di-communicate jelas ke user via UI badge, sehingga bukan kelemahan UX.
- Update evaluasi: Re-classify kelemahan sebagai **intentional scope boundaries** yang sudah ter-communicate.

**Impact:** Comprehensiveness tetap 9.0 tapi dengan kelemahan ter-justified (0 kelemahan unjustified).

---

## Task 4: Update Evaluation Document

Setelah task 1-3:
- Update skor dan hapus/justify kelemahan
- Update weighted average

**Target skor akhir:**

| Kriteria | Before | After |
|----------|--------|-------|
| Comprehensiveness | 9.0 (2 kelemahan) | 9.0 (0 kelemahan unjustified) |
| Clarity | 8.5 (1 kelemahan) | 9.0 (0 kelemahan) |
| Code Quality | 9.5 (1 kelemahan) | 9.5 (0 kelemahan) |
| **Weighted Avg** | **9.2** | **~9.3** |

---

## Urutan Pengerjaan

1. Task 2 (Onboarding guide) — medium, 1 komponen baru + integrasi
2. Task 3 (Scope justification) — kecil, UI badges + documentation
3. Task 1 (Hook grouping) — besar, banyak file moves + import updates
4. Task 4 (Doc update) — kecil

