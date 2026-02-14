

# LivePriceTicker Marquee: Deep UX Analysis & Fix

## Root Cause

The `SidebarInset` component (`src/components/ui/sidebar.tsx`, line 277) applies `overflow-x-hidden` to the `<main>` wrapper. This is the direct parent of the `LivePriceTicker`.

The ticker's marquee works by:
1. Duplicating all 10 price items (20 total)
2. Setting inner div to `width: max-content` (overflows the container)
3. Animating with `transform: translateX(-50%)` to create a seamless loop
4. On hover: switching to `overflow-x-auto` for manual drag-to-scroll

**Both behaviors are broken** because the grandparent `<main>` clips all horizontal overflow before the ticker's own overflow rules can take effect.

## Fix

Wrap the `LivePriceTicker` content in a container that isolates it from the parent's `overflow-x-hidden`. The fix is to add `overflow-x: clip` to the ticker's own container (which contains overflow within itself) while ensuring the inner scrolling div can animate freely. Specifically:

### File: `src/components/layout/LivePriceTicker.tsx`

The ticker container (line 110-122) currently relies on `overflow-hidden` / `overflow-x-auto` toggling. But with the parent also clipping, the animated inner div's transform is clipped at the `<main>` level.

**Solution**: Change the ticker container to use `overflow: clip` (which clips visually but does not create a scroll container, allowing the CSS animation to work within its own bounds). For the hover/drag state, wrap the scrollable area in an additional inner container that has its own overflow context.

Concretely:
1. Keep the outer container as the visual boundary with `overflow-hidden` (for the animation state)
2. When hovered, switch the **outer container** to `overflow-x-auto` -- but this alone is blocked by the parent's `overflow-x-hidden`
3. The real fix: remove `overflow-x-hidden` from `SidebarInset` and replace with `overflow-x-clip`. `overflow-x-clip` prevents layout-level horizontal scroll bars on the page but does NOT create a scroll container that blocks child `overflow-x-auto` elements.

### File: `src/components/ui/sidebar.tsx`

**Line 277**: Replace `overflow-x-hidden` with `overflow-x-clip`.

`overflow-x-clip` is the modern CSS property that clips overflow visually (like `hidden`) but does **not** establish a new scroll container. This means:
- The page still won't show horizontal scrollbars (same visual result)  
- Child elements like the ticker can manage their own overflow independently
- CSS animations using `transform` on child elements work correctly

## No Other Issues Found

- **Data fetching**: Network request returns 200 with valid data from the edge function proxy
- **Loading state**: Skeleton UI properly renders during loading
- **Mode consistency**: Ticker is mode-agnostic (uses public Binance API, not user-scoped data)
- **Color tokens**: Uses `text-profit` and `text-loss` (valid semantic tokens)
- **Header layout**: Breadcrumbs, TradeModeSelector, search, notifications -- all properly structured

## Technical Summary

| File | Change |
|------|--------|
| `src/components/ui/sidebar.tsx` (line 277) | Replace `overflow-x-hidden` with `overflow-x-clip` |

This single change unblocks both the marquee animation and the drag-to-scroll interaction without affecting any other page layout.

