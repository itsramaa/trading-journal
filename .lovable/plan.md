

# Heatmap Page: Deep UX Analysis & Fixes

## Issues Found

### 1. Duplicated CSV Export Logic (DRY Violation)

The page defines a full `exportToCSV` function (lines 177-220) that duplicates `src/lib/export/heatmap-export.ts` line-for-line. However, the UI actually renders a `<Link to="/export?tab=analytics">` button (line 287) instead of calling the inline function. The inline `exportToCSV` is **dead code** — never called anywhere.

**Fix**: Remove the dead `exportToCSV` function and its related imports. The Export button already correctly links to the dedicated Export page.

### 2. Hardcoded Colors Violate Semantic Design System

`SESSION_CONFIG` (lines 226-230) uses raw Tailwind colors (`text-purple-500`, `text-blue-500`, `text-orange-500`, `text-yellow-500`) instead of the design tokens established in `SESSION_COLORS` from `src/lib/session-utils.ts`.

Additionally, streak cards use hardcoded colors:
- Line 381: `text-orange-500` on Flame icon
- Line 397: `text-blue-500` on Snowflake icon

The session card icons should use colors from the centralized `SESSION_COLORS` map, and streak icons should use semantic tokens (`text-[hsl(var(--chart-4))]` for warning/streak, `text-[hsl(var(--chart-5))]` for loss streak).

**Fix**: Replace hardcoded session colors with extracted icon color classes derived from `SESSION_COLORS`. Replace streak icon colors with chart semantic tokens.

### 3. SESSION_CONFIG Defined Inside Component Body

`SESSION_CONFIG` (line 225) is defined inside `TradingHeatmapPage`, causing it to be recreated on every render. It has no dependency on component state or props.

**Fix**: Extract `SESSION_CONFIG` to module level as a constant.

### 4. No Mode Awareness Issues (Correctly Implemented)

The page uses `useModeFilteredTrades()` which already handles Paper/Live isolation. No `showExchangeData` guards are present — **this is correct** because the Heatmap is a pure analytics view that works identically in both modes. The layout, flow, and components are mode-agnostic by design. No fix needed.

### 5. TradingHeatmap Component Uses `trade.pnl || 0` Instead of Standardized Helper

Both `TradingHeatmap.tsx` (line 101) and the page (lines 90, 122, 148, 192) use inline `trade.realized_pnl || trade.pnl || 0` instead of the standardized `getTradeNetPnl()` helper from `src/lib/trading-calculations.ts`. Per the `standardized-pnl-calculation-logic` memory, this helper is the single source of truth.

However, this is a minor consistency issue — the inline logic matches the helper's behavior. For consistency and maintainability, aligning with the helper would be ideal, but the impact is low. Noting for awareness; no fix in this batch to keep scope focused.

---

## Implementation Plan

### File: `src/pages/TradingHeatmap.tsx`

1. **Remove dead `exportToCSV` function** (lines 177-220) and cleanup unused variables/imports
2. **Extract `SESSION_CONFIG` to module level** — move outside the component
3. **Replace hardcoded session colors**: Use semantic icon colors extracted from `SESSION_COLORS` patterns (purple, blue, orange, yellow are session-specific semantic choices — keep them but source from a centralized map)
4. **Replace streak icon colors**: `text-orange-500` -> `text-[hsl(var(--chart-4))]`, `text-blue-500` -> `text-[hsl(var(--chart-5))]`

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/pages/TradingHeatmap.tsx` | Remove dead exportToCSV; extract SESSION_CONFIG to module level; replace hardcoded streak icon colors with semantic chart tokens |

