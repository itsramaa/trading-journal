
# Plan: Audit Hardcode & Refactor Trading Journal / Trade History

## Executive Summary

Setelah melakukan cross-check mendalam pada halaman **Trading Journal** dan **Trade History** beserta komponen terkaitnya, berikut adalah hasil analisis lengkap mengenai **hardcode values**, dampaknya, serta rekomendasi refactoring berdasarkan prinsip **Single Responsibility Principle (SRP)**, **DRY (Don't Repeat Yourself)**, dan **Clean Code**.

---

## 1. Temuan Hardcode Values

### 1.1 Hardcode di `TradeHistory.tsx`

| Lokasi | Hardcode | Nilai | Dampak |
|--------|----------|-------|--------|
| Line 50 | `DEFAULT_START_DATE` | `subYears(new Date(), 1)` (1 tahun) | Lookback default terkunci, user tidak bisa kustomisasi |
| Line 51 | `PAGE_SIZE` | `50` | Pagination size fixed, tidak bisa diatur user |
| Line 415-417 | CSV Header | `'Date,Pair,Direction,Entry,Exit,P&L,Result,Notes\n'` | Export format hardcoded, tidak internationalized |
| Line 537 | `daysBack` | `730` (2 tahun) | Enrichment lookback hardcoded |

### 1.2 Hardcode di `TradingJournal.tsx`

| Lokasi | Hardcode | Nilai | Dampak |
|--------|----------|-------|--------|
| Line 238 | `defaultValue` | `"active"` | Tab default hardcoded |
| Line 238 | Tab max-width | `max-w-[300px]` | Responsive breakpoint hardcoded |

### 1.3 Hardcode di Komponen Pendukung

| File | Hardcode | Dampak |
|------|----------|--------|
| `TradeHistoryCard.tsx` Line 219 | `confluence_score` display `/5` | Skala konfluensi hardcoded ke 5, tidak fleksibel |
| `TradeGalleryCard.tsx` Line 33-34 | Enrichment check `entry_price === 0` | Logika validasi tersebar |
| `FeeHistoryTab.tsx` Line 70-74 | Bahasa Indonesia hardcoded | Tidak konsisten dengan i18n |
| `FundingHistoryTab.tsx` Line 70-74 | Bahasa Indonesia hardcoded | Tidak konsisten dengan i18n |
| `use-trade-entries-paginated.ts` Line 31 | `DEFAULT_PAGE_SIZE = 50` | Duplikasi dengan TradeHistory |

### 1.4 Magic Numbers di Session Utils

`session-utils.ts` sudah baik dengan konstanta `SESSION_UTC`, tetapi ada inkonsistensi:
- Line 89-103: Overlap hours masih hardcoded inline (12-16, 7-9, 0-6)

---

## 2. Dampak Hardcode

### Dampak Negatif

1. **Maintainability Rendah**
   - Perubahan pagination size memerlukan edit di 2 tempat
   - Perubahan lookback default tersebar
   
2. **Internationalization Terhambat**
   - String bahasa Indonesia inline (FeeHistoryTab, FundingHistoryTab)
   - CSV headers tidak terlokalisasi
   
3. **Testing Sulit**
   - Magic numbers tidak bisa di-mock atau dikonfigurasi untuk test
   - E2E test harus match dengan hardcode values
   
4. **Flexibility Kurang**
   - User tidak bisa mengatur pagination preference
   - Power user tidak bisa custom export format

### Dampak Positif (Yang Sudah Baik)

1. **Session constants** sudah terpusat di `session-utils.ts`
2. **Formatters** sudah terpusat di `formatters.ts`
3. **Query invalidation** sudah terpusat di `query-invalidation.ts`

---

## 3. Rekomendasi Solusi

### Phase 1: Extract Constants (Quick Win)

Buat file `src/lib/constants/trade-history.ts`:

```text
// Constants for Trade History module
export const TRADE_HISTORY_DEFAULTS = {
  PAGE_SIZE: 50,
  LOOKBACK_DAYS: 365,           // Default 1 year
  ENRICHMENT_LOOKBACK_DAYS: 730, // 2 years for enrichment
  EXPORT_FORMATS: ['csv', 'json'] as const,
} as const;

export const CONFLUENCE_SCALE = {
  MIN: 0,
  MAX: 5,
  DISPLAY_FORMAT: (score: number) => `${score}/${CONFLUENCE_SCALE.MAX}`,
} as const;

export const TRADE_TABS = {
  DEFAULT_JOURNAL: 'active',
  DEFAULT_HISTORY: 'all',
} as const;
```

### Phase 2: Refactor dengan SRP

#### 2.1 Extract CSV Export Logic

**Masalah**: Export logic embedded di komponen (TradeHistory.tsx Line 410-424)

**Solusi**: Buat utility terpisah

File baru: `src/lib/export/trade-export.ts`
- `exportTradesCsv(trades, options)`
- `exportTradesJson(trades, options)`
- `formatTradeForExport(trade, locale)`

#### 2.2 Extract Filter Logic

**Masalah**: Filter state management berulang di TradeHistory.tsx

**Solusi**: Custom hook `useTradeHistoryFilters`

```text
// Hook yang mengenkapsulasi semua filter state
function useTradeHistoryFilters() {
  return {
    filters: { dateRange, resultFilter, directionFilter, ... },
    handlers: { setDateRange, setResultFilter, clearAll, ... },
    computed: { hasActiveFilters, activeFilterCount, ... }
  }
}
```

#### 2.3 Extract Enrichment Check Logic

**Masalah**: `needsEnrichment` check duplicated (TradeGalleryCard, TradeHistoryCard)

**Solusi**: Utility function

```text
// src/lib/trade-utils.ts
export function tradeNeedsEnrichment(trade: TradeEntry): boolean {
  return trade.source === 'binance' && (!trade.entry_price || trade.entry_price === 0);
}
```

### Phase 3: Component Decomposition (SRP)

#### 3.1 TradeHistory.tsx Refactor

**Current State**: 770 lines, menangani terlalu banyak responsibility

**Decomposition Plan**:

```text
TradeHistory.tsx (Container - 150 lines)
├── TradeHistoryHeader.tsx (Header + Stats)
├── TradeHistoryFiltersSection.tsx (Filter Card)
├── TradeHistoryContent.tsx (Tabs + Trade List)
│   ├── TradeListView.tsx (List mode)
│   └── TradeGalleryView.tsx (Gallery mode)
├── TradeHistorySyncControls.tsx (Sync buttons)
└── TradeHistoryDialogs.tsx (Enrichment + Delete dialogs)
```

#### 3.2 TradingJournal.tsx Refactor

**Current State**: 342 lines, acceptable tapi bisa dipecah

**Decomposition Plan**:

```text
TradingJournal.tsx (Container - 100 lines)
├── JournalHeader.tsx
├── JournalSummaryCards.tsx (reuse TradeSummaryStats)
├── JournalTradeManagement.tsx
│   ├── PendingPositionsTab.tsx
│   └── ActivePositionsTab.tsx
└── JournalDialogs.tsx (Close, Edit, Enrichment)
```

### Phase 4: DRY Improvements

#### 4.1 Unified Empty State Messages

Buat konstanta pesan empty state:

```text
// src/lib/constants/messages.ts
export const EMPTY_STATE_MESSAGES = {
  NO_TRADES: {
    title: 'No trades found',
    description: 'No trades match your current filters.',
  },
  NO_BINANCE_TRADES: (connected: boolean) => ({
    title: 'No Binance trades',
    description: connected 
      ? 'No Binance trades match your filters.'
      : 'Connect Binance in Settings to import trades.',
  }),
  // ... etc
}
```

#### 4.2 Unified Badge Styling

`TradeHistoryCard` dan `TradeGalleryCard` memiliki logika badge direction yang sama:

```text
// src/lib/trade-utils.ts
export function getDirectionBadgeVariant(direction: string): 'long' | 'short' | 'outline' {
  if (direction === 'LONG') return 'long';
  if (direction === 'SHORT') return 'short';
  return 'outline';
}
```

---

## 4. Implementation Priority

### Immediate (Phase 1) - Low Risk, Quick Win
1. Extract constants ke `trade-history.ts`
2. Replace hardcoded values dengan constants
3. **Effort**: ~2 jam

### Short-term (Phase 2) - Medium Risk
4. Extract CSV export utility
5. Create `useTradeHistoryFilters` hook
6. Create `tradeNeedsEnrichment` utility
7. **Effort**: ~4 jam

### Medium-term (Phase 3 & 4) - Higher Risk
8. Decompose `TradeHistory.tsx` ke sub-components
9. Decompose `TradingJournal.tsx` ke sub-components
10. Unify empty state messages
11. **Effort**: ~8 jam

---

## 5. Files to Create/Modify

### New Files
- `src/lib/constants/trade-history.ts`
- `src/lib/export/trade-export.ts`
- `src/hooks/use-trade-history-filters.ts`
- `src/components/journal/TradeHistoryHeader.tsx`
- `src/components/journal/TradeHistoryFiltersSection.tsx`
- `src/components/journal/TradeHistoryContent.tsx`
- `src/components/journal/TradeHistorySyncControls.tsx`

### Modified Files
- `src/pages/TradeHistory.tsx` - Major refactor
- `src/pages/trading-journey/TradingJournal.tsx` - Minor refactor
- `src/components/trading/TradeHistoryCard.tsx` - Use utilities
- `src/components/journal/TradeGalleryCard.tsx` - Use utilities
- `src/components/trading/FeeHistoryTab.tsx` - i18n prep
- `src/components/trading/FundingHistoryTab.tsx` - i18n prep
- `src/hooks/use-trade-entries-paginated.ts` - Use shared constants

---

## 6. Risk Mitigation

1. **Testing**: Pastikan unit test dan integration test berjalan setelah setiap phase
2. **Incremental**: Commit per sub-task, bukan big bang refactor
3. **Backward Compat**: Export lama harus tetap berfungsi selama transisi
4. **Documentation**: Update `docs/FRONTEND.md` setelah refactor

---

## Technical Section

### Contoh Implementasi Constants

```typescript
// src/lib/constants/trade-history.ts
export const TRADE_HISTORY_CONFIG = {
  pagination: {
    defaultPageSize: 50,
    maxPageSize: 100,
  },
  lookback: {
    defaultDays: 365,
    enrichmentDays: 730,
    maxHistoryDays: 1095, // 3 years
  },
  tabs: {
    defaultJournal: 'active',
    defaultHistory: 'all',
  },
  export: {
    csvDelimiter: ',',
    dateFormat: 'yyyy-MM-dd',
  },
} as const;
```

### Contoh useTradeHistoryFilters Hook

```typescript
export function useTradeHistoryFilters() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  // ... other states

  const hasActiveFilters = useMemo(() => 
    dateRange.from !== null || resultFilter !== 'all' || /* ... */
  , [dateRange, resultFilter]);

  const clearAll = useCallback(() => {
    setDateRange({ from: null, to: null });
    setResultFilter('all');
    // ...
  }, []);

  return {
    filters: { dateRange, resultFilter, /* ... */ },
    setters: { setDateRange, setResultFilter, /* ... */ },
    meta: { hasActiveFilters, activeFilterCount: /* ... */ },
    actions: { clearAll },
  };
}
```
