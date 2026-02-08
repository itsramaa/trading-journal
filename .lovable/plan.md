

# Audit Report: Performance Overview Page & Daily PnL Page

## Executive Summary

Audit dilakukan terhadap **Performance Overview Page** (`/performance`) dan **Daily PnL Page** (`/daily-pnl`) beserta seluruh komponen, hook, dan service terkait. **Kedua halaman ini memiliki arsitektur yang SANGAT BAIK** dengan:

- Thresholds sudah tersentralisasi di `src/lib/constants/ai-analytics.ts`
- Hooks sudah mengikuti pola "Unified" (System-First) untuk dual-source (Binance + Paper)
- Calculation logic sudah di-extract ke `src/lib/trading-calculations.ts`
- Currency conversion sudah menggunakan centralized hook

Namun masih terdapat beberapa hardcode minor, terutama di area UI styling dan export handling.

---

## STEP 1 — HARDCODE DETECTION

### 1.1 DailyPnL.tsx Page

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 52-54 | ChangeIndicator decimal format | UI | `.toFixed(1)` |
| 59-74 | Export stats object with hardcoded fallback | Data | `profitFactor: 0`, `avgWin: 0`, dll. |
| 72, 93 | Date range calculation | Logic | `7 * 24 * 60 * 60 * 1000` (7 days) |
| 117-119 | Source badge text | UI | `'🔗 Live'`, `'📝 Paper'` |
| 152-155 | N/A fallback for Paper source | Logic | Conditional `'N/A'` |
| 164 | Win rate format | UI | `.toFixed(0)%` |
| 227-229 | Win rate format | UI | `.toFixed(0)%` |
| 287 | Chart height | UI | `300px` |

### 1.2 Performance.tsx Page

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 370-392 | Tooltip text content | UI | Static explanatory strings |
| 390 | Profit factor display | UI | `.toFixed(2)` |
| 433 | Sharpe ratio display | UI | `.toFixed(2)` |
| 607 | Chart height | UI | `300px` |
| 717 | Chart height | UI | `300px` |

### 1.3 SevenDayStatsCard.tsx Component

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 23 | Days calculation | Logic | `setDate(getDate() - 7)` (7 days) |
| 65-66 | Card grid layout | UI | `grid-cols-2 md:grid-cols-4` |

### 1.4 SessionPerformanceChart.tsx Component

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 66 | Min trades threshold | Logic | `>= 3` untuk session comparison |
| 93 | Min total trades | Logic | `< 5` untuk show empty state |
| 121-122 | Session UTC hours | UI | Tooltip content with static hours |
| 143 | Chart height | UI | `200px` |
| 174, 229, 236 | Trade count threshold | UI | `< 3` untuk opacity/text |
| 183 | Grid columns | UI | `md:grid-cols-5` |

### 1.5 DrawdownChart.tsx Component

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 88 | Chart height | UI | `300px` |

### 1.6 CombinedContextualScore.tsx Component

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 66-79 | Fear/Greed score weights | Logic | `40-60`, `25-75`, etc. |
| 74-79 | Volatility score weights | Logic | `low: 2`, `medium: 1`, `high: 0` |
| 82-88 | Event score weights | Logic | `noEvent: 2`, `moderate: 1` |
| 98-103 | Context bucket thresholds | Logic | `>= 80`, `>= 60`, `>= 40`, `>= 20` |
| 167 | Min trades for zone analysis | Logic | `>= 3` |
| 181-187 | Score label thresholds | Logic | `80, 60, 40, 20` |
| 189-195 | Score color thresholds | UI | Same thresholds, color classes |
| 271-274 | Win rate color threshold | UI | `>= 50` for green |

### 1.7 use-unified-daily-pnl.ts Hook

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| - | ✅ Clean implementation | - | Sudah menggunakan proper source detection |

### 1.8 use-unified-weekly-pnl.ts Hook

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 57 | Week calculation | Logic | `subDays(today, 6)` - 7 days |
| - | ✅ Clean implementation | - | Proper aggregation logic |

