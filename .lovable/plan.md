
# Plan: Unified Realtime, Filter State Indicator, & Financial Summary Clarity

## Overview

Implementasi sistem yang memastikan:
1. **Realtime Update**: Perubahan trade memicu invalidasi ke SEMUA query terkait
2. **Filter State Indicator**: User selalu tahu apakah data yang dilihat terfilter
3. **Financial Summary Clarity**: Label yang jelas bahwa summary tidak mengikuti filter

---

## Phase 1: Extended Realtime Invalidation Matrix

### 1.1 Update use-realtime.ts

**Problem**: Saat ini `trade_entries` change hanya invalidate `["trade-entries"]`, padahal banyak hook lain bergantung pada data ini.

**Solution**: Perluas invalidation matrix untuk trade_entries agar mencakup semua dependent queries.

**File**: `src/hooks/use-realtime.ts`

**Changes**:
```typescript
case "trade_entries":
  // Primary trade queries
  queryClient.invalidateQueries({ queryKey: ["trade-entries"] });
  queryClient.invalidateQueries({ queryKey: ["trade-entries-paginated"] });
  
  // Portfolio & Dashboard (dependent on trade P&L calculations)
  queryClient.invalidateQueries({ queryKey: ["unified-portfolio"] });
  queryClient.invalidateQueries({ queryKey: ["unified-daily-pnl"] });
  queryClient.invalidateQueries({ queryKey: ["unified-weekly-pnl"] });
  
  // Analytics (recalculates from trades)
  queryClient.invalidateQueries({ queryKey: ["contextual-analytics"] });
  queryClient.invalidateQueries({ queryKey: ["symbol-breakdown"] });
  
  // Binance daily P&L (if trade closed triggers recalc)
  queryClient.invalidateQueries({ queryKey: ["binance-daily-pnl"] });
  break;
```

### 1.2 Add Paginated Query Key to Realtime

Ensure `trade-entries-paginated` juga di-invalidate saat realtime event terjadi.

---

## Phase 2: Filter State Indicator Component

### 2.1 Create FilterActiveIndicator Component

**File baru**: `src/components/ui/filter-active-indicator.tsx`

Komponen yang menampilkan badge visual saat filter aktif:

```typescript
interface FilterActiveIndicatorProps {
  isActive: boolean;
  dateRange?: DateRange;
  filterCount?: number;
  onClear?: () => void;
}

// Displays:
// - "Filtered Data" badge with warning color
// - Date range if active
// - Number of active filters
// - Clear button
```

**Visual Design**:
```text
┌─────────────────────────────────────────────────┐
│ ⚠️ Filtered View: Jan 1 - Feb 6 + 3 filters    [Clear] │
└─────────────────────────────────────────────────┘
```

### 2.2 Integrate into TradeHistory.tsx

**File**: `src/pages/TradeHistory.tsx`

Add FilterActiveIndicator di bawah header, sebelum filter controls:

```typescript
const hasActiveFilters = 
  dateRange.from !== null || 
  dateRange.to !== null ||
  resultFilter !== 'all' ||
  directionFilter !== 'all' ||
  sessionFilter !== 'all' ||
  selectedStrategyIds.length > 0 ||
  selectedPairs.length > 0;

const activeFilterCount = [
  resultFilter !== 'all',
  directionFilter !== 'all',
  sessionFilter !== 'all',
  selectedStrategyIds.length > 0,
  selectedPairs.length > 0,
].filter(Boolean).length;

// In JSX, above stats summary:
{hasActiveFilters && (
  <FilterActiveIndicator 
    isActive={hasActiveFilters}
    dateRange={dateRange}
    filterCount={activeFilterCount}
    onClear={handleClearAllFilters}
  />
)}
```

### 2.3 Visual Distinction Between Filtered vs Unfiltered State

Update header stats section:

```typescript
{/* Stats Summary - show filtered indicator */}
<div className="flex items-center gap-6">
  {hasActiveFilters && (
    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
      <Filter className="h-3 w-3 mr-1" />
      Filtered
    </Badge>
  )}
  <div className="flex gap-4 text-sm">
    {/* Stats... */}
  </div>
</div>
```

---

## Phase 3: Financial Summary Independence Clarity

### 3.1 Update FinancialSummaryCard.tsx

**File**: `src/components/accounts/FinancialSummaryCard.tsx`

**Changes**:

