
# Trade History System - Phased Implementation Plan

## Current State Analysis

### What Exists
| Component | Status | Issue |
|-----------|--------|-------|
| `useTradeEntriesPaginated()` | ✅ Exists | Not used on TradeHistory page |
| `TradeHistoryInfiniteScroll` | ✅ Exists | Not integrated to main page |
| `TradeHistoryFilters` | ✅ Exists | Needs minor adjustments for paginated hook |
| `TradeHistoryCard` | ✅ Exists | Works fine, no changes needed |
| Gallery View | ❌ Missing | Needs creation |
| Default Time Range | ❌ Missing | No 1-year limit enforced |
| View Toggle | ❌ Missing | No List/Gallery switch |

### Critical Problem

```typescript
// TradeHistory.tsx Line 47 - CURRENT (BAD)
const { data: trades, isLoading } = useTradeEntries(); // Fetches ALL trades

// SHOULD BE
const { data, fetchNextPage, hasNextPage } = useTradeEntriesPaginated({
  limit: 50,
  filters: { startDate: subYears(new Date(), 1).toISOString() }
});
```

---

## Phase 1: Foundation - Migrate to Paginated Hook

**Goal**: Replace full-fetch with paginated fetch on TradeHistory page

### 1.1 Update TradeFilters Interface

**File**: `src/hooks/use-trade-entries-paginated.ts`

Add missing filter properties to `TradeFilters`:

```typescript
export interface TradeFilters {
  status?: 'open' | 'closed' | 'all';
  pair?: string;
  pairs?: string[];           // NEW: Multi-select pairs
  direction?: 'LONG' | 'SHORT';
  result?: 'win' | 'loss' | 'breakeven';
  source?: 'manual' | 'binance';
  startDate?: string;
  endDate?: string;
  strategyId?: string;
  strategyIds?: string[];     // NEW: Multi-select strategies
}
```

### 1.2 Add Multi-Filter Support to Hook

Update query builder to handle array filters:

```typescript
// Handle multiple pairs
if (filters?.pairs && filters.pairs.length > 0) {
  query = query.in("pair", filters.pairs);
}

// Handle multiple strategies (post-filter approach already exists)
```

### 1.3 Replace Hook in TradeHistory.tsx

**Before (Line 47)**:
```typescript
const { data: trades, isLoading } = useTradeEntries();
```

**After**:
```typescript
import { subYears } from "date-fns";
import { 
  useTradeEntriesPaginated, 
  useFlattenedPaginatedTrades 
} from "@/hooks/use-trade-entries-paginated";

// Default: 1 year lookback, closed trades only
const defaultStartDate = subYears(new Date(), 1).toISOString().split('T')[0];

const paginatedFilters = useMemo(() => ({
  status: 'closed' as const,
  startDate: dateRange.from?.toISOString().split('T')[0] || defaultStartDate,
  endDate: dateRange.to?.toISOString().split('T')[0],
  pairs: selectedPairs.length > 0 ? selectedPairs : undefined,
  result: resultFilter !== 'all' ? resultFilter : undefined,
  direction: directionFilter !== 'all' ? directionFilter : undefined,
  strategyIds: selectedStrategyIds.length > 0 ? selectedStrategyIds : undefined,
}), [dateRange, selectedPairs, resultFilter, directionFilter, selectedStrategyIds]);

const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
} = useTradeEntriesPaginated({ limit: 50, filters: paginatedFilters });

const trades = data?.pages.flatMap(page => page.trades) ?? [];
const totalCount = data?.pages[0]?.totalCount ?? 0;
```

### 1.4 Add Infinite Scroll Trigger

Add scroll detection at bottom of trade list:

```tsx
import { useInView } from "react-intersection-observer";

// Inside component
const { ref: loadMoreRef, inView } = useInView({
  threshold: 0.1,
  rootMargin: "100px",
});

useEffect(() => {
  if (inView && hasNextPage && !isFetchingNextPage) {
    fetchNextPage();
  }
}, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

// In JSX, after trade list
<div ref={loadMoreRef} className="py-4 flex justify-center">
  {isFetchingNextPage ? (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">Loading more...</span>
    </div>
  ) : hasNextPage ? (
    <span className="text-sm text-muted-foreground">Scroll for more</span>
  ) : trades.length > 0 ? (
    <span className="text-sm text-muted-foreground">
      All {totalCount} trades loaded
    </span>
  ) : null}
</div>
```

