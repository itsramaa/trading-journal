
# Fix: AI Says "No Capital Deployed" When There Is

## Root Cause

In `AIInsightsWidget.tsx` lines 126-128, when `portfolio.source === 'binance'`:
- `deployedCapital` is hardcoded to `0` (with comment "Binance positions tracked separately")
- This makes `deploymentPercent` = 0% in the edge function prompt
- `openPositions` depends on `useBinancePositions()` data which may not be loaded when insights auto-fire

The AI receives "Capital deployment: 0%, Open Positions: 0" and correctly (from its perspective) says "no capital deployed and no open positions."

## Fix

### File: `src/components/dashboard/AIInsightsWidget.tsx`

**Change `deployedCapital` calculation (lines 126-128):**
- For Binance mode: calculate from `positions` array using notional value (`Math.abs(positionAmt) * markPrice` or `positionInitialMargin`)
- Fallback: if positions array is empty but portfolio shows capital, use `portfolio.totalCapital` as a proxy (capital exists even if deployment calc isn't ready)

**Change `openPositions` calculation (lines 131-133):**
- Add fallback: also check `usePositions()` hook (the unified positions hook already used in PortfolioOverviewCard) which covers both paper and Binance sources

**Guard auto-load timing (line 178):**
- Add condition: don't auto-fire insights until positions data is also loaded (when in Binance mode), to prevent stale "0 positions" being sent to the AI

### Technical Detail

```
// Before (broken):
const deployedCapital = portfolio.source === 'binance' 
  ? 0 
  : trades.filter(...)

// After (fixed):
const deployedCapital = portfolio.source === 'binance'
  ? positions
      .filter(p => p.positionAmt !== 0)
      .reduce((sum, p) => sum + Math.abs(p.positionInitialMargin || 0), 0)
  : trades.filter(t => t.status === 'open')
      .reduce((sum, t) => sum + (t.quantity * t.entry_price), 0);
```

For `openPositions`, use the same unified `usePositions` hook that `PortfolioOverviewCard` already uses, ensuring consistency.

For auto-load guard, add a check so insights don't fire until Binance positions are loaded when in live mode:
```
// Add to auto-load condition (line 178):
const positionsReady = portfolio.source !== 'binance' || positions.length >= 0; 
// Actually: check isLoading from useBinancePositions
```

## Files to Modify

| File | Change |
|------|--------|
| `src/components/dashboard/AIInsightsWidget.tsx` | Fix deployedCapital from positions, guard auto-load timing |
