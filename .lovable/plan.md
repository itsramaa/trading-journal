
# UI/UX Anti-Blink & Loading Consistency — Full Implementation

## Status: ✅ Implemented
Cross-check codebase mengkonfirmasi bahwa **seluruh fix dari plan sebelumnya belum diterapkan**:
- `keepPreviousData` tidak ditemukan di seluruh `src/` (0 matches)
- Stats header di TradeHistory tidak memiliki skeleton guard
- `loadMoreRef` masih di luar conditional block (line 644)
- BinanceFullSyncPanel tidak memiliki stale sync detection

## Perubahan yang Akan Dilakukan

### 1. Hook: `src/hooks/use-trade-entries-paginated.ts`

Tambahkan `placeholderData: keepPreviousData` ke `useInfiniteQuery` (line 43). Ini menghilangkan skeleton flash saat filter berubah — data lama tetap tampil selama fetch baru berlangsung.

```typescript
import { useInfiniteQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";

// Di useInfiniteQuery options:
placeholderData: keepPreviousData,
```

### 2. Hook: `src/hooks/use-trade-stats.ts`

Tambahkan `placeholderData: keepPreviousData` ke `useQuery` (line 55). Stats (P&L, Win Rate, Total Trades) tidak akan blink ke 0 saat filter berubah.

```typescript
import { useQuery, keepPreviousData } from "@tanstack/react-query";

// Di useQuery options:
placeholderData: keepPreviousData,
```

### 3. Hook: `src/hooks/use-trade-enrichment-binance.ts`

Tambahkan `placeholderData: keepPreviousData` ke `useTradesNeedingEnrichmentCount` query (line 187). Badge "Incomplete" tidak flash 0 -> N.

```typescript
import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";

// Di useQuery options:
placeholderData: keepPreviousData,
```

### 4. Page: `src/pages/TradeHistory.tsx` — 3 perubahan

**A. Destructure `isFetching`** dari `useTradeEntriesPaginated` (line 153-161):
```typescript
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isFetching,  // NEW
  isLoading,
  isError,
  error,
} = useTradeEntriesPaginated({ limit: PAGE_SIZE, filters: paginatedFilters });
```

**B. Stats Header Skeleton** (line 332-394): Wrap stats section dengan `isStatsLoading && !tradeStats` check. Saat initial load, tampilkan skeleton. Saat refetch (filter change), `keepPreviousData` sudah meng-handle — data lama tetap tampil.

```typescript
<div className="flex gap-4 text-sm">
  {isStatsLoading && !tradeStats ? (
    <>
      <Skeleton className="h-12 w-20" />
      <Skeleton className="h-12 w-24" />
      <Skeleton className="h-12 w-16" />
    </>
  ) : (
    // existing stats render (Trades count, Gross P&L, Win Rate)
  )}
</div>
```

**C. Refetching Opacity + Move loadMoreRef**: 
- Wrap trade list render (`renderTradeList`) dengan opacity transition saat `isFetching && !isLoading`
- Pindahkan `loadMoreRef` div (line 644) ke dalam conditional block setelah trade list, bukan di luar `isLoading/isError`

```typescript
// Di TabsContent:
<div className={cn(
  "transition-opacity duration-200",
  isFetching && !isLoading && "opacity-60"
)}>
  {renderTradeList(sortedTrades)}
</div>

// loadMoreRef dipindahkan ke dalam block ini (setelah renderTradeList)
```

### 5. Component: `src/components/trading/BinanceFullSyncPanel.tsx` — Stale Sync Detection

Tambahkan timer-based stale detection di `SyncProgressIndicator` component (line 385-434). Jika progress tidak berubah selama 2 menit, tampilkan warning.

```typescript
// Di SyncProgressIndicator:
const [lastProgressTime, setLastProgressTime] = useState(Date.now());
const [isStale, setIsStale] = useState(false);

useEffect(() => {
  setLastProgressTime(Date.now());
  setIsStale(false);
}, [progress.current, progress.phase]);

useEffect(() => {
  const interval = setInterval(() => {
    if (Date.now() - lastProgressTime > 120_000) {
      setIsStale(true);
    }
  }, 30_000);
  return () => clearInterval(interval);
}, [lastProgressTime]);

// Render warning if stale:
{isStale && (
  <Alert variant="destructive" className="mt-2">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription className="text-xs">
      Sync appears stuck (no progress for 2 minutes). Consider canceling and retrying.
    </AlertDescription>
  </Alert>
)}
```

## Files Modified

| File | Perubahan |
|------|-----------|
| `src/hooks/use-trade-entries-paginated.ts` | Import `keepPreviousData`, add to `useInfiniteQuery` |
| `src/hooks/use-trade-stats.ts` | Import `keepPreviousData`, add to `useQuery` |
| `src/hooks/use-trade-enrichment-binance.ts` | Import `keepPreviousData`, add to enrichment count query |
| `src/pages/TradeHistory.tsx` | Stats skeleton, `isFetching` opacity, move `loadMoreRef` |
| `src/components/trading/BinanceFullSyncPanel.tsx` | Stale sync detection timer + warning alert |

## Impact

- **Blink elimination**: `keepPreviousData` di 3 hooks menghilangkan semua flash saat filter/refetch
- **Stats stability**: Skeleton hanya saat initial load, bukan setiap filter change
- **Subtle refresh feedback**: Opacity 60% menunjukkan "data sedang refresh" tanpa menghilangkan konten
- **Infinite scroll fix**: `loadMoreRef` tidak trigger fetch saat error/loading state
- **Sync safety**: User mendapat warning jika sync stuck > 2 menit