### 1.5 Update Stats Calculation

Current stats use client-side filter. With pagination, we need to:
- Keep using flattened paginated data for accurate counts
- OR create a separate stats query (for full accuracy)

For Phase 1, use flattened data:

```typescript
// Stats based on loaded trades (good enough for UX)
const loadedCount = trades.length;
const totalPnL = trades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
const winCount = trades.filter(t => (t.realized_pnl || 0) > 0).length;
const winRate = loadedCount > 0 ? (winCount / loadedCount) * 100 : 0;
```

### Files Changed in Phase 1
| File | Action |
|------|--------|
| `src/hooks/use-trade-entries-paginated.ts` | MODIFY - Add multi-filter support |
| `src/pages/TradeHistory.tsx` | MODIFY - Replace hook, add infinite scroll |

---

## Phase 2: Default Time Range & Filter Integration

**Goal**: Enforce 1-year default, allow override via filter UI

### 2.1 Add "Full History" Button to Filters

**File**: `src/components/journal/TradeHistoryFilters.tsx`

Add a toggle for full history:

```tsx
interface TradeHistoryFiltersProps {
  // ...existing props
  showFullHistory?: boolean;
  onShowFullHistoryChange?: (show: boolean) => void;
}

// In JSX
<div className="flex items-center gap-2">
  <span className="text-sm text-muted-foreground">
    {showFullHistory ? "Showing full history" : "Last 12 months"}
  </span>
  <Switch
    checked={showFullHistory}
    onCheckedChange={onShowFullHistoryChange}
  />
</div>
```

### 2.2 Sync Filter State with Pagination

When `showFullHistory` is false (default):
- `startDate` = 1 year ago
- `endDate` = today

When `showFullHistory` is true:
- No date constraints

### 2.3 Preserve Filter State in URL (Optional)

Use URL search params to persist filter state:

```typescript
import { useSearchParams } from "react-router-dom";

const [searchParams, setSearchParams] = useSearchParams();

// Initialize from URL
const initialResult = searchParams.get('result') as ResultFilter || 'all';
const initialFullHistory = searchParams.get('full') === 'true';
```

### Files Changed in Phase 2
| File | Action |
|------|--------|
| `src/components/journal/TradeHistoryFilters.tsx` | MODIFY - Add full history toggle |
| `src/pages/TradeHistory.tsx` | MODIFY - Connect toggle to filter state |

---

## Phase 3: View Toggle Infrastructure

**Goal**: Add List/Gallery toggle that shares the same data source

### 3.1 Create View Mode State

```typescript
type ViewMode = 'list' | 'gallery';

const [viewMode, setViewMode] = useState<ViewMode>('list');

// Persist preference
const { data: userSettings, updateSettings } = useUserSettings();
useEffect(() => {
  if (userSettings?.trade_history_view) {
    setViewMode(userSettings.trade_history_view);
  }
}, [userSettings]);

const handleViewModeChange = (mode: ViewMode) => {
  setViewMode(mode);
  updateSettings({ trade_history_view: mode });
};
```

### 3.2 Add Toggle Button Group to Header

```tsx
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { List, Grid } from "lucide-react";

<ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange}>
  <ToggleGroupItem value="list" aria-label="List view">
    <List className="h-4 w-4" />
  </ToggleGroupItem>
  <ToggleGroupItem value="gallery" aria-label="Gallery view">
    <Grid className="h-4 w-4" />
  </ToggleGroupItem>
</ToggleGroup>
```

### 3.3 Create TradeGalleryCard Component

**File**: `src/components/journal/TradeGalleryCard.tsx` (NEW)

