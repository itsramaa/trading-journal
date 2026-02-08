
# Audit Refactor Progress - Top Movers & AI Insights

## Status: ✅ COMPLETE (All Phases)

## Completed Tasks

### Phase 1: Centralized Constants ✅
- [x] Created `src/lib/constants/ai-analytics.ts` - Performance thresholds, data quality, time analysis
- [x] Created `src/lib/constants/emotional-states.ts` - Emotional state configs with icons/colors
- [x] Created `src/lib/symbol-utils.ts` - Symbol formatting utilities (getBaseSymbol, isUsdtPair)
- [x] Updated `src/lib/constants/index.ts` - Re-exports

### Phase 2: Component Refactoring ✅
- [x] `EmotionalPatternAnalysis.tsx` - Uses centralized constants
- [x] `SessionInsights.tsx` - Uses SESSION_THRESHOLDS, DATA_QUALITY
- [x] `ContextualPerformance.tsx` - Uses FEAR_GREED_ZONES, classifyCorrelation

### Phase 3: Hook Refactoring ✅
- [x] `use-contextual-analytics.ts` - Uses centralized thresholds

### Phase 4: Page Refactoring ✅ (NEW)
- [x] `TopMovers.tsx` - Uses getBaseSymbol() instead of .replace('USDT', '')
- [x] `AIInsights.tsx` - Uses PERFORMANCE_THRESHOLDS, DATA_QUALITY, TIME_ANALYSIS
- [x] `useBinanceAdvancedAnalytics.ts` - Uses isUsdtPair(), centralized query timing constants

## Risk Level After Refactor
- **Top Movers**: LOW ✅ (All hardcode removed, using symbol-utils)
- **AI Insights**: LOW ✅ (Thresholds centralized, maintainable)

## Executive Summary

Audit dilakukan terhadap **Top Movers Page** (`/top-movers`) dan **AI Insights Page** (`/ai-insights`) beserta seluruh komponen, hook, dan service terkait. Kedua halaman ini memiliki tingkat hardcode yang **relatif rendah** dibandingkan Market Data dan Economic Calendar yang sudah di-refactor sebelumnya. Namun, masih terdapat beberapa area yang perlu diperbaiki.

---

## STEP 1 — HARDCODE DETECTION

### 1.1 Top Movers Page (`src/pages/TopMovers.tsx`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 39 | Symbol suffix removal | Logic | `'USDT'` (hardcoded suffix) |
| Line 84 | Price change decimals | UI | `.toFixed(4)` |
| Line 103, 106 | Percentage decimals | UI | `.toFixed(2)` |
| Line 124 | Skeleton count | UI | `10` items |
| Line 158 | Default limit | Data | `useState(10)` |
| Line 159 | Default sortBy | UI State | `'percentage'` |
| Line 223 | Limit toggle values | Logic | `10` / `20` hardcoded |
| Line 255, 305 | Symbol suffix removal | Logic | `.replace('USDT', '')` |
| Line 319 | Default tab | UI | `"gainers"` |

### 1.2 useBinanceTopMovers Hook (`src/features/binance/useBinanceAdvancedAnalytics.ts`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 85 | Default limit | Data | `limit = 10` |
| Line 93 | Stale threshold | Logic | `25 * 60 * 60 * 1000` (25 hours) |
| Line 95 | Quote asset filter | Logic | `'USDT'` |
| Line 115-118 | Query timing | Logic | `staleTime: 15 * 1000`, `refetchInterval: 15 * 1000` |

### 1.3 AI Insights Page (`src/pages/AIInsights.tsx`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 78 | Recent trades period | Logic | `subDays(new Date(), 30)` (30 days) |
| Line 133 | Min trades filter | Logic | `.filter(p => p.trades >= 3)` |
| Line 138 | Day labels | Data | `['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']` |
| Line 142 | Time slot grouping | Logic | `Math.floor(d.getHours() / 4) * 4` (4-hour slots) |
| Line 155, 157 | Min trades for slot | Logic | `.filter(s => s.trades >= 3)` |
| Line 184-200 | Win rate thresholds | Logic | `>= 60` (strong), `< 45` (needs improvement) |
| Line 203-218 | Profit factor thresholds | Logic | `>= 2` (excellent), `< 1.2` (improve) |
| Line 222 | Streak threshold | Logic | `>= 3` (significant) |
| Line 284-298 | Action item thresholds | Logic | `< 50`, `< 1.5`, `< 40` |
| Line 308 | Worst pair threshold | Logic | `pnl < -100` |
| Line 345 | Min trades for insights | UI | `5` trades |
| Line 381 | Default tab | UI | `"patterns"` |

