

# Audit Report: Strategies Page & Backtest Page

## Executive Summary

Audit dilakukan terhadap **Strategy Management Page** (`/trading-journey`) dan **Backtest Page** (`/backtest`) beserta seluruh komponen, hook, dan service terkait. Kedua halaman ini sudah memiliki **arsitektur yang cukup baik** dengan centralized types di `src/types/strategy.ts` dan `src/types/backtest.ts`. Namun masih terdapat beberapa hardcode yang tersebar, terutama di area AI Quality Score calculation dan backtest configuration.

---

## STEP 1 — HARDCODE DETECTION

### 1.1 use-trading-strategies.ts Hook

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 73 | Default market_type fallback | Logic | `'spot'` |
| 74 | Default status fallback | Logic | `'active'` |
| 99 | Default color | Data | `'blue'` |
| 101 | Default market_type | Data | `'spot'` |
| 102 | Default min_confluences | Data | `4` |
| 103 | Default min_rr | Data | `1.5` |
| 106 | Default valid_pairs | Data | `['BTC', 'ETH', 'BNB']` |

### 1.2 use-strategy-performance.ts Hook

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 28 | Win Rate weight | Logic | `0.4` (40%) |
| 31 | Profit Factor normalization | Logic | `2.5` |
| 32 | Profit Factor weight | Logic | `0.3` (30%) |
| 36 | Consistency divisor | Logic | `20` trades |
| 36 | Consistency weight | Logic | `0.2` (20%) |
| 39 | Sample size threshold | Logic | `10` trades |
| 39 | Sample size weight | Logic | `0.1` (10%) |
| 83 | Profit factor infinity fallback | Logic | `99` |
| 118-127 | Quality score thresholds | Logic | `80`, `60`, `40`, `0` |
| 119-127 | Quality score color classes | UI | Hardcoded color strings |

### 1.3 use-strategy-context.ts Hook

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 210-214 | Scalping timeframes | Logic | `'1m'`, `'5m'` |
| 217-219 | Swing timeframes | Logic | `'4h'`, `'1d'`, `'1w'` |
| 235-237 | Session hours | Logic | `0-8 UTC`, `13-22 UTC` |
| 248-251 | Fit score calculations | Logic | `+20/-15/+5`, `+15/-20`, `+10/-5`, `+10/-20/-5` |
| 256-257 | Overall fit thresholds | Logic | `>= 70` optimal, `< 40` poor |
| 274 | Min trades for recommendations | Logic | `3` |
| 281 | Win rate threshold for best pairs | Logic | `>= 50%` |
| 393-396 | Strategy ranking volatility scores | Logic | `+15/-10` |

### 1.4 BacktestRunner.tsx Component

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 52 | Default pair | Data | `'BTC'` |
| 53 | Default period start | Data | `subMonths(new Date(), 3)` |
| 55 | Default initial capital | Data | `10000` |
| 56 | Default commission rate | Data | `0.04` (%) |
| 63 | Default buffer hours | Data | `4` |
| 285 | Commission rate hint | UI | `'Binance Futures: 0.02% maker / 0.04% taker'` |
| 334-337 | Buffer slider range | UI | `min: 0`, `max: 48`, `step: 4` |
| 355-358 | Session labels | UI | Asian/London/NY hours in text |
| 392 | Min trades warning | Logic | `30` trades |
| 408 | Default min_confluences fallback | Logic | `4` |

### 1.5 BacktestResults.tsx Component

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| - | ✅ Menggunakan centralized formatters | - | Baik |

### 1.6 BacktestComparison.tsx Component

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 37-42 | Chart colors array | UI | 4 hardcoded HSL colors |
| 44-49 | Color classes array | UI | 4 hardcoded Tailwind classes |
| 58-70 | Metrics config | Data | Metric definitions with format functions |
| 86-87 | Max selections | Logic | `4` |
| 179 | Scroll area height | UI | `200px` |
| 324 | Chart height | UI | `350px` |
| 383 | Winner summary metrics | Logic | Fixed 4 metrics: `totalReturn`, `winRate`, `sharpeRatio`, `maxDrawdown` |

