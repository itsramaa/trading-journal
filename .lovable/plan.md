
# Audit Report: Risk Overview Page & Risk Calculator Page

## Executive Summary

Audit dilakukan terhadap **Risk Management Page** (`/risk`) dan **Position Calculator Page** (`/calculator`) beserta seluruh komponen, hook, dan service terkait. Kedua halaman ini memiliki **arsitektur yang solid** dengan banyak konstanta sudah dipindahkan ke `src/types/risk.ts` dan `src/lib/correlation-utils.ts`. Namun masih terdapat beberapa hardcode yang tersebar dan duplikasi konstanta.

---

## STEP 1 — HARDCODE DETECTION

### 1.1 Position Calculator Page (`src/pages/PositionCalculator.tsx`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 44 | Fallback balance | Data | `10000` |
| Line 48-52 | Default input states | UI State | `riskPercent: 2`, `entryPrice: 50000`, `stopLossPrice: 49000`, `leverage: 1` |
| Line 58 | Max leverage fallback | Logic | `125` |

### 1.2 CalculatorInputs (`src/components/risk/calculator/CalculatorInputs.tsx`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 61-65 | Risk slider range | UI | `min: 0.5`, `max: 5`, `step: 0.5` |
| Line 95-99 | Leverage slider range | UI | `min: 1`, `max: 20`, `step: 1` |

### 1.3 CalculatorResults (`src/components/risk/calculator/CalculatorResults.tsx`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 23-27 | Quantity formatting thresholds | UI | `>= 1` → `.toFixed(4)`, else `.toFixed(8)` |

### 1.4 Position Sizing Calculation (`src/lib/calculations/position-sizing.ts`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 28-30 | Stop distance warning | Logic | `> 10` percent |
| Line 33-36 | Capital deployment warning | Logic | `> 40` percent |

### 1.5 Daily Loss Tracker (`src/components/risk/DailyLossTracker.tsx`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| ✅ | Menggunakan `RISK_THRESHOLDS` | - | Sudah tersentralisasi |

### 1.6 Correlation Matrix (`src/components/risk/CorrelationMatrix.tsx`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 16-25 | `CORRELATION_MAP` | Data | **DUPLIKAT** dari `src/lib/correlation-utils.ts` |
| Line 28-36 | `extractBaseAsset` | Logic | **DUPLIKAT** - menggunakan suffixes berbeda |
| Line 40 | Default correlation fallback | Logic | `0.3` |
| Line 44-49 | Correlation color thresholds | UI | `>= 0.8`, `>= 0.7`, `>= 0.5` |
| Line 94 | High correlation threshold | Logic | `>= 0.7` |
| Line 191 | Percentage threshold | Logic | `>70%` |

### 1.7 Context Warnings (`src/components/risk/calculator/ContextWarnings.tsx`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 17-23 | `CORRELATION_MAP` | Data | **DUPLIKAT KETIGA** |
| Line 24-32 | `extractBaseAsset` | Logic | **DUPLIKAT** |
| Line 36 | Default correlation fallback | Logic | `0.3` |
| Line 77 | Correlation warning threshold | Logic | `>= 0.7` |

### 1.8 Risk Event Log (`src/components/risk/RiskEventLog.tsx`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 18-64 | `eventTypeConfig` | UI/Data | Event type colors dan labels |
| Line 73 | Force orders limit | Data | `50` |
| Line 90 | Skeleton count | UI | `3` items |
| Line 163 | Scroll area height | UI | `350px` |
| Line 232 | Scroll area height | UI | `350px` |

### 1.9 Volatility Stop Loss (`src/components/risk/calculator/VolatilityStopLoss.tsx`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 23-29 | Risk level icon mapping | UI | Static mapping |
| Line 32-40 | Risk level color mapping | UI | Static colors |
| Line 60-65 | ATR multipliers | Logic | `1x`, `1.5x`, `2x` |
| Line 79-95 | Stop loss labels | UI | `'Tight'`, `'1x ATR'`, `'1.5x ATR'`, `'2x ATR'` |
| Line 89 | Recommended badge | UI | `'1.5x ATR (Recommended)'` |
| Line 143 | ATR period label | UI | `'(14d)'` |