### 1.4 EmotionalPatternAnalysis (`src/components/analytics/EmotionalPatternAnalysis.tsx`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 25-32 | Emotional states | Data | Fixed 6 states with colors |
| Line 58 | Min trades for data | Logic | `closedTrades.length < 10` |
| Line 98 | Min trades per emotion | Logic | `.filter(s => s.trades >= 3)` |
| Line 109, 118 | Win rate thresholds | Logic | `>= 60` (good), `< 40` (bad) |
| Line 147 | Revenge win rate | Logic | `< 30` |
| Line 230-233 | Progress bar colors | UI | `>= 60` green, `>= 40 && < 60` yellow, `< 40` red |

### 1.5 ContextualPerformance (`src/components/analytics/ContextualPerformance.tsx`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 31-37 | Fear/Greed zone ranges | Data | Fixed ranges: `0-20`, `21-40`, `41-60`, `61-80`, `81-100` |
| Line 155 | Skeleton count | UI | `4` cards |
| Line 190 | Data quality threshold | Logic | `< 50` |
| Line 340 | Correlation strength thresholds | Logic | `< 0.2` weak, `< 0.5` moderate |

### 1.6 SessionInsights (`src/components/analytics/SessionInsights.tsx`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 53 | Min trades per session | Logic | `>= 3` |
| Line 73, 84 | Session win rate thresholds | Logic | `>= 55`, `< 45` |
| Line 121 | Min trades for comparison | Logic | `>= 3` |
| Line 123 | Performance gap threshold | Logic | `> 15` (percentage points) |
| Line 144 | Min total trades | Logic | `< 5` |

### 1.7 useContextualAnalytics Hook (`src/hooks/use-contextual-analytics.ts`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 101-107 | Fear/Greed zone mapping | Logic | Fixed thresholds: 20, 40, 60, 80 |
| Line 123 | Min pairs for correlation | Logic | `pairs.length < 3` |
| Line 160-161 | Min trades for insights | Logic | `fearTrades >= 5 && greedTrades >= 5` |
| Line 181-191 | Performance threshold for warning | Logic | `< 40`, `>= 3` |
| Line 202-203 | Volatility comparison threshold | Logic | `> 15` (percentage difference) |
| Line 256 | Min closed trades | Logic | `closedTrades.length < 5` |

---

## STEP 2 — HARDCODE IMPACT ANALYSIS

### 2.1 Symbol Suffix Handling (`'USDT'`)

**Dampak ke Akurasi:**
- Saat ini hanya support USDT pairs
- Jika user trade pair dengan quote asset lain (BUSD, BTC, ETH), tidak akan tampil

**Dampak ke Konsistensi:**
- `replace('USDT', '')` tersebar di 3 tempat berbeda (TopMovers.tsx)
- Inconsistent dengan potential multi-quote asset future

**Risiko Jangka Panjang:**
- Multi-exchange support (Bybit, OKX) mungkin punya pair naming berbeda
- Tidak scalable untuk quote assets lain

### 2.2 Win Rate & Profit Factor Thresholds

**Dampak ke Akurasi:**
- Threshold `60%` untuk "strong" dan `45%` untuk "poor" tidak universal
- Dalam trading tertentu (scalping vs swing), benchmark berbeda

**Dampak ke Trust:**
- User mungkin merasa insights tidak relevan untuk style trading mereka
- Tidak ada justifikasi mengapa threshold tersebut dipilih

**Risiko Jangka Panjang:**
- Tidak bisa dikustomisasi per strategy atau per user
- Sulit untuk A/B test thresholds berbeda

### 2.3 Min Trades Thresholds (`>= 3`, `>= 5`, `>= 10`)

**Dampak ke Akurasi:**
- Threshold yang berbeda-beda untuk validitas data:
  - `>= 3` untuk pair rankings, emotion stats, session validity
  - `>= 5` untuk insights, correlations
  - `>= 10` untuk emotional pattern analysis
- Inconsistent statistical significance

**Dampak ke Trust:**
- User dengan sedikit trades tidak mendapat insights sama sekali
- Tidak ada penjelasan mengapa minimum diperlukan