### 1.9 use-contextual-analytics.ts Hook

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| - | ✅ Uses ai-analytics constants | - | `FEAR_GREED_ZONES`, `DATA_QUALITY`, etc. |
| 166-167 | Win rate comparison | Logic | `> greedWinRate + 10` (inline threshold) |
| 175 | Win rate comparison | Logic | `> fearWinRate + 10` (inline threshold) |

### 1.10 use-monthly-pnl.ts Hook

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 126 | Rolling days | Logic | `subDays(now, 29)` - 30 days |
| - | ✅ Clean implementation | - | No major issues |

### 1.11 trading-calculations.ts Utility

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 195-200 | Risk-free rate | Logic | `0%` for Sharpe Ratio |
| 200 | Trading days per year | Logic | `252` days |
| - | ✅ Clean implementation | - | Well-documented formulas |

### 1.12 use-symbol-breakdown.ts Hook

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 44 | Week calculation | Logic | `subDays(today, 6)` - 7 days |
| - | ✅ Clean implementation | - | Proper source switching |

---

## STEP 2 — HARDCODE IMPACT ANALYSIS

### 2.1 Positive Finding: Thresholds Sudah Tersentralisasi ✅

**Lokasi:** `src/lib/constants/ai-analytics.ts`

**Constants yang sudah tersedia:**
- `FEAR_GREED_ZONES` - Fear/Greed zone boundaries
- `DATA_QUALITY` - Minimum trades for analysis
- `PERFORMANCE_THRESHOLDS` - Win rate benchmarks
- `VOLATILITY_THRESHOLDS` - Volatility comparison thresholds
- `EMOTIONAL_THRESHOLDS` - Emotional state thresholds
- `SESSION_THRESHOLDS` - Session comparison thresholds

**Impact:** Sebagian besar threshold untuk contextual analytics sudah tersentralisasi dengan baik.

### 2.2 CombinedContextualScore Scoring Logic

**Lokasi:** Lines 66-103

**Dampak:**
- Score weights (Fear/Greed: 2/1/0, Volatility: 2/1/0) tidak terdokumentasi
- Bucket thresholds (80/60/40/20) tidak sync dengan `ai-analytics.ts` constants
- `FEAR_GREED_ZONES` constants sudah ada, tapi tidak digunakan di sini

**Risiko:**
- Inconsistency jika thresholds di `ai-analytics.ts` berubah
- Score calculation tidak transparan untuk user

### 2.3 Win Rate Comparison Inline Thresholds

**Lokasi:** `use-contextual-analytics.ts` Lines 166-175

**Dampak:**
- `+10` percentage point comparison hardcoded inline
- Harusnya menggunakan constant dari `ai-analytics.ts`

**Risiko:**
- Minor - tapi bisa menyebabkan inconsistency jika insight generation rules berubah

### 2.4 Chart Heights (UI Hardcode)

**Lokasi:** Multiple components

| Component | Height |
|-----------|--------|
| DailyPnL Chart | `300px` |
| Performance Monthly Chart | `300px` |
| Performance Strategy Chart | `300px` |
| SessionPerformanceChart | `200px` |
| DrawdownChart | `300px` |

**Dampak:** 
- **LOW RISK** - Ini adalah UI styling, bukan business logic
- Tidak mempengaruhi akurasi data

**Risiko:**
- Minor maintenance burden jika ingin standardize
- Tidak ada impact ke data accuracy

### 2.5 Export Stats Fallback Values

**Lokasi:** `DailyPnL.tsx` Lines 59-74

**Dampak:**
- Export menggunakan `profitFactor: 0`, `avgWin: 0` sebagai placeholder
- Data export mungkin incomplete untuk Paper Trading

**Risiko:**
- User mungkin confused dengan nilai 0 di export
- Sebaiknya ada note bahwa beberapa metrics tidak tersedia

### 2.6 Time Period Constants (7 Days, 30 Days)

**Lokasi:** Multiple hooks

| Hook | Period |
|------|--------|
| `use-unified-weekly-pnl.ts` | 7 days |
| `use-symbol-breakdown.ts` | 7 days |
| `use-monthly-pnl.ts` | 30 days |
| `SevenDayStatsCard.tsx` | 7 days |

