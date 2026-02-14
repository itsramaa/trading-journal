

# Trading Journal: Gallery/List View + Trade Detail Layout Overhaul

## Change 1: Add Gallery/List View Toggle to Trading Journal

Currently the Trading Journal (`/trading`) only shows positions in a table (`AllPositionsTable`). The Trade History page already has a gallery/list toggle with default "gallery". The Journal should have the same pattern for consistency.

### What changes

**File: `src/pages/trading-journey/TradingJournal.tsx`**
- Add `viewMode` state (`useState<ViewMode>('gallery')`) using existing `ViewMode` type from `@/lib/constants/trade-history`
- Add a `ToggleGroup` (List / Gallery) inside the Trade Management card header, same pattern as `TradeHistoryToolbar`
- Pass `viewMode` down to the content area

**File: `src/components/journal/AllPositionsTable.tsx`**
- Add optional `viewMode` prop (default: `'list'` for backward compatibility)
- When `viewMode === 'gallery'`, render positions as a grid of gallery cards instead of the table
- Create an inline `PositionGalleryCard` component that shows: CryptoIcon, symbol, direction badge, P&L badge, entry price, source badge, leverage — similar to `TradeGalleryCard` but for open positions (no screenshot, shows unrealized P&L)
- Clicking a gallery card navigates to the detail page (same as Eye icon)

### Gallery card layout (open positions)
```
+---------------------------+
| [LONG]          +$124.50  |
|                           |
|  BTC/USDT   10x           |
|  Entry: 67,234.00         |
|  [Paper]   [ACTIVE]       |
+---------------------------+
```

---

## Change 2: Redesign Trade Detail Page Layout

The current layout uses a flat 2-column grid of `SectionCard` components with `DetailRow` (label-value pairs). Issues:
- Too many cards of varying height create visual imbalance
- No clear visual hierarchy between primary data (price, P&L) and secondary data (metadata)
- Header lacks a prominent P&L display
- Dense rows make scanning difficult

### New layout structure

**Header section (full width)**
- Back button + Symbol + Direction badge + Status badges (same as now)
- Large P&L display prominently on the right (not buried inside a card)
- Action buttons (Enrich, Edit)

**Primary info bar (full width, no card)**
- Horizontal stat row: Entry | Exit | Quantity | Leverage | R-Multiple
- Similar to a "key metrics strip" pattern

**2-column grid (main content)**
- Left column: Price & Performance card, Timing card, Timeframe Analysis card
- Right column: Strategy & Setup card, Journal Enrichment card (notes, tags, lessons)

**Full-width sections (below grid)**
- Screenshots gallery (if any)
- AI Post-Trade Analysis (if any)
- Metadata (collapsible, low priority)

### Technical changes

**File: `src/pages/trading-journey/TradeDetail.tsx`** -- full rewrite of the JSX layout:

1. **Header redesign**: Add large P&L number with color coding next to symbol. Move action buttons to a sticky or prominent position.

2. **Key Metrics Strip**: A horizontal row of 5-6 key stats in a single Card, using a grid layout with clear labels and values. This replaces burying these in nested cards.

3. **2-column layout**: Use `grid md:grid-cols-3` with left taking `col-span-2` for price/timing data and right taking `col-span-1` for journal/strategy data. This gives more space to quantitative data.

4. **SectionCard improvements**: 
   - Remove excessive `Separator` dividers inside cards
   - Group related fields with subtle backgrounds instead
   - Use `grid grid-cols-2` inside price card for compact 2-col display of related pairs (Entry/Exit, SL/TP)

5. **Screenshots**: Full-width grid below main content, larger thumbnails (aspect-video instead of h-24)

6. **Metadata**: Collapsed by default using `Collapsible` component

7. **Empty section hiding**: Sections with no data are completely hidden (not shown with all dashes)

### Visual hierarchy (top to bottom)
```
[Back] BTCUSDT [LONG] [ACTIVE]              +$1,234.56
------------------------------------------------------
| Entry    | Exit     | Size  | Leverage | R-Multiple |
| 67,234   | 68,468   | 0.5   | 10x      | 2.3R       |
------------------------------------------------------

+-- Price & Performance ----+  +-- Strategy & Setup ------+
| Entry: 67,234.00          |  | Strategies: [ICT] [SMC]  |
| Exit:  68,468.00          |  | Signal: BOS + FVG         |
| SL:    66,800.00          |  | Condition: Trending       |
| TP:    69,000.00          |  | Confluence: 4/5           |
| Gross P&L: +$617.00      |  | AI Quality: 82            |
| Net P&L:   +$612.50      |  +---------------------------+
+---------------------------+  
                               +-- Timeframes ------------+
+-- Timing -----------------+  | HTF: 4H                  |
| Trade Date: 14 Feb 2026   |  | Execution: 15M           |
| Entry: 14 Feb, 09:15      |  | Precision: 1M            |
| Exit:  14 Feb, 14:22      |  +---------------------------+
| Hold Time: 5h 7m          |
| Session: London           |  +-- Journal ---------------+
+---------------------------+  | Emotion: Confident       |
                               | Notes: "Clean setup..."   |
                               | Lesson: "Wait for conf.." |
                               | Tags: [breakout] [trend]  |
                               +---------------------------+

+-- Screenshots (3) ----------------------------------------+
| [img1]        [img2]        [img3]                        |
+-----------------------------------------------------------+

+-- AI Analysis --------------------------------------------+
| Entry Timing: Good  | Exit Efficiency: Excellent          |
| Review: "Strong entry on BOS confirmation..."             |
+-----------------------------------------------------------+

> Metadata (click to expand)
```

### Files modified

| File | Action |
|------|--------|
| `src/pages/trading-journey/TradingJournal.tsx` | Add viewMode state + toggle UI |
| `src/components/journal/AllPositionsTable.tsx` | Add gallery view rendering mode |
| `src/pages/trading-journey/TradeDetail.tsx` | Redesign layout with proper hierarchy |