### 1.7 StrategyFormDialog.tsx Component

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 24-33 | Strategy colors array | Data | 8 colors with names |
| 35-44 | Color classes mapping | UI | 8 Tailwind class mappings |
| 55 | Min confluences range | Form | `min: 1`, `max: 10`, `default: 4` |
| 56 | Min R:R range | Form | `min: 0.5`, `max: 10`, `default: 1.5` |
| 88 | Default valid pairs | Data | `['BTC', 'ETH', 'BNB']` |
| 101 | Default min_confluences | Data | `4` |
| 102 | Default min_rr | Data | `1.5` |
| 121 | Default valid pairs for edit | Data | `['BTC', 'ETH', 'BNB']` |
| 139 | Default entry rules slice | Logic | `slice(0, 4)` |

### 1.8 StrategyCard.tsx Component

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 18-27 | Color classes mapping | UI | 8 color class mappings (DUPLICATE dari StrategyFormDialog) |
| 176 | Default min_confluences | UI | `4` |
| 180 | Default min_rr | UI | `1.5` |
| 192 | Win rate threshold | UI | `>= 0.5` for color |

### 1.9 EntryRulesBuilder.tsx Component

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 22-29 | Rule type options | Data | 6 entry rule types with metadata |
| 31-34 | Indicator options | Data | 11 indicators hardcoded |
| 47 | Default mandatory threshold | Logic | `rules.length < 4` |

### 1.10 ExitRulesBuilder.tsx Component

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 21-26 | Exit type options | Data | 4 exit types with metadata |
| 28-33 | Unit options | Data | 4 units (percent, rr, atr, pips) |
| 40-45 | Default values per type | Data | TP: 2 R:R, SL: 1 R:R, etc. |
| 80-88 | Rule color mapping | UI | 4 type-to-color mappings |

### 1.11 use-youtube-strategy-import.ts Hook

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 65 | Mandatory entry rules count | Logic | `idx < 2` |
| 88 | Trailing stop unit | Data | `'percent'` |
| 98 | Market type | Data | `'futures'` |
| 102-103 | Default values | Data | `min_confluences: length or 4`, `min_rr: 1.5` |
| 109 | Tags slice limit | Logic | `slice(0, 5)` |

### 1.12 types/backtest.ts

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 139-143 | Default backtest config | Data | Capital: `10000`, Commission: `0.0004`, Slippage: `0.001` |

### 1.13 types/strategy.ts

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 63-101 | Default entry rules | Data | 6 predefined rules |
| 104-117 | Default exit rules | Data | 2 predefined rules (TP: 2 R:R, SL: 1 R:R) |
| 120-128 | Timeframe options | Data | 7 timeframes |
| 134-137 | Common pairs | Data | 20 pairs (deprecated, but still used as fallback) |

---

## STEP 2 — HARDCODE IMPACT ANALYSIS

### 2.1 AI Quality Score Calculation (use-strategy-performance.ts)

**Lokasi:** Lines 22-42

**Dampak ke Akurasi:**
- Weight distribution (40%/30%/20%/10%) tidak terdokumentasi atau configurable
- Threshold `20` trades untuk consistency score adalah arbitrary
- Normalization factor `2.5` untuk profit factor tidak jelas basisnya

**Dampak ke Trust:**
- User tidak bisa memahami bagaimana score dihitung
- Tidak ada penjelasan mengapa score rendah/tinggi

**Risiko Jangka Panjang:**
- Sulit A/B test scoring algorithms
- Tidak bisa customize per trading style

### 2.2 Strategy Context Fit Scoring (use-strategy-context.ts)

**Lokasi:** Lines 207-266