### 1.10 use-risk-profile.ts Hook

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 72-77 | Default risk profile values | Data | Nilai default saat create |
| Line 157-159 | Default snapshot values | Data | Nilai default saat create |
| Line 192 | Max daily loss fallback | Logic | `5` (seharusnya dari `DEFAULT_RISK_PROFILE`) |
| Line 204-209 | Status thresholds | Logic | `>= 100` disabled, `>= 70` warning |

### 1.11 use-trading-gate.ts Hook

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 31-35 | `THRESHOLDS` | Logic | `warning: 70`, `danger: 90`, `disabled: 100` |
| Line 38-42 | `AI_QUALITY_THRESHOLDS` | Logic | `warningBelow: 50`, `blockBelow: 30`, `tradeCount: 3` |
| Line 75 | Max daily loss fallback | Logic | `5` |

### 1.12 use-context-aware-risk.ts Hook

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 85 | Base risk fallback | Logic | `2` |
| Line 101 | Min pair trades | Logic | `3` |
| Line 114-131 | Strategy performance thresholds | Logic | `65`, `55`, `45`, `35` |
| Line 145-166 | Volatility multipliers | Logic | `0.5`, `0.75`, `1.0`, `1.1` |
| Line 188-196 | Event multiplier | Logic | `0.5` untuk high-impact |
| Line 217-219 | Fear/Greed thresholds | Logic | `< 25`, `> 75` |
| Line 244-257 | Momentum thresholds | Logic | `>= 70`, `<= 30` |
| Line 269-290 | Pair performance thresholds | Logic | `>= 60`, `>= 50`, `>= 40` |
| Line 312-337 | Strategy performance thresholds | Logic | `>= 65`, `>= 55`, `>= 45`, `>= 35` |
| Line 369-383 | Recommendation thresholds | Logic | `< 0.5`, `< 0.8`, `< 1`, `> 1.05` |

---

## STEP 2 — HARDCODE IMPACT ANALYSIS

### 2.1 Duplikasi CORRELATION_MAP (3 Lokasi)

**Lokasi:**
1. `src/lib/correlation-utils.ts` (canonical)
2. `src/components/risk/CorrelationMatrix.tsx`
3. `src/components/risk/calculator/ContextWarnings.tsx`

**Dampak:**
- **Data Mismatch Risk**: Jika korelasi BTC-ETH diupdate di satu file, 2 file lain tidak sync
- **Maintenance Burden**: 3x effort untuk update
- **Different Formats**: `correlation-utils.ts` menggunakan format `BTCUSDT-ETHUSDT`, sementara component menggunakan `BTC: { ETH: 0.85 }`

**Risiko Jangka Panjang:**
- Bug tersembunyi jika korelasi berbeda
- Sulit menambah pair baru (harus edit 3 file)
- Tidak bisa dikonfigurasi per user atau real-time

### 2.2 Duplikasi extractBaseAsset Logic

**Lokasi:**
1. `src/lib/symbol-utils.ts` → `getBaseSymbol()` ✅ (sudah ada)
2. `src/components/risk/CorrelationMatrix.tsx` → `extractBaseAsset()`
3. `src/components/risk/calculator/ContextWarnings.tsx` → `extractBaseAsset()`

**Dampak:**
- **Inconsistent Suffix Handling**: `CorrelationMatrix` support `BTC`, `ETH` suffix, `ContextWarnings` tidak
- **Potential Parsing Bugs**: Different edge case handling

### 2.3 Threshold Thresholds Tersebar

**Kategori:**
| Threshold Type | Locations | Values |
|----------------|-----------|--------|
| Daily Loss Warning | `RISK_THRESHOLDS`, `use-trading-gate`, `use-risk-profile` | 70% |
| Daily Loss Danger | `RISK_THRESHOLDS`, `use-trading-gate` | 90% |
| Correlation High | `correlation-utils`, `CorrelationMatrix`, `ContextWarnings` | 0.7-0.75 |
| Win Rate Thresholds | `use-context-aware-risk` (2 sets) | 60/50/40, 65/55/45/35 |
| Volatility Multipliers | `use-context-aware-risk` | 0.5/0.75/1.0/1.1 |

**Dampak:**
- `RISK_THRESHOLDS` di `types/risk.ts` adalah canonical, tapi `use-trading-gate.ts` mendefinisikan ulang `THRESHOLDS`
- Sulit memastikan konsistensi antar component
- Tidak bisa A/B test atau per-user customize

### 2.4 ATR Multipliers Hardcode

