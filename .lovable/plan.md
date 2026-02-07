
# Plan: PreflightResultCard Component + Trade Entry Wizard Integration

## Problem Statement

Sistem AI Pre-flight sudah memiliki:
- Edge Function (`supabase/functions/ai-preflight/index.ts`) - 5-layer analysis engine
- Hook (`src/features/ai/useAIPreflight.ts`) - `useHistoricalTrades()` & `useAIPreflight()` 
- Types (`src/types/preflight.ts`) - Complete type definitions

**Yang belum ada:**
1. Komponen UI visual untuk menampilkan hasil 5-layer analysis
2. Integrasi hook ke SetupStep dengan data trade history nyata

---

## Component Architecture

```text
PreflightResultCard
├── VerdictBanner (PROCEED/CAUTION/SKIP dengan warna berbeda)
├── CoreMetrics (Expectancy, Confidence, Context Similarity)
├── LayerAnalysisAccordion
│   ├── Layer 1: Data Sufficiency
│   ├── Layer 2: Edge Validation
│   ├── Layer 3: Context Similarity
│   ├── Layer 4: Stability & Risk
│   └── Layer 5: Bias Detection
└── FlagsDisplay (Risk Flags + Bias Flags dengan badge)
```

---

## File Changes

### 1. New File: `src/components/trade/entry/PreflightResultCard.tsx`

**Purpose:** Visual display of AI Pre-flight analysis result

**Features:**
- Verdict Banner dengan ikon dan warna (PROCEED=green, CAUTION=yellow, SKIP=red)
- Core metrics: Expectancy (R), Confidence (%), Context Similarity (0-1)
- Collapsible accordion untuk detail 5 layer
- Progress bars untuk visual representation
- Badge list untuk Risk Flags dan Bias Flags
- Reasoning display dengan data-driven explanation

**Key UI Elements:**
```text
┌─────────────────────────────────────────────────┐
│ [!] CAUTION                        57% Confidence│
│────────────────────────────────────────────────│
│  Expectancy: +0.18R (Weak Edge)                  │
│  Context Match: 62%                              │
│────────────────────────────────────────────────│
│ ▼ Layer 1: Data Sufficiency ✓ PASS              │
│   ├─ Total Trades: 45                            │
│   ├─ Recent (60d): 18                            │
│   └─ Max Gap: 5 days                             │
│────────────────────────────────────────────────│
│ ▼ Layer 2: Edge Validation ⚠ WEAK               │
│   ├─ Win Rate: 58%                               │
│   ├─ Avg Win: 1.8R | Avg Loss: 1.2R              │
│   └─ Profit Factor: 1.32                         │
│────────────────────────────────────────────────│
│ ... more layers ...                              │
│────────────────────────────────────────────────│
│ ⚠ Flags: [SESSION_DEPENDENT] [HIGH_VOLATILITY]  │
│────────────────────────────────────────────────│
│ Reasoning: Edge positif namun lemah. Setup      │
│ serupa hanya konsisten di NY session.            │
└─────────────────────────────────────────────────┘
```

---

### 2. Modify: `src/components/trade/entry/SetupStep.tsx`

**Changes:**
1. Import `useHistoricalTrades` dan `buildMarketSnapshot` dari hook
2. Tambah state untuk `preflightResult`
3. Update `handleAIPreflight()` untuk benar-benar memanggil edge function
4. Replace inline AI Pre-flight section dengan `PreflightResultCard`
5. Add blocking logic: jika verdict=SKIP, tampilkan warning dan disable Next button

**Integration Flow:**
```typescript
// 1. Fetch historical trades
const { data: historicalTrades, isLoading: tradesLoading } = useHistoricalTrades();

// 2. Build market snapshot dari context
const marketSnapshot = buildMarketSnapshot({
  trend: marketContext?.trend?.direction,
  trendStrength: marketContext?.trend?.strength,
  volatility: marketContext?.volatility?.percentile,
  volatilityLevel: marketContext?.volatility?.level,
});

// 3. Run preflight when button clicked
const handleAIPreflight = async () => {
  if (!historicalTrades || historicalTrades.length === 0) {
    toast.warning('Tidak ada riwayat trade untuk analisis');
    return;
  }
  
  const result = await preflight.mutateAsync({
    pair,
    direction,
    timeframe,
    historicalTrades,
    marketSnapshot,
  });
  
  setPreflightResult(result);
};
```

