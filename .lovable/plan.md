
# Trade History & Detail: Final UX Fixes

## Current State

After multiple rounds of fixes, the Trade History page and Trade Detail page are architecturally solid. The analysis confirms:
- Mode isolation via `tradeMode` filter is correct
- Gallery/List toggle works
- Detail page navigation from both gallery and list cards works
- Enrichment merge for Binance positions works
- Back navigation uses `navigate(-1)` with fallback

## Remaining Issue

### 1. ACTIVE Console Warning: `TradeGalleryCard` Cannot Be Given Refs

**Console output** (visible right now on `/history`):
```
Warning: Function components cannot be given refs.
Check the render method of `TradeHistoryContent`.
at TradeGalleryCard
```

**Root cause**: React's reconciler or a parent component (potentially the `Card` inside `TradeGalleryCard` or the Tooltip) is attempting to forward a ref to the `TradeGalleryCard` function component. Since it's a plain function component without `React.forwardRef`, the ref is dropped and React logs a warning.

**Fix**: Wrap `TradeGalleryCard` with `React.forwardRef` so it can accept refs cleanly.

---

## Implementation

### File: `src/components/journal/TradeGalleryCard.tsx`

- Wrap `TradeGalleryCard` with `forwardRef` to accept and forward refs to the root `Card` element
- This is a non-breaking change -- the component interface stays the same, it just additionally supports refs

```typescript
import { forwardRef } from "react";

export const TradeGalleryCard = forwardRef<HTMLDivElement, TradeGalleryCardProps>(
  function TradeGalleryCard({ trade, onTradeClick }, ref) {
    // ... same body, but pass ref to root <Card ref={ref}>
  }
);
```

### Files Modified

| File | Change |
|------|--------|
| `src/components/journal/TradeGalleryCard.tsx` | Add `forwardRef` wrapper to resolve console warning |