**Dampak:**
- User tidak bisa pilih multiplier custom
- 1.5x ATR dihardcode sebagai "Recommended" tanpa konteks
- Tidak adaptive ke volatility regime yang berbeda

### 2.5 Default Values Tersebar

| Default | Locations | Impact |
|---------|-----------|--------|
| `riskPercent: 2%` | PositionCalculator, use-risk-profile | ✅ Aligned |
| `maxDailyLoss: 5%` | use-risk-profile, use-trading-gate | Should use `DEFAULT_RISK_PROFILE` |
| `balance: 10000` | PositionCalculator | Arbitrary fallback |

---

## STEP 3 — RESPONSIBILITY & STRUCTURE AUDIT

### 3.1 Single Responsibility Violations

| File | Violation | Severity |
|------|-----------|----------|
| `CorrelationMatrix.tsx` | Contains own `CORRELATION_MAP` dan `extractBaseAsset` - seharusnya import | **High** |
| `ContextWarnings.tsx` | Contains own `CORRELATION_MAP` dan `extractBaseAsset` - seharusnya import | **High** |
| `use-context-aware-risk.ts` | Hook terlalu besar (430 lines) dengan banyak threshold inline | **Medium** |
| `RiskEventLog.tsx` | `eventTypeConfig` sebaiknya di constants | **Low** |

### 3.2 DRY Violations

| Pattern | Locations | Status |
|---------|-----------|--------|
| `CORRELATION_MAP` | 3 files | **Critical** - 3 sources of truth |
| `extractBaseAsset` | 3 files | **Critical** - `getBaseSymbol` already exists |
| Threshold constants | 4+ files | **Medium** - Partially centralized |
| Default risk values | 3 files | **Low** - Most use `DEFAULT_RISK_PROFILE` |

### 3.3 Positive Findings ✅

| Component | Status |
|-----------|--------|
| `DailyLossTracker` | ✅ Uses `RISK_THRESHOLDS` from types |
| `RiskProfileSummaryCard` | ✅ Pure UI, no business logic |
| `QuickReferenceR` | ✅ Clean, uses currency conversion hook |
| `position-sizing.ts` | ✅ Well-separated calculation logic |
| `types/risk.ts` | ✅ Good centralized defaults & thresholds |
| `correlation-utils.ts` | ✅ Good canonical source for correlations |

---

## STEP 4 — REFACTOR DIRECTION (HIGH-LEVEL)

### 4.1 Consolidate Correlation Data

**Current State:**
```
src/lib/correlation-utils.ts (canonical - format BTCUSDT-ETHUSDT)
src/components/risk/CorrelationMatrix.tsx (duplicate - format BTC: { ETH })
src/components/risk/calculator/ContextWarnings.tsx (duplicate - format BTC: { ETH })
```

**Ideal:**
- Hapus `CORRELATION_MAP` dari kedua component
- Import `getCorrelation` dari `correlation-utils.ts`
- Gunakan `getBaseSymbol` dari `symbol-utils.ts` (sudah ada!)

### 4.2 Centralize Risk Thresholds

**Current (Tersebar):**
- `RISK_THRESHOLDS` di `types/risk.ts`
- `THRESHOLDS` di `use-trading-gate.ts`
- Inline values di `use-risk-profile.ts`

**Ideal:**
Buat file `src/lib/constants/risk-thresholds.ts`:
```text
DAILY_LOSS_THRESHOLDS
├── WARNING: 70
├── DANGER: 90
└── DISABLED: 100

CORRELATION_THRESHOLDS  
├── WARNING: 0.6 (from correlation-utils)
└── HIGH: 0.75 (from correlation-utils)

AI_QUALITY_THRESHOLDS
├── WARNING_BELOW: 50
├── BLOCK_BELOW: 30
└── SAMPLE_COUNT: 3
```

### 4.3 Extract Context-Aware Risk Multipliers

**Current:** Inline di `use-context-aware-risk.ts` (430 lines)