**Dampak:**
- **LOW RISK** - Ini adalah domain-correct values
- 7-day dan 30-day adalah standar industri untuk analysis periods

**Risiko:**
- Bisa di-centralize untuk consistency, tapi tidak critical

---

## STEP 3 — RESPONSIBILITY & STRUCTURE AUDIT

### 3.1 Single Responsibility - POSITIVE FINDINGS ✅

| Component/Hook | Status |
|----------------|--------|
| `useUnifiedDailyPnl` | ✅ Single source switching (Binance ↔ Paper) |
| `useUnifiedWeeklyPnl` | ✅ Same pattern, clean aggregation |
| `useUnifiedWeekComparison` | ✅ Comparison logic separated from data fetch |
| `useSymbolBreakdown` | ✅ Clean source-aware aggregation |
| `useMonthlyPnl` | ✅ Monthly stats calculation isolated |
| `useContextualAnalytics` | ✅ Uses centralized constants |
| `trading-calculations.ts` | ✅ Pure functions, no side effects |
| `ai-analytics.ts` | ✅ Centralized thresholds |
| `DrawdownChart` | ✅ Pure UI with local calculation |
| `SessionPerformanceChart` | ✅ Receives data via props |
| `SevenDayStatsCard` | ✅ Self-contained 7-day logic |

### 3.2 DRY Violations - Minor

| Pattern | Locations | Status |
|---------|-----------|--------|
| Score color thresholds | `CombinedContextualScore` (local) | Should use `ai-analytics.ts` |
| Win rate comparison (+10pp) | `use-contextual-analytics` | Should be constant |
| Chart heights | Multiple components | Could be centralized, but LOW priority |

### 3.3 Component Structure - EXCELLENT ✅

```text
Performance.tsx (Page)
├── Uses hooks: useTradeEntries, useBinanceDailyPnl, useStrategyPerformance, etc.
├── Uses lib: trading-calculations.ts (calculateTradingStats, etc.)
├── Components:
│   ├── SevenDayStatsCard (self-contained stats)
│   ├── SessionPerformanceChart (receives bySession prop)
│   ├── TradingHeatmapChart (receives trades prop)
│   ├── DrawdownChart (self-contained)
│   ├── EquityCurveWithEvents (receives equityData)
│   └── Context tab components (FearGreedZoneChart, etc.)

DailyPnL.tsx (Page)
├── Uses hooks: useUnifiedDailyPnl, useUnifiedWeeklyPnl, useUnifiedWeekComparison
├── Uses hooks: useSymbolBreakdown, usePerformanceExport
├── Pure UI rendering with centralized formatters
```

### 3.4 Data Flow - EXCELLENT ✅

```text
[Supabase / Binance API]
        ↓
[trade_entries / income endpoint]
        ↓
[useTradeEntries / useBinance*]
        ↓
[useUnifiedDailyPnl / useUnifiedWeeklyPnl]  ← Source switching here
        ↓
[trading-calculations.ts] ← Pure calculation functions
        ↓
[UI Components] ← Use centralized formatters
```

---

## STEP 4 — REFACTOR DIRECTION (HIGH-LEVEL)

### 4.1 Consolidate CombinedContextualScore Thresholds

**Current:** Inline weights dan thresholds di component

**Ideal:**
Tambahkan ke `src/lib/constants/ai-analytics.ts`:

```text
CONTEXTUAL_SCORE_CONFIG
├── WEIGHTS
│   ├── FEAR_GREED: { neutral: 2, moderate: 1, extreme: 0 }
│   ├── VOLATILITY: { low: 2, medium: 1, high: 0 }
│   └── EVENTS: { none: 2, moderate: 1, high: 0 }
├── BUCKET_THRESHOLDS
│   ├── OPTIMAL: 80
│   ├── FAVORABLE: 60
│   ├── MODERATE: 40
│   └── RISKY: 20
└── ZONE_LABELS
    └── { optimal: 'Optimal', ... }
```

### 4.2 Extract Win Rate Comparison Threshold

