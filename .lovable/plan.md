

# Add Solscan Link & Clickable Tag Filters

## Overview
Two enhancements to TradeHistoryCard and the Trade History filter system:
1. **Solscan link** for Solana-sourced trades
2. **Clickable tags** that auto-filter Trade History

## Changes

### 1. TradeHistoryCard — Solscan Link

**File**: `src/components/trading/TradeHistoryCard.tsx`

- Add `ExternalLink` icon import from lucide-react
- After the existing "Binance" source badge, add a conditional Solana source badge with Solscan link:
  - Condition: `entry.source === 'solana' && entry.binance_trade_id` (signature stored in `binance_trade_id`)
  - Render: Badge with external link icon + "Solscan" text, wrapped in `<a>` targeting `https://solscan.io/tx/{signature}`
  - Style: `border-purple-500 text-purple-500` (Solana brand color)

### 2. Clickable Tags — TradeHistoryCard

**File**: `src/components/trading/TradeHistoryCard.tsx`

- Add `onTagClick?: (tag: string) => void` prop to `TradeHistoryCardProps`
- Make tag badges clickable: wrap each tag `Badge` with an `onClick` that calls `onTagClick?.(tag)`
- Add `cursor-pointer hover:bg-accent` styling when `onTagClick` is provided
- Stop propagation so tag click doesn't trigger card-level clicks

### 3. Tag Filter State — Hook

**File**: `src/hooks/use-trade-history-filters.ts`

- Add `selectedTags: string[]` to `TradeHistoryFiltersState`
- Add `setSelectedTags` setter
- Include `selectedTags.length > 0` in `hasActiveFilters` and `activeFilterCount`
- Clear `selectedTags` in `clearAllFilters`

### 4. Tag Filter UI — TradeHistoryFilters Component

**File**: `src/components/journal/TradeHistoryFilters.tsx`

- Add props: `selectedTags: string[]`, `onTagsChange: (tags: string[]) => void`
- Add tag filter badge display in the active filters section (with X to remove)
- No dropdown needed -- tags are added by clicking on trade cards

### 5. Wire Tag Filter — TradeHistory Page

**File**: `src/pages/TradeHistory.tsx`

- Pass `selectedTags` from filter hook to the query filters
- Pass `onTagClick` callback to `TradeHistoryCard` that adds the tag to `selectedTags`
- Pass `selectedTags` and `onTagsChange` to `TradeHistoryFilters`

### 6. Query Filter — Apply Tag Filter

**File**: `src/hooks/use-trade-entries-paginated.ts` (or wherever `TradeFilters` is defined)

- Add `selectedTags?: string[]` to `TradeFilters`
- Apply `.contains('tags', [tag])` for each selected tag in the Supabase query (AND logic: trade must have all selected tags)

## Technical Notes

- Solana signature is stored in `binance_trade_id` field (reused for dedup across sources)
- `source` field value is `'solana'` for Solana-imported trades (set in `use-solana-trade-import.ts`)
- Tag filter uses Supabase `.contains()` for array column filtering
- Tags are additive: clicking multiple tags narrows results (AND behavior)
- Clicking same tag again removes it from filter (toggle behavior)

## Files Modified

| File | Change |
|------|--------|
| `src/components/trading/TradeHistoryCard.tsx` | Add Solscan link badge + `onTagClick` prop |
| `src/hooks/use-trade-history-filters.ts` | Add `selectedTags` state |
| `src/components/journal/TradeHistoryFilters.tsx` | Add tag filter badge display |
| `src/pages/TradeHistory.tsx` | Wire `onTagClick` + pass tag filter props |
| `src/hooks/use-trade-entries-paginated.ts` | Apply `selectedTags` filter to query |
| `docs/FEATURE-MATRIX.md` | Mark Feature #21 and #43 as implemented |