---

## Layer Display Specifications

### Layer 1: Data Sufficiency
| Metric | Display |
|--------|---------|
| Total Trades | Number + threshold indicator |
| Trades Last 60d | Number + threshold indicator |
| Max Gap Days | Number + warning if > 14 |
| Issues | List of specific problems |

### Layer 2: Edge Validation
| Metric | Display |
|--------|---------|
| Expectancy | R-value with color (green ≥0.30, yellow 0.10-0.30, red <0.10) |
| Edge Strength | Badge (STRONG/WEAK/NONE/NEGATIVE) |
| Win Rate | Percentage |
| Avg Win R / Avg Loss R | Side by side comparison |
| Profit Factor | Number |

### Layer 3: Context Similarity
| Metric | Display |
|--------|---------|
| Score | Progress bar (0-100%) |
| Matched Dimensions | Green badges list |
| Mismatched Dimensions | Orange/Red badges list |
| Relevant Trade Count | Number |

### Layer 4: Stability & Risk
| Metric | Display |
|--------|---------|
| Std Dev R | Number with warning threshold |
| Max Drawdown R | Number with threshold |
| Max Losing Streak | Number with warning if ≥5 |
| Profit Concentration | Percentage with warning if ≥50% |
| Stability Factor | Progress bar (0-1) |
| Flags | Badge list (HIGH_VOLATILITY_RETURNS, etc.) |

### Layer 5: Bias Detection
| Metric | Display |
|--------|---------|
| Flags | Badge list with severity colors |
| Penalty | Number showing confidence reduction |
| Details | Expandable list with descriptions |

---

## Color Scheme

| Verdict | Background | Border | Text |
|---------|-----------|--------|------|
| PROCEED | green-500/10 | green-500/30 | green-600 |
| CAUTION | yellow-500/10 | yellow-500/30 | yellow-600 |
| SKIP | red-500/10 | red-500/30 | red-600 |

| Edge Strength | Color |
|--------------|-------|
| STRONG | text-profit |
| WEAK | text-yellow-500 |
| NONE | text-muted-foreground |
| NEGATIVE | text-destructive |

---

## Integration with Wizard Flow

### Blocking Logic (Optional - configurable)

```typescript
// In SetupStep.tsx
const isPreflightBlocking = preflightResult?.verdict === 'SKIP';
const canProceed = isAccountSelected && isValidationPassed && isStrategySelected && isPairSelected && !isPreflightBlocking;
```

**Behavior:**
- Jika `verdict === 'SKIP'`: Tampilkan warning banner, user bisa bypass dengan checkbox "I understand the risk"
- Jika `verdict === 'CAUTION'`: Tampilkan info banner, tidak blocking
- Jika `verdict === 'PROCEED'`: Green indicator, proceed normally

---

## Technical Implementation

### PreflightResultCard Props
```typescript
interface PreflightResultCardProps {
  result: PreflightResponse;
  isLoading?: boolean;
  onDismiss?: () => void;
  showFullDetails?: boolean;
}
```

### Dependencies
- Existing UI components: Card, Badge, Progress, Accordion, Collapsible
- Icons: lucide-react (CheckCircle, XCircle, AlertTriangle, Layers, Brain, etc.)
- Hooks: useCurrencyConversion (for any monetary displays)

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/components/trade/entry/PreflightResultCard.tsx` | CREATE | Visual 5-layer analysis display |
| `src/components/trade/entry/SetupStep.tsx` | MODIFY | Integrate real preflight with historical trades |
| `src/components/trade/entry/index.ts` | MODIFY | Export new component |

---

## Testing Checklist

1. Komponen menampilkan semua 5 layer dengan data lengkap
2. Warna dan ikon sesuai verdict
3. Accordion expand/collapse berfungsi
4. Data dari useHistoricalTrades terambil dengan benar
5. Edge function dipanggil dengan payload yang valid
6. Blocking logic mencegah proceed jika verdict=SKIP
7. Loading state saat fetching trades dan running analysis