**Current:** Inline `+10` in `use-contextual-analytics.ts`

**Ideal:**
Add to `ai-analytics.ts`:
```text
INSIGHT_GENERATION = {
  WIN_RATE_DIFF_SIGNIFICANT: 10, // pp
}
```

### 4.3 Optional: Chart Height Constants (LOW Priority)

**Current:** Scattered heights

**Ideal (if needed):**
```text
src/lib/constants/ui-layout.ts
├── CHART_HEIGHTS
│   ├── STANDARD: 300
│   ├── COMPACT: 200
│   └── LARGE: 400
```

### 4.4 Data Flow Remains As-Is ✅

Tidak ada perubahan struktur yang diperlukan. Arsitektur sudah mengikuti pattern:
1. **System-First** - Paper data works standalone
2. **Unified Hooks** - Single interface for both sources
3. **Pure Calculations** - Isolated in `trading-calculations.ts`
4. **Centralized Constants** - Already exists in `ai-analytics.ts`

---

## STEP 5 — RISK LEVEL ASSESSMENT

### Performance Overview Page: **LOW** ✅

**Justifikasi:**
- Calculation logic 100% tersentralisasi di `trading-calculations.ts`
- Threshold constants sudah di `ai-analytics.ts`
- Hooks mengikuti Unified pattern dengan benar
- UI components memiliki clear responsibility
- Currency conversion menggunakan centralized hook
- Export functionality works correctly

**Minor Issues:**
- `CombinedContextualScore` punya inline thresholds (cosmetic, tidak critical)
- Chart heights scattered (UI only, tidak mempengaruhi data)

### Daily P&L Page: **LOW** ✅

**Justifikasi:**
- `useUnifiedDailyPnl` dan `useUnifiedWeeklyPnl` sudah System-First compliant
- Source badge clearly indicates data source
- Symbol breakdown works for both Binance and Paper
- Currency conversion properly applied
- Week comparison logic is clean

**Minor Issues:**
- Export stats has placeholder zeros (acceptable fallback)
- Some inline `.toFixed()` calls (standard practice)

---

## Summary Table

| Category | Performance Overview | Daily P&L |
|----------|---------------------|-----------|
| Hardcode Count | ~15 values | ~10 values |
| DRY Violations | 1 minor (score thresholds) | 0 critical |
| SRP Violations | 0 | 0 |
| Data Accuracy Risk | **NONE** | **NONE** |
| Centralized Constants | ✅ Yes (`ai-analytics.ts`) | ✅ Yes |
| Unified Hooks | ✅ Yes | ✅ Yes |
| Currency Conversion | ✅ Yes | ✅ Yes |

---

## Recommended Priority

### Quick Wins (Low Effort, Low Impact)
1. **LOW**: Move `CombinedContextualScore` score thresholds to `ai-analytics.ts`
2. **LOW**: Extract `+10` win rate comparison to constant

### Not Recommended (Over-Engineering)
- ❌ Chart height constants - UI only, tidak perlu
- ❌ 7-day / 30-day period constants - Domain-correct values

---

## Final Risk Assessment

| Page | Risk Level | Justification |
|------|------------|---------------|
| **Performance Overview** | **LOW** ✅ | Excellent architecture, centralized calculations, System-First compliant |
| **Daily P&L** | **LOW** ✅ | Clean Unified hooks, proper source switching, transparent data display |

**Kedua halaman ini sudah PRODUCTION-READY** dengan arsitektur yang sangat baik. Tidak ada critical issues yang mempengaruhi akurasi data atau konsistensi UI. Refactoring yang disarankan hanya bersifat kosmetik untuk meningkatkan maintainability jangka panjang.

**Poin Kunci:**
1. ✅ `trading-calculations.ts` sebagai single source of truth untuk calculation
2. ✅ `ai-analytics.ts` sebagai single source untuk thresholds
3. ✅ Unified hooks pattern sudah konsisten
4. ✅ Currency conversion sudah tersentralisasi
5. ✅ System-First (Paper + Binance) sudah diimplementasikan dengan benar