```tsx
interface TradeGalleryCardProps {
  trade: TradeEntry;
  onTradeClick: (trade: TradeEntry) => void;
}

function TradeGalleryCard({ trade, onTradeClick }: TradeGalleryCardProps) {
  const hasScreenshots = trade.screenshots && trade.screenshots.length > 0;
  const thumbnailUrl = hasScreenshots ? trade.screenshots[0].url : null;
  const pnl = trade.realized_pnl ?? 0;
  
  return (
    <Card 
      className="cursor-pointer hover:border-primary transition-colors overflow-hidden"
      onClick={() => onTradeClick(trade)}
    >
      {/* Thumbnail Section */}
      <div className="aspect-video bg-muted relative">
        {thumbnailUrl ? (
          <LazyImage 
            src={thumbnailUrl} 
            alt={`${trade.pair} chart`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}
        {/* Overlay badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          <Badge variant={trade.direction === 'LONG' ? 'default' : 'secondary'}>
            {trade.direction}
          </Badge>
        </div>
        <div className="absolute top-2 right-2">
          <Badge 
            variant={pnl >= 0 ? 'default' : 'destructive'}
            className={pnl >= 0 ? 'bg-profit text-white' : ''}
          >
            {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
          </Badge>
        </div>
      </div>
      
      {/* Info Section */}
      <CardContent className="p-3">
        <div className="flex justify-between items-center">
          <span className="font-semibold">{trade.pair}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(trade.trade_date), "MMM d")}
          </span>
        </div>
        {trade.strategies?.[0] && (
          <Badge variant="outline" className="mt-1 text-xs">
            {trade.strategies[0].name}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
```

### 3.4 Create LazyImage Component for Gallery

**File**: `src/components/ui/lazy-image.tsx` (NEW)

```tsx
import { useState, useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { Skeleton } from "@/components/ui/skeleton";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function LazyImage({ src, alt, className }: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: "100px",
  });

  return (
    <div ref={ref} className={className}>
      {!inView ? (
        <Skeleton className="w-full h-full" />
      ) : hasError ? (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <ImageOff className="h-6 w-6 text-muted-foreground" />
        </div>
      ) : (
        <>
          {!isLoaded && <Skeleton className="w-full h-full absolute inset-0" />}
          <img
            src={src}
            alt={alt}
            className={cn(className, !isLoaded && "opacity-0")}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
          />
        </>
      )}
    </div>
  );
}
```

### Files Changed in Phase 3
| File | Action |
|------|--------|
| `src/components/journal/TradeGalleryCard.tsx` | CREATE |
| `src/components/ui/lazy-image.tsx` | CREATE |
| `src/pages/TradeHistory.tsx` | MODIFY - Add view toggle |
| `src/components/journal/index.ts` | MODIFY - Export new components |

---

## Phase 4: Gallery View Rendering

**Goal**: Render gallery grid using same paginated data

### 4.1 Conditional Rendering Based on ViewMode

```tsx
{viewMode === 'list' ? (
  // Existing list rendering
  <div className="space-y-4">
    {trades.map((entry) => (
      <TradeHistoryCard key={entry.id} {...cardProps} />
    ))}
  </div>
) : (
  // Gallery grid
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {trades.map((entry) => (
      <TradeGalleryCard 
        key={entry.id} 
        trade={entry}
        onTradeClick={handleEnrichTrade}
      />
    ))}
  </div>
)}
```

### 4.2 Share Infinite Scroll Between Views

The `loadMoreRef` div remains at the bottom regardless of view mode.

### 4.3 Filter by "Has Screenshots" (Optional Enhancement)

Add filter option to show only trades with images in gallery mode:

```tsx
{viewMode === 'gallery' && (
  <div className="flex items-center gap-2">
    <Checkbox 
      id="hasImages"
      checked={filterHasImages}
      onCheckedChange={setFilterHasImages}
    />
    <Label htmlFor="hasImages">Only show trades with screenshots</Label>
  </div>
)}
```

### Files Changed in Phase 4
| File | Action |
|------|--------|
| `src/pages/TradeHistory.tsx` | MODIFY - Add gallery rendering |

---

## Phase 5: Polish & Optimization

### 5.1 Prefetch Thumbnails

When gallery mode is active, prefetch next batch of thumbnails:

```typescript
useEffect(() => {
  if (viewMode === 'gallery' && hasNextPage) {
    // Prefetch next page images in background
    const prefetchImages = async () => {
      // Implementation depends on cache strategy
    };
    prefetchImages();
  }
}, [viewMode, hasNextPage]);
```

