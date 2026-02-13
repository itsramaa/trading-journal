

# UI/UX Polish — Heatmap, AI Insights, Risk Calculator

## Current State

All three pages are functionally complete with proper loading skeletons, empty states, filters, and data display. Previous iterations addressed loading states, DRY refactors, and `keepPreviousData`. The remaining issues are minor polish items.

## Issues Found

| # | Page | Issue | Severity |
|---|------|-------|----------|
| 1 | Heatmap | Grammar: "1 trades" / "1 wins" / "1 losses" — missing pluralization | LOW |
| 2 | Heatmap | Grid cells only occupy ~60% of card width — empty space on right side | LOW |
| 3 | Heatmap | Session card `+$1.47` shows green Tokyo but `-$9.71` Sydney shows 0.0% win rate even with 9 trades (all losses) — display is correct but no tooltip explaining the 0% | MINOR |
| 4 | Risk Calculator | No sidebar link visible — page is only accessible via `/calculator` route, not in sidebar navigation under ANALYTICS or a TOOLS section | NOTE |

## Fixes

### 1. Pluralization Helper (`src/pages/TradingHeatmap.tsx`)

Add inline pluralization for streak cards:

```tsx
// Line 386
<div className="text-lg font-bold">
  {streakData.longestWin} {streakData.longestWin === 1 ? 'trade' : 'trades'}
</div>
// Line 388
Current: {streakData.currentStreak > 0
  ? `${streakData.currentStreak} ${streakData.currentStreak === 1 ? 'win' : 'wins'}`
  : 'N/A'}

// Line 402 (longestLoss)
{streakData.longestLoss} {streakData.longestLoss === 1 ? 'trade' : 'trades'}
// Line 404
Current: {streakData.currentStreak < 0
  ? `${Math.abs(streakData.currentStreak)} ${Math.abs(streakData.currentStreak) === 1 ? 'loss' : 'losses'}`
  : 'N/A'}
```

### 2. Heatmap Grid Full-Width (`src/components/analytics/TradingHeatmap.tsx`)

The heatmap cells use fixed `w-14` / `w-12` widths, causing the grid to not fill the card. Change to `flex-1` layout so cells stretch evenly across the available width.

**Before:** Fixed `w-14` per day column + `w-12` cells
**After:** `flex-1` per day column with `min-w-[48px]` so cells expand to fill the card

### 3. No Changes Needed

- **AI Insights**: Fully implemented — tabs, insights cards, action items, pair rankings, session insights, contextual performance, export button, empty state, loading skeleton. No gaps found.
- **Risk Calculator**: Fully implemented — trading pair selector, market score widget, context warnings, calculator inputs with tooltips, results, commission rates, leverage info, R-multiple reference, risk adjustment breakdown, volatility stop-loss tab, loading skeleton. No gaps found.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/TradingHeatmap.tsx` | Pluralization fix for streak values |
| `src/components/analytics/TradingHeatmap.tsx` | Grid cells expand to full card width |

## Impact

- Grammar correctness on all streak card values (1 trade vs 2 trades)
- Heatmap grid fills the full card width for a more polished, professional look
- No functional changes — purely visual/text polish