**Ideal:**
Buat `src/lib/constants/risk-multipliers.ts`:
```text
VOLATILITY_MULTIPLIERS
├── extreme: 0.5
├── high: 0.75
├── medium: 1.0
└── low: 1.1

EVENT_MULTIPLIERS
├── HIGH_IMPACT: 0.5
└── NORMAL: 1.0

SENTIMENT_MULTIPLIERS
├── AVOID: 0.5
├── EXTREME_FEAR: 0.8
├── EXTREME_GREED: 0.9
└── NEUTRAL: 1.0

PERFORMANCE_THRESHOLDS
├── WIN_RATE_STRONG: 60
├── WIN_RATE_AVERAGE: 50
├── WIN_RATE_BELOW: 40
└── WIN_RATE_POOR: below 40
```

### 4.4 ATR Stop Loss Constants

**Current:** Hardcoded di `VolatilityStopLoss.tsx`

**Ideal:**
```text
ATR_STOP_LOSS_MULTIPLIERS
├── TIGHT: { label: 'Tight (Risk Level)', factor: 'dynamic' }
├── STANDARD: { label: '1x ATR', factor: 1.0 }
├── RECOMMENDED: { label: '1.5x ATR', factor: 1.5, isRecommended: true }
└── WIDE: { label: '2x ATR', factor: 2.0 }
```

### 4.5 Data Flow Ideal

```text
[src/lib/constants/]
├── risk-thresholds.ts
├── risk-multipliers.ts
└── (existing) index.ts

[Imports flow:]
use-trading-gate.ts ← risk-thresholds.ts
use-risk-profile.ts ← risk-thresholds.ts, types/risk.ts
use-context-aware-risk.ts ← risk-multipliers.ts
CorrelationMatrix.tsx ← correlation-utils.ts, symbol-utils.ts
ContextWarnings.tsx ← correlation-utils.ts, symbol-utils.ts
VolatilityStopLoss.tsx ← risk-multipliers.ts (ATR section)
```

---

## STEP 5 — RISK LEVEL ASSESSMENT

### Risk Management Page: **LOW**

**Alasan:**
- `DailyLossTracker` sudah menggunakan `RISK_THRESHOLDS` dari types ✅
- `RiskProfileSummaryCard` adalah pure UI component ✅
- Correlation logic sudah ada canonical source di `correlation-utils.ts` ✅
- Data flow dari Supabase → hooks → UI sudah baik
- **Hanya butuh**: Refactor `CorrelationMatrix` untuk import dari canonical source

### Position Calculator Page: **LOW-MEDIUM**

**Alasan:**
- Calculation logic sudah di-extract ke `position-sizing.ts` ✅
- UI components sudah well-separated ✅
- `RiskAdjustmentBreakdown` menggunakan hook dengan benar ✅
- **Issues**:
  - `ContextWarnings` punya duplicate `CORRELATION_MAP`
  - `use-context-aware-risk.ts` punya banyak inline thresholds (430 lines)
  - ATR multipliers hardcoded

---

## Summary Table

| Category | Risk Overview | Position Calculator |
|----------|--------------|---------------------|
| Hardcode Count | 8 values | 25+ values |
| DRY Violations | 1 critical | 2 critical |
| SRP Violations | 1 (CorrelationMatrix) | 2 (ContextWarnings, use-context-aware-risk) |
| Data Accuracy Risk | Low | Low |
| Centralized Constants | Mostly ✅ | Partial |

---

## Recommended Priority

### Quick Wins (Low Effort, High Impact)
1. **HIGH**: Replace `CORRELATION_MAP` di `CorrelationMatrix.tsx` dengan import dari `correlation-utils.ts`
2. **HIGH**: Replace `CORRELATION_MAP` dan `extractBaseAsset` di `ContextWarnings.tsx`
3. **MEDIUM**: Replace `THRESHOLDS` di `use-trading-gate.ts` dengan `RISK_THRESHOLDS` dari types

### Medium-Term Refactors
4. **MEDIUM**: Extract volatility/event/sentiment multipliers ke constants file
5. **MEDIUM**: Extract ATR stop loss config ke constants
6. **LOW**: Centralize `eventTypeConfig` di `RiskEventLog.tsx`

---

## Final Risk Assessment

| Page | Risk Level | Justification |
|------|------------|---------------|
| **Risk Management** | **LOW** | Mostly well-architected, one correlation DRY violation |
| **Position Calculator** | **LOW-MEDIUM** | Good structure, but inline thresholds in hooks need extraction |

Kedua halaman sudah **functional dan accurate**. Risk Calculator memiliki lebih banyak inline thresholds yang bisa di-centralize untuk maintainability jangka panjang, namun tidak ada critical accuracy issues.