### 5.2 Add Skeleton States for Gallery

```tsx
function TradeGalleryCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video" />
      <CardContent className="p-3">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
      </CardContent>
    </Card>
  );
}
```

### 5.3 Handle Empty Gallery State

```tsx
{viewMode === 'gallery' && trades.length === 0 && (
  <EmptyState
    icon={ImageOff}
    title="No trades with screenshots"
    description="Upload screenshots via the Journal button to see them here"
  />
)}
```

### 5.4 Update Memory docs

Update `docs/` with new architecture notes for future reference.

---

## Implementation Order

```text
Phase 1: Foundation (CRITICAL)
├── 1.1 Update TradeFilters interface
├── 1.2 Add multi-filter support
├── 1.3 Replace hook in TradeHistory
├── 1.4 Add infinite scroll
└── 1.5 Update stats calculation

Phase 2: Time Range
├── 2.1 Add full history toggle
├── 2.2 Sync filter state
└── 2.3 Optional URL persistence

Phase 3: View Toggle Infrastructure
├── 3.1 Create view mode state
├── 3.2 Add toggle buttons
├── 3.3 Create TradeGalleryCard
└── 3.4 Create LazyImage component

Phase 4: Gallery Rendering
├── 4.1 Conditional rendering
├── 4.2 Shared infinite scroll
└── 4.3 Optional "has images" filter

Phase 5: Polish
├── 5.1 Prefetch optimization
├── 5.2 Skeleton states
├── 5.3 Empty states
└── 5.4 Documentation
```

---

## Data Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│ TradeHistory.tsx                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌──────────────────────────────────────┐  │
│  │ Filter UI   │────▶│ paginatedFilters (memoized)          │  │
│  └─────────────┘     └──────────────────────────────────────┘  │
│                                      │                          │
│                                      ▼                          │
│                      ┌──────────────────────────────────────┐  │
│                      │ useTradeEntriesPaginated()           │  │
│                      │ - limit: 50                          │  │
│                      │ - cursor-based pagination            │  │
│                      │ - returns { pages, fetchNextPage }   │  │
│                      └──────────────────────────────────────┘  │
│                                      │                          │
│                                      ▼                          │
│                      ┌──────────────────────────────────────┐  │
│                      │ trades = pages.flatMap(p => p.trades)│  │
│                      └──────────────────────────────────────┘  │
│                                      │                          │
│                     ┌────────────────┼────────────────┐        │
│                     ▼                ▼                ▼        │
│              ┌──────────┐    ┌─────────────┐   ┌──────────┐   │
│              │ List View│    │ Gallery View│   │ Stats    │   │
│              │ (cards)  │    │ (grid+lazy) │   │ (summary)│   │
│              └──────────┘    └─────────────┘   └──────────┘   │
│                     │                │                          │
│                     └────────┬───────┘                          │
│                              ▼                                  │
│                      ┌──────────────────────────────────────┐  │
│                      │ loadMoreRef (infinite scroll trigger)│  │
│                      └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Principles Enforced

| Principle | Implementation |
|-----------|---------------|
| Pagination WAJIB | `useTradeEntriesPaginated` with cursor |
| Default 1 year | `startDate = subYears(now, 1)` |
| View toggle = cheap | Same data source, different render |
| Images = enhancement | `LazyImage` + `IntersectionObserver` |
| No over-fetch | Only 50 trades per page, lazy load images |

---

## Files Summary

| Phase | File | Action |
|-------|------|--------|
| 1 | `src/hooks/use-trade-entries-paginated.ts` | MODIFY |
| 1 | `src/pages/TradeHistory.tsx` | MODIFY |
| 2 | `src/components/journal/TradeHistoryFilters.tsx` | MODIFY |
| 3 | `src/components/journal/TradeGalleryCard.tsx` | CREATE |
| 3 | `src/components/ui/lazy-image.tsx` | CREATE |
| 3 | `src/components/journal/index.ts` | MODIFY |
| 5 | `docs/FEATURES.md` or memory | UPDATE |

---

## Recommendation

Start with **Phase 1** as it addresses the critical performance issue. Each subsequent phase builds on the previous one without breaking changes.