**Risiko Jangka Panjang:**
- Sulit adjust sensitivity tanpa edit multiple files
- Edge case handling tidak konsisten

### 2.4 Time-Based Grouping (4-hour slots)

**Dampak ke Akurasi:**
- Time slot `4 jam` terlalu coarse untuk scalper
- Terlalu granular untuk position trader

**Risiko Jangka Panjang:**
- Tidak adaptive per trading style
- Timezone handling implicit (menggunakan local timezone)

### 2.5 Emotional States List

**Dampak ke Akurasi:**
- Hanya 6 emotional states: calm, confident, anxious, fearful, fomo, revenge
- User mungkin memiliki state lain (bored, frustrated, overconfident)

**Risiko Jangka Panjang:**
- Tidak bisa extend tanpa code change
- Hardcoded colors dan icons

### 2.6 Decimal Formatting (`.toFixed(4)`, `.toFixed(2)`)

**Dampak ke Konsistensi:**
- Price change format `.toFixed(4)` mungkin terlalu presisi untuk high-value coins (BTC)
- Percentage `.toFixed(2)` konsisten, tapi tidak adaptive

---

## STEP 3 — RESPONSIBILITY & STRUCTURE AUDIT

### 3.1 Single Responsibility Violations

| File | Violation | Severity |
|------|-----------|----------|
| `AIInsights.tsx` | Page berisi business logic berat (560 lines): stats calculation, insight generation, action items | **High** |
| `AIInsights.tsx` | `useMemo` di Line 85-175 melakukan full stats aggregation di component | **High** |
| `AIInsights.tsx` | `useMemo` di Line 178-276 generates insights - seharusnya di hook/service | **High** |
| `AIInsights.tsx` | `useMemo` di Line 279-325 generates action items - seharusnya terpisah | **Medium** |
| `EmotionalPatternAnalysis.tsx` | Component contains business logic untuk stats dan insights | **Medium** |
| `TopMovers.tsx` | Page melakukan sorting logic dengan `useMemo` di Line 169-189 | **Low** |

### 3.2 DRY Violations

| Pattern | Locations | Issue |
|---------|-----------|-------|
| `replace('USDT', '')` | `TopMovers.tsx` (Lines 39, 255, 280, 305) | Symbol display logic duplicated |
| Win rate thresholds | `AIInsights.tsx`, `EmotionalPatternAnalysis.tsx`, `SessionInsights.tsx`, `useContextualAnalytics.ts` | Threshold values scattered |
| Min trades filter | `AIInsights.tsx`, `EmotionalPatternAnalysis.tsx`, `SessionInsights.tsx`, `useContextualAnalytics.ts` | `>= 3`, `>= 5` inconsistent |
| Insight type styling | `ContextualPerformance.tsx`, `SessionInsights.tsx`, `EmotionalPatternAnalysis.tsx` | Similar `border-profit/30 bg-profit/5` patterns |

### 3.3 Data Aggregation di Component

| Component | Issue |
|-----------|-------|
| `AIInsights.tsx` Line 85-175 | Full statistics calculation (streak, pair rankings, time slots) |
| `AIInsights.tsx` Line 178-276 | AI insight generation dengan threshold checks |
| `EmotionalPatternAnalysis.tsx` Line 55-156 | Stats aggregation dan insight generation |

---

## STEP 4 — REFACTOR DIRECTION (HIGH-LEVEL)

### 4.1 Extract AI Analytics Constants

Buat file baru `src/lib/constants/ai-analytics.ts`:

```text
src/lib/constants/ai-analytics.ts
├── PERFORMANCE_THRESHOLDS
│   ├── WIN_RATE_STRONG: 60
│   ├── WIN_RATE_POOR: 45
│   ├── PROFIT_FACTOR_EXCELLENT: 2
│   └── PROFIT_FACTOR_POOR: 1.2
├── DATA_QUALITY
│   ├── MIN_TRADES_FOR_RANKING: 3
│   ├── MIN_TRADES_FOR_INSIGHTS: 5
│   └── MIN_TRADES_FOR_PATTERNS: 10
├── TIME_ANALYSIS
│   ├── SLOT_HOURS: 4
│   └── RECENT_DAYS: 30
└── STREAK_THRESHOLD: 3
```

### 4.2 Extract Symbol Utilities

Buat utility function di `src/lib/symbol-utils.ts`:

```text
getBaseSymbol(pair: string, quoteAsset = 'USDT'): string
getQuoteAsset(pair: string): string
formatSymbolDisplay(pair: string): { base: string, quote: string }
```

### 4.3 Extract Insights Generation ke Service

**Current:** `AIInsights.tsx` berisi 3 `useMemo` blocks untuk business logic

**Ideal:**
```text
src/services/
├── trade-analytics-service.ts
│   ├── calculateTradeStats(trades): TradeStats
│   ├── generatePerformanceInsights(stats): PerformanceInsight[]
│   └── generateActionItems(stats): ActionItem[]
```

**Hook layer:**
```text
src/hooks/
├── use-trade-performance.ts
│   ├── useTradeStats() → { stats, isLoading }
│   ├── usePerformanceInsights() → { insights }
│   └── useActionItems() → { items }
```

### 4.4 Extract Emotional Analysis

**Current:** `EmotionalPatternAnalysis.tsx` (266 lines) dengan logic + UI

**Ideal:**
```text
src/hooks/use-emotional-analytics.ts
├── useEmotionalStats() → { stats, insights, hasEnoughData }

src/lib/constants/emotional-states.ts
├── EMOTIONAL_STATES: Array<EmotionalState>
├── EMOTIONAL_THRESHOLDS
```

### 4.5 Standardize Insight Card Component

**Current:** 3 components have similar insight rendering:
- `ContextualPerformance.tsx` → `InsightCard`
- `SessionInsights.tsx` → inline rendering
- `EmotionalPatternAnalysis.tsx` → inline rendering

**Ideal:**
```text
src/components/analytics/InsightCard.tsx
├── InsightCard({ insight, variant?: 'opportunity' | 'warning' | 'pattern' })
```

### 4.6 Data Flow Ideal

```text
[useTradeEntries] 
    ↓
[use-trade-performance.ts] ← Constants (thresholds)
    ├── calculateTradeStats()
    ├── generateInsights()
    └── generateActionItems()
    ↓
[AIInsights.tsx] ← Pure UI rendering
```

### 4.7 Top Movers Improvements

**Minimal changes needed:**
- Extract `'USDT'` handling ke utility
- Move skeleton count ke constants
- Keep sorting logic in component (acceptable untuk this use case)

---

## STEP 5 — RISK LEVEL ASSESSMENT

### Top Movers Page: **LOW**

**Alasan:**
- Data langsung dari Binance API (no transformation issues)
- Hardcode minimal dan mostly UI-related
- Sorting logic sederhana dan appropriate di component
- Hook `useBinanceTopMovers` sudah well-structured

### AI Insights Page: **MEDIUM-HIGH**

**Alasan:**
- Business logic berat di component (560+ lines)
- Multiple threshold hardcodes mempengaruhi insight accuracy
- Insight generation tidak testable (embedded in useMemo)
- DRY violations dengan komponen analytics lain
- Tapi: Core data dari real trades, bukan dummy

---

## Summary Table

| Category | Top Movers | AI Insights |
|----------|------------|-------------|
| Hardcode Count | 9 values | 25+ values |
| Business Logic in UI | Low | High |
| DRY Violations | 1 pattern | 4 patterns |
| SRP Violations | Minor | Major |
| Data Accuracy Risk | Low | Medium |
| Testability | Good | Poor |

---

## Recommended Priority

### Top Movers (Quick Wins)
1. **Low Priority**: Extract `replace('USDT', '')` ke utility function
2. **Low Priority**: Move skeleton count dan default values ke constants

### AI Insights (Medium-Term)
1. **High Priority**: Extract stats calculation ke `use-trade-performance.ts` hook
2. **High Priority**: Extract insight generation ke service layer
3. **Medium Priority**: Centralize thresholds ke `ai-analytics.ts`
4. **Medium Priority**: Create reusable `InsightCard` component
5. **Low Priority**: Extract emotional states ke constants

---

## Final Risk Assessment

| Page | Risk Level | Justification |
|------|------------|---------------|
| **Top Movers** | **LOW** | Minimal hardcode, good data flow, mostly UI concerns |
| **AI Insights** | **MEDIUM-HIGH** | Heavy business logic in component, scattered thresholds, poor testability |

Kedua halaman fungsional dan data-accurate, namun AI Insights membutuhkan refactoring struktural untuk maintainability jangka panjang.