**Dampak ke Akurasi:**
- Volatility matching logic mengasumsikan scalping = high vol, swing = low vol
- Session hours hardcoded (`0-8`, `13-22` UTC) tidak mencakup overlap atau market specifics
- Fit score point system (`+20/-15`, `+10/-5`) adalah arbitrary

**Dampak ke Konsistensi:**
- Sama strategy bisa dapat score berbeda jika market context source berubah
- Tidak sync dengan AI analytics thresholds di `ai-analytics.ts`

**Risiko Jangka Panjang:**
- Strategy recommendations bisa misleading
- Tidak bisa learn from user's actual performance

### 2.3 Duplicate Color Mappings

**Lokasi:**
1. `StrategyCard.tsx` lines 18-27
2. `StrategyFormDialog.tsx` lines 35-44

**Dampak:**
- **DRY Violation**: 2 identical color mappings
- Jika update warna di satu tempat, yang lain tidak sync

**Risiko:**
- Visual inconsistency jika ada update
- Maintenance burden

### 2.4 Default Strategy Values Scattered

| Default | Locations |
|---------|-----------|
| `min_confluences: 4` | `use-trading-strategies.ts`, `StrategyFormDialog.tsx`, `StrategyCard.tsx`, `BacktestRunner.tsx`, `use-youtube-strategy-import.ts` |
| `min_rr: 1.5` | `use-trading-strategies.ts`, `StrategyFormDialog.tsx`, `StrategyCard.tsx`, `use-youtube-strategy-import.ts` |
| `valid_pairs: ['BTC', 'ETH', 'BNB']` | `use-trading-strategies.ts`, `StrategyFormDialog.tsx` |
| `color: 'blue'` | `use-trading-strategies.ts`, `StrategyFormDialog.tsx` |

**Dampak:**
- Jika default berubah, harus update 5+ files
- Risk inconsistency

### 2.5 Backtest Configuration Defaults

**Lokasi:** `BacktestRunner.tsx` + `types/backtest.ts`

**Dampak ke Akurasi:**
- Commission rate `0.04%` adalah Binance-specific (taker fee)
- Initial capital `10000` adalah arbitrary
- Period default 3 months mungkin tidak cukup untuk statistical significance

**Risiko:**
- User mungkin tidak menyadari asumsi-asumsi ini
- Multi-exchange support akan membutuhkan refactor

### 2.6 Entry/Exit Rule Options

**Lokasi:** `EntryRulesBuilder.tsx`, `ExitRulesBuilder.tsx`

**Dampak:**
- 6 entry rule types dan 4 exit types hardcoded
- 11 indicator options hardcoded
- Sulit menambah rule types baru tanpa code change

**Risiko Jangka Panjang:**
- Custom indicators tidak bisa ditambahkan user
- Multi-strategy styles tidak fleksibel

---

## STEP 3 — RESPONSIBILITY & STRUCTURE AUDIT

### 3.1 Single Responsibility Violations

| File | Violation | Severity |
|------|-----------|----------|
| `use-strategy-context.ts` | Hook berisi multiple concerns: market fit, performance, recommendations, validity check (370+ lines) | **Medium** |
| `use-strategy-performance.ts` | Scoring algorithm embedded dalam hook, bukan utility | **Low** |
| `BacktestRunner.tsx` | Contains some business logic (filter checking) tapi mostly acceptable untuk form component | **Low** |
| `BacktestComparison.tsx` | Metrics config dan winner calculation inline | **Low** |

### 3.2 DRY Violations

| Pattern | Locations | Status |
|---------|-----------|--------|
| Color classes mapping | `StrategyCard.tsx`, `StrategyFormDialog.tsx` | **Critical** - Duplicate |
| Default strategy values | 5+ files | **Medium** - Scattered |
| Timeframe-to-volatility mapping | `use-strategy-context.ts` (2 places) | **Low** |
| Min trades thresholds | `use-strategy-context.ts` (multiple: 3, 50%) | **Low** |

### 3.3 Positive Findings ✅