1. **Rename dropdown label** dari "7 days" ke "Reporting Period"
2. **Add info tooltip** yang menjelaskan ini adalah high-level overview
3. **Add subtitle** yang menegaskan data TIDAK mengikuti Trade History filters

```typescript
<CardHeader>
  <div className="flex items-center justify-between">
    <div>
      <CardTitle className="flex items-center gap-2 text-lg">
        <CircleDollarSign className="h-5 w-5 text-primary" />
        Financial Summary
        <InfoTooltip content="High-level overview of trading costs. This data uses its own reporting period and is NOT affected by Trade History filters." />
      </CardTitle>
      <CardDescription>
        Reporting period overview • Independent of page filters
      </CardDescription>
    </div>
    <div className="flex items-center gap-2">
      <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
        <SelectTrigger className="w-[150px]">
          <Calendar className="h-4 w-4 mr-1" />
          <SelectValue placeholder="Reporting Period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Last 7 days</SelectItem>
          <SelectItem value="30">Last 30 days</SelectItem>
          <SelectItem value="90">Last 90 days</SelectItem>
          <SelectItem value="180">Last 6 months</SelectItem>
          <SelectItem value="365">Last year</SelectItem>
        </SelectContent>
      </Select>
      {/* ... */}
    </div>
  </div>
</CardHeader>
```

### 3.2 Add Visual Separator

Add dashed border atau muted background untuk memisahkan Financial Summary dari filtered content:

```typescript
<Card className={cn("border-dashed border-muted-foreground/30", className)}>
```

---

## Phase 4: Trade Mutation Invalidation Consistency

### 4.1 Create Centralized Invalidation Helper

**File baru**: `src/lib/query-invalidation.ts`

```typescript
import { QueryClient } from "@tanstack/react-query";

/**
 * Invalidate all trade-related queries
 * Used after any trade mutation (create, update, delete, close)
 */
export function invalidateTradeQueries(queryClient: QueryClient) {
  // Primary trade data
  queryClient.invalidateQueries({ queryKey: ["trade-entries"] });
  queryClient.invalidateQueries({ queryKey: ["trade-entries-paginated"] });
  
  // Dashboard widgets
  queryClient.invalidateQueries({ queryKey: ["unified-portfolio"] });
  queryClient.invalidateQueries({ queryKey: ["unified-daily-pnl"] });
  queryClient.invalidateQueries({ queryKey: ["unified-weekly-pnl"] });
  
  // Analytics
  queryClient.invalidateQueries({ queryKey: ["contextual-analytics"] });
  queryClient.invalidateQueries({ queryKey: ["symbol-breakdown"] });
  
  // Binance P&L (recalculates)
  queryClient.invalidateQueries({ queryKey: ["binance-daily-pnl"] });
  queryClient.invalidateQueries({ queryKey: ["binance-weekly-pnl"] });
}

/**
 * Invalidate account-related queries
 */
export function invalidateAccountQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["accounts"] });
  queryClient.invalidateQueries({ queryKey: ["account-transactions"] });
  queryClient.invalidateQueries({ queryKey: ["trading-accounts"] });
  queryClient.invalidateQueries({ queryKey: ["unified-portfolio"] });
}
```

### 4.2 Update use-trade-entries.ts

**File**: `src/hooks/use-trade-entries.ts`

Replace manual invalidations dengan helper:

```typescript
import { invalidateTradeQueries } from "@/lib/query-invalidation";

// In useCreateTradeEntry:
onSuccess: () => {
  invalidateTradeQueries(queryClient);
  toast.success("Trade entry saved successfully");
},

// In useUpdateTradeEntry:
onSuccess: () => {
  invalidateTradeQueries(queryClient);
  toast.success("Trade entry updated successfully");
},

// In useDeleteTradeEntry:
onSuccess: () => {
  invalidateTradeQueries(queryClient);
  toast.success("Trade entry deleted successfully");
},

// In useClosePosition:
onSuccess: () => {
  invalidateTradeQueries(queryClient);
  toast.success("Position closed successfully");
},
```

### 4.3 Update Other Trade Mutation Hooks

Apply same pattern ke:
- `src/hooks/use-trade-entries-paginated.ts`
- `src/hooks/use-binance-sync.ts`
- `src/hooks/use-binance-full-sync.ts`
- `src/hooks/use-binance-auto-sync.ts`

---

