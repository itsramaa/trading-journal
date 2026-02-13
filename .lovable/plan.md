

# UI/UX Fixes — Full Sync, Heatmap, Ticker

## Overview

5 distinct issues to fix across 4 files.

---

## 1. Full Sync — Progress Bar Sizing (BinanceFullSyncPanel.tsx)

**Problem:** Progress bar `h-2` with `min-w-[200px]` container creates disproportionate layout. The progress section is constrained inside a flex row with padding that doesn't fill the card width.

**Fix:** Make `SyncProgressIndicator` use full-width layout instead of inline flex. Progress bar expands to fill card, phase info stacks above.

**Changes in `SyncProgressIndicator` (lines 413-451):**
- Remove the horizontal flex layout (`flex items-center gap-3`)
- Use vertical stack: phase label + percentage on top row, full-width progress bar below, message + ETA below that
- Progress bar: `h-2.5 w-full` (instead of `h-2` inside a `min-w-[200px]` container)
- Remove `min-w-[200px]` constraint

---

## 2. Full Sync — Sync Log Panel (BinanceFullSyncPanel.tsx)

**Problem:** No visible log output during sync. Users can't see what's happening step-by-step.

**Fix:** Add a `SyncLogPanel` component that captures and displays log entries in a scrollable terminal-style view. Integrate with the sync store to accumulate log messages.

**Changes:**
- **sync-store.ts**: Add `syncLogs: string[]` array and `addSyncLog(msg)` / `clearSyncLogs()` actions
- **use-binance-aggregated-sync.ts**: Call `addSyncLog()` at key points (fetch start, symbol processing, errors, rate limits, batch inserts, completion)
- **BinanceFullSyncPanel.tsx**: Add a `SyncLogPanel` component below the progress indicator:
  - Collapsible section with "Show Logs" toggle
  - Dark background (`bg-muted/50`), monospace font, max-h with overflow-y-auto
  - Auto-scroll to bottom on new entries
  - Each log entry timestamped `[HH:mm:ss]`
  - Error lines highlighted in `text-destructive`, warnings in `text-warning`
  - Show log panel during `running`, `success`, and `error` states
  - "Clear Logs" button

---

## 3. Full Sync — Force Sync Deletes First (use-binance-aggregated-sync.ts)

**Problem:** Force re-fetch doesn't explicitly delete old data before starting sync. The description says "delete existing trades" but the actual deletion order isn't guaranteed.

**Fix:** In the sync execution flow, when `forceRefetch` is true, perform the delete operation **first** (before any fetch calls), log it to the sync log, and only then proceed with fetching.

**Changes in `use-binance-aggregated-sync.ts`:**
- Move or ensure the delete step runs as the very first operation when `forceRefetch === true`
- Add a new phase label `'deleting'` with log output: "Deleting existing Binance trades..."
- Add `'deleting': 'Deleting Old Data'` to `PHASE_LABELS` in `BinanceFullSyncPanel.tsx`
- Progress shows the delete phase before `fetching-income`

---

## 4. Trading Heatmap — Grid Gap + Session Layout (TradingHeatmap.tsx, TradingHeatmap page)

**4a. Heatmap Grid Gap**

**Problem:** Grid cells have no gap (`mb-1` only on rows, no horizontal gap between day columns).

**Fix in `TradingHeatmap.tsx`:**
- Add `gap-1.5` (or `gap-2`) between day columns in the flex row (line 200, 215)
- Apply same gap to header row (line 189)

**4b. Time-Based Win Rate Position**

**Problem:** On Performance page, `TradingHeatmapChart` (Time-Based Win Rate) sits side-by-side with `SessionPerformanceChart` in `lg:grid-cols-2`. User wants it **below** the Session Performance card, not beside it.

**Fix in `Performance.tsx` (line 594):**
- Change from `grid gap-6 lg:grid-cols-2` to stacked layout:
  ```tsx
  <div className="space-y-6">
    <SessionPerformanceChart bySession={contextualData.bySession} />
    <TradingHeatmapChart trades={filteredTrades} />
  </div>
  ```

---

## 5. Loading Skeleton Animation (loading-skeleton.tsx)

**Problem:** Skeleton components use Radix `Skeleton` which has a static pulse. User wants visible animation.

**Fix:** The `Skeleton` component likely already has `animate-pulse`. Verify and if not, add `animate-pulse` class. Also add a subtle shimmer gradient animation for a more professional look.

**Changes in `src/components/ui/skeleton.tsx`:** Add shimmer keyframe animation overlay to make loading visually dynamic instead of static.

---

## 6. Marquee Ticker — Scroll Fix + Grab Cursor (LivePriceTicker.tsx)

**Problem:** Marquee animation not running. On hover, should switch to manual horizontal scroll with grab cursor instead of just pausing.

**Fix:**
- Debug why animation doesn't run — likely the `overflow-hidden` on parent or CSS specificity issue. Ensure `ticker-scroll` class applies correctly.
- Replace hover behavior: instead of `animation-play-state: paused`, on hover:
  - Pause the CSS animation
  - Show `cursor: grab` (and `cursor: grabbing` on mousedown)
  - Enable manual horizontal drag-to-scroll using `onMouseDown/Move/Up` handlers
- Add `useRef` + mouse event handlers for drag scroll
- Container needs `overflow-x: auto` when dragging (but `overflow: hidden` otherwise to hide scrollbar)

---

## Files Modified

| File | Changes |
|------|---------|
| `src/store/sync-store.ts` | Add `syncLogs`, `addSyncLog()`, `clearSyncLogs()` |
| `src/hooks/use-binance-aggregated-sync.ts` | Log events to store, ensure force-delete runs first with 'deleting' phase |
| `src/components/trading/BinanceFullSyncPanel.tsx` | Fix progress layout, add SyncLogPanel, add 'deleting' phase label |
| `src/components/analytics/TradingHeatmap.tsx` | Add gap between grid cells |
| `src/pages/Performance.tsx` | Stack Time-Based Win Rate below Session Performance |
| `src/components/layout/LivePriceTicker.tsx` | Fix marquee animation, add drag-to-scroll on hover with grab cursor |
| `src/components/ui/skeleton.tsx` | Add shimmer animation for loading skeletons |