| Component/Hook | Status |
|----------------|--------|
| `BacktestResults.tsx` | ✅ Pure UI, uses centralized formatters |
| `StrategyStats.tsx` | ✅ Pure UI, simple aggregation |
| `types/strategy.ts` | ✅ Good centralized type definitions |
| `types/backtest.ts` | ✅ Good centralized types with DEFAULT_BACKTEST_CONFIG |
| `StrategyLeaderboard.tsx` | ✅ (assumed from export index) |
| `YouTubeStrategyImporter.tsx` | ✅ Clean component, delegates to hook |

---

## STEP 4 — REFACTOR DIRECTION (HIGH-LEVEL)

### 4.1 Create Strategy Constants File

Buat `src/lib/constants/strategy-config.ts`:

```text
STRATEGY_DEFAULTS
├── COLOR: 'blue'
├── MIN_CONFLUENCES: 4
├── MIN_RR: 1.5
├── VALID_PAIRS: ['BTC', 'ETH', 'BNB']
├── MARKET_TYPE: 'spot'
└── STATUS: 'active'

STRATEGY_COLORS (export dari sini, import di StrategyCard + StrategyFormDialog)
├── blue: { name, class }
├── green: { name, class }
└── ...

AI_QUALITY_SCORE_CONFIG
├── WEIGHTS: { winRate: 0.4, profitFactor: 0.3, consistency: 0.2, sampleSize: 0.1 }
├── PROFIT_FACTOR_NORMALIZATION: 2.5
├── CONSISTENCY_TRADE_TARGET: 20
└── SAMPLE_SIZE_MINIMUM: 10

QUALITY_SCORE_THRESHOLDS (pindahkan dari getQualityScoreLabel)
├── EXCELLENT: 80
├── GOOD: 60
├── FAIR: 40
└── NO_DATA: 0
```

### 4.2 Create Backtest Constants File

Buat `src/lib/constants/backtest-config.ts`:

```text
BACKTEST_DEFAULTS
├── INITIAL_CAPITAL: 10000
├── COMMISSION_RATE: 0.0004
├── SLIPPAGE: 0.001
├── PERIOD_MONTHS: 3
└── DEFAULT_PAIR: 'BTC'

BACKTEST_FILTERS
├── EVENT_BUFFER_HOURS: 4
├── EVENT_BUFFER_MAX: 48
├── EVENT_BUFFER_STEP: 4
└── MIN_TRADES_FOR_RELIABILITY: 30

COMPARISON_CONFIG
├── MAX_SELECTIONS: 4
├── CHART_COLORS: [...]
└── SUMMARY_METRICS: ['totalReturn', 'winRate', 'sharpeRatio', 'maxDrawdown']
```

### 4.3 Consolidate Color Mappings

**Current:** Duplicate di `StrategyCard.tsx` dan `StrategyFormDialog.tsx`

**Ideal:**
- Pindahkan ke `src/lib/constants/strategy-config.ts`
- Atau ke `src/lib/ui/strategy-colors.ts`
- Import di kedua component

### 4.4 Extract AI Quality Score Logic

**Current:** Embedded di `use-strategy-performance.ts`

**Ideal:**
```text
src/lib/scoring/
├── ai-quality-score.ts
│   ├── calculateAIQualityScore(stats): number
│   └── getQualityScoreLabel(score): QualityLabel
```

### 4.5 Consolidate Strategy Context Logic

**Current:** `use-strategy-context.ts` (370+ lines)

**Ideal:**
```text
src/lib/strategy/
├── market-fit-calculator.ts
│   ├── calculateVolatilityMatch(strategy, volatility): MatchLevel
│   ├── calculateTrendAlignment(strategy, bias): AlignmentLevel
│   └── calculateOverallFit(factors): FitResult
├── pair-recommender.ts
│   └── generatePairRecommendations(performance[]): Recommendations
```

Hook menjadi orchestrator yang memanggil utils.

### 4.6 Entry/Exit Rule Types ke Constants

