

# Account Detail UX Overhaul: State-Aware Information Architecture

Redesign the Account Detail page to show contextually relevant information based on account state, fix the drawdown calculation bug, and clarify the realized vs unrealized P&L model.

---

## Changes

### 1. State-Aware Metrics Strip (AccountDetailMetrics)

**File:** `src/components/accounts/detail/AccountDetailMetrics.tsx`

When `totalTrades === 0`, replace the 5-card metrics grid with a condensed 2-card layout:

- **Card 1: Balance** -- shows current balance and initial capital
- **Card 2: Status** -- "No closed trades yet" with a prompt to start trading

Hide Win Rate, Profit Factor, and Avg P&L cards entirely when there are no trades. These appear only when `totalTrades > 0`.

Add `totalTrades` awareness:
```typescript
const hasTrades = totalTrades > 0;
```

When `hasTrades === false`: render only Balance + Onboarding prompt (2 cards).
When `hasTrades === true`: render the full 5-card strip as-is.

### 2. Equity vs Balance Clarity (AccountDetailHeader)

**File:** `src/components/accounts/detail/AccountDetailHeader.tsx`

For Binance (live) accounts, replace the single "Balance" display with:

```
Balance (Realized): $47.83
Equity:             $48.27
Unrealized P&L:     +$0.44
```

Implementation:
- Accept new props: `unrealizedPnl` and `equity` (balance + unrealized)
- Show the 3-line breakdown when `isBinanceVirtual && unrealizedPnl !== 0`
- For paper/DB accounts, keep the single "Balance" display (no unrealized concept)

**File:** `src/pages/AccountDetail.tsx`

Pass `unrealizedPnl` and computed `equity` (displayBalance + unrealizedPnl) to the header.

### 3. Fix Drawdown Calculation Bug

**File:** `src/pages/AccountDetail.tsx` (equityData memo)

Current drawdown formula:
```typescript
const drawdown = peak > 0 ? ((peak - cumulative) / peak) * 100 : 0;
```

Bug: When cumulative P&L goes negative (e.g., -$5) and peak is $0.44, the formula produces `((0.44 - (-5)) / 0.44) * 100 = 1236%`. This is mathematically wrong -- drawdown should be measured against **initial capital + peak**, not peak P&L alone.

Fix: Use `initialBalance + peak` as the denominator:
```typescript
const drawdownBase = initialBalance + peak;
const drawdown = drawdownBase > 0 ? ((peak - cumulative) / drawdownBase) * 100 : 0;
```

This ensures drawdown is a percentage of total equity at peak, not just cumulative P&L at peak. Maximum drawdown is capped at 100%.

Also apply this fix in `src/components/analytics/charts/DrawdownChart.tsx` for consistency.

### 4. Conditional Rendering in Overview Tab

**File:** `src/components/accounts/detail/AccountDetailOverview.tsx`

When `equityData.length === 0` AND no active positions:
- Show a single onboarding empty state card instead of the equity curve placeholder + hidden drawdown
- Use the existing `EmptyState` component pattern with a contextual message

When there ARE active positions but no closed trades (live account):
- Show only the Active Positions table
- Hide equity curve and drawdown (no closed trade data to chart)

Fee Breakdown: already conditionally rendered (only when `totalFees > 0`) -- no change needed.

### 5. Financial Tab: State-Aware Content

**File:** `src/components/accounts/detail/AccountDetailFinancial.tsx`

Accept `totalTrades` prop. When `totalTrades === 0`:
- Show a simplified card: "No trading activity yet. Financial summary will appear after your first closed trade."
- Hide the Gross/Net P&L breakdown, Fee Breakdown, and Capital Efficiency sections

When `totalTrades > 0`: show full content as-is.

### 6. Remove Unrealized P&L from Metrics Card (De-duplicate)

**File:** `src/components/accounts/detail/AccountDetailMetrics.tsx`

Since unrealized P&L will now be prominently shown in the header (change 2), remove the small unrealized badge from the Net P&L metrics card to avoid redundancy. The metrics strip should only show realized (closed trade) performance.

---

## Technical Details

### Drawdown Fix Formula

Current (broken):
```text
drawdown% = (peak_cumPnL - current_cumPnL) / peak_cumPnL * 100
```
When peak = $0.44 and current = -$5: drawdown = 1236% (impossible)

Fixed:
```text
drawdown% = (peak_cumPnL - current_cumPnL) / (initialBalance + peak_cumPnL) * 100
```
When initialBalance = $47, peak = $0.44, current = -$5:
drawdown = ($0.44 - (-$5)) / ($47 + $0.44) * 100 = 11.5% (realistic)

Cap at 100%:
```typescript
const drawdown = Math.min(drawdownBase > 0 ? ((peak - cumulative) / drawdownBase) * 100 : 0, 100);
```

### State Detection Logic

```typescript
const totalTrades = stats?.totalTrades || 0;
const hasTrades = totalTrades > 0;
const hasActivePositions = isBinanceVirtual && activePositions.length > 0;
```

### Header Equity Display (Live accounts only)

```text
Balance (Realized)    $47.83
Equity                $48.27    <- balance + unrealized
Unrealized P&L        +$0.44   <- colored profit/loss
```

For paper accounts, just show "Balance" as before.

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/accounts/detail/AccountDetailMetrics.tsx` | Conditional 2-card vs 5-card based on trade count; remove unrealized badge |
| `src/components/accounts/detail/AccountDetailHeader.tsx` | Add equity breakdown for live accounts |
| `src/pages/AccountDetail.tsx` | Fix drawdown formula with initialBalance; pass equity/unrealized to header; pass totalTrades to financial |
| `src/components/accounts/detail/AccountDetailOverview.tsx` | State-aware empty states; hide drawdown when no trades |
| `src/components/accounts/detail/AccountDetailFinancial.tsx` | Accept totalTrades; show empty state when 0 |
| `src/components/analytics/charts/DrawdownChart.tsx` | Same drawdown formula fix for consistency |

---

## What Changes

| Before | After |
|--------|-------|
| 5 metric cards showing 0% / 0.00 with no trades | 2 cards (Balance + Status) when no trades |
| "Balance: $47.83" + tiny unrealized badge | Balance / Equity / Unrealized breakdown for live |
| Drawdown showing -300% | Drawdown capped at realistic % using initial capital as base |
| Full financial summary with all zeros | "No trading activity yet" empty state |
| Unrealized shown in both header area and metrics | Unrealized shown only in header equity section |