## Phase 5: DateRange Default State Documentation

### 5.1 Update DateRangeFilter.tsx

**File**: `src/components/trading/DateRangeFilter.tsx`

Add visual indicator bahwa "All time" adalah neutral state:

```typescript
const presets = [
  { label: "Today", getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: "Last 7 days", getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: "Last 30 days", getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "Last 3 months", getValue: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
  { label: "Last 6 months", getValue: () => ({ from: subMonths(new Date(), 6), to: new Date() }) },
  { label: "Last year", getValue: () => ({ from: subYears(new Date(), 1), to: new Date() }) },
  { label: "All time", getValue: () => ({ from: null, to: null }), isDefault: true },
];
```

Show badge ketika date range BUKAN "All time":

```typescript
const displayText = value.from && value.to
  ? `${format(value.from, "MMM d, yyyy")} - ${format(value.to, "MMM d, yyyy")}`
  : value.from
  ? `From ${format(value.from, "MMM d, yyyy")}`
  : value.to
  ? `Until ${format(value.to, "MMM d, yyyy")}`
  : "All time"; // Neutral state indicator
```

---

## Implementation Order

```text
Phase 1: Centralized Invalidation (Foundation)
├── 1.1 Create lib/query-invalidation.ts
└── 1.2 Update use-realtime.ts with extended matrix

Phase 2: Update Trade Mutations
├── 2.1 use-trade-entries.ts
├── 2.2 use-trade-entries-paginated.ts
├── 2.3 use-binance-sync.ts
├── 2.4 use-binance-full-sync.ts
└── 2.5 use-binance-auto-sync.ts

Phase 3: Filter State UI
├── 3.1 Create FilterActiveIndicator component
├── 3.2 Integrate into TradeHistory.tsx
└── 3.3 Update DateRangeFilter.tsx

Phase 4: Financial Summary Clarity
├── 4.1 Update FinancialSummaryCard.tsx with tooltip
└── 4.2 Update labels and descriptions
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/query-invalidation.ts` | Centralized query invalidation helpers |
| `src/components/ui/filter-active-indicator.tsx` | Visual filter state badge |

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/use-realtime.ts` | Extend invalidation matrix |
| `src/hooks/use-trade-entries.ts` | Use centralized invalidation |
| `src/hooks/use-trade-entries-paginated.ts` | Use centralized invalidation |
| `src/hooks/use-binance-sync.ts` | Use centralized invalidation |
| `src/hooks/use-binance-full-sync.ts` | Use centralized invalidation |
| `src/hooks/use-binance-auto-sync.ts` | Use centralized invalidation |
| `src/pages/TradeHistory.tsx` | Add FilterActiveIndicator |
| `src/components/accounts/FinancialSummaryCard.tsx` | Clarify independence |
| `src/components/trading/DateRangeFilter.tsx` | Visual improvements |

---

## Outcome

Setelah implementasi:

1. **Realtime Consistency**: Setiap perubahan trade otomatis memicu update ke Dashboard, Portfolio, Analytics
2. **Filter Transparency**: User selalu tahu saat melihat data yang terfilter
3. **Summary Clarity**: Financial Summary jelas sebagai high-level overview yang independen
4. **No Stale Data**: Semua komponen sinkron setelah trade mutation
5. **Predictable Behavior**: Filter hanya aktif saat user memilih, bukan default hidden

---

## Technical Notes

### Query Invalidation Strategy

Invalidation dilakukan secara **cascading**:
```text
trade_entries change
├── trade-entries (primary)
├── trade-entries-paginated (cursor-based)
├── unified-portfolio (uses trades for P&L)
├── unified-daily-pnl (today's trades)
├── unified-weekly-pnl (7-day aggregation)
├── contextual-analytics (market context analysis)
├── symbol-breakdown (pair-based breakdown)
└── binance-daily-pnl (recalculates with new trades)
```

### Filter State Detection

Filter dianggap aktif jika ANY of:
- Date range != null (both from and to)
- Result filter != 'all'
- Direction filter != 'all'
- Session filter != 'all'
- Strategy selection > 0
- Pair selection > 0
- AI sort != 'none'

### Financial Summary Independence

Financial Summary:
- Menggunakan internal `days` state (7/30/90/180/365)
- TIDAK membaca state dari Trade History page
- TIDAK subscribe ke filter context
- Ini by design untuk menjaga summary tetap stabil