**Current:** Hardcoded arrays di `EntryRulesBuilder.tsx` dan `ExitRulesBuilder.tsx`

**Ideal:**
```text
src/lib/constants/strategy-rules.ts
├── ENTRY_RULE_TYPES: EntryRuleTypeConfig[]
├── EXIT_RULE_TYPES: ExitRuleTypeConfig[]
├── INDICATOR_OPTIONS: string[]
└── UNIT_OPTIONS: UnitConfig[]
```

### 4.7 Data Flow Ideal

```text
[src/lib/constants/]
├── strategy-config.ts
├── backtest-config.ts
├── strategy-rules.ts

[Imports flow:]
use-trading-strategies.ts ← strategy-config.ts (defaults)
use-strategy-performance.ts ← strategy-config.ts (AI score config)
use-strategy-context.ts ← strategy-config.ts (thresholds), market-fit-calculator.ts
StrategyCard.tsx ← strategy-config.ts (colors)
StrategyFormDialog.tsx ← strategy-config.ts (colors, defaults)
BacktestRunner.tsx ← backtest-config.ts
BacktestComparison.tsx ← backtest-config.ts (chart colors, metrics)
EntryRulesBuilder.tsx ← strategy-rules.ts
ExitRulesBuilder.tsx ← strategy-rules.ts
```

---

## STEP 5 — RISK LEVEL ASSESSMENT

### Strategy Management Page: **LOW**

**Alasan:**
- Core CRUD operations sudah well-structured ✅
- Types sudah centralized di `types/strategy.ts` ✅
- Performance calculation logic sudah di dedicated hook ✅
- Color duplicate adalah cosmetic issue

**Issues:**
- Default values scattered tapi tidak critical
- AI Quality Score calculation perlu transparency documentation

### Backtest Page: **LOW**

**Alasan:**
- Backtest execution via edge function (logic di server) ✅
- Types sudah centralized di `types/backtest.ts` ✅
- Results component menggunakan centralized formatters ✅
- BacktestComparison sudah well-structured

**Issues:**
- Commission rate Binance-specific (perlu config untuk multi-exchange)
- Chart colors bisa dipindahkan ke constants

---

## Summary Table

| Category | Strategies Page | Backtest Page |
|----------|-----------------|---------------|
| Hardcode Count | ~35 values | ~20 values |
| DRY Violations | 1 critical (colors) | 0 critical |
| SRP Violations | 1 medium (strategy-context) | 0 major |
| Data Accuracy Risk | Low | Low |
| Centralized Constants | Partial | Partial |
| Types Centralized | ✅ Yes | ✅ Yes |

---

## Recommended Priority

### Quick Wins (Low Effort, High Impact)
1. **HIGH**: Consolidate `colorClasses` mapping ke satu file dan import di `StrategyCard` + `StrategyFormDialog`
2. **MEDIUM**: Create `STRATEGY_DEFAULTS` constants untuk centralize `min_confluences`, `min_rr`, `valid_pairs`
3. **MEDIUM**: Create `BACKTEST_DEFAULTS` constants (sudah ada partial di `types/backtest.ts`, extend dan use consistently)

### Medium-Term Refactors
4. **MEDIUM**: Extract AI Quality Score algorithm ke utility dengan configurable weights
5. **MEDIUM**: Create `strategy-rules.ts` untuk entry/exit rule types
6. **LOW**: Refactor `use-strategy-context.ts` ke smaller focused functions

---

## Final Risk Assessment

| Page | Risk Level | Justification |
|------|------------|---------------|
| **Strategy Management** | **LOW** | Well-architected, one color DRY violation, defaults scattered but not critical |
| **Backtest Page** | **LOW** | Good structure, types centralized, mostly UI hardcodes |

Kedua halaman sudah **functional dan production-ready**. Refactoring yang disarankan lebih ke arah maintainability dan scalability untuk future features (multi-exchange, custom scoring algorithms) daripada fixing critical bugs.

