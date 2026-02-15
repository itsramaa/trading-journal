

# Backtest Engine: Leverage Model Fix

Addresses the critical leverage × risk distortion. The other two concerns (PnL unit consistency and exposure overlap) are verified safe -- no changes needed.

---

## Issue: Leverage Multiplies Risk Instead of Reducing Margin

**Current code (line 326):**
```
quantity = (riskAmount / stopDistance) * leverageMultiplier
```

This makes a 10x leveraged trade risk 10x the intended amount. That is not how futures work -- leverage reduces margin requirement, not increases risk per trade.

**Correct model:**

In futures, risk is always:
```
PositionSize = RiskAmount / StopDistance
```

Leverage only determines how much margin (collateral) is required to hold that position:
```
MarginRequired = (PositionSize * EntryPrice) / Leverage
```

So **quantity stays the same regardless of leverage**. What changes is whether the trader has enough margin to open the position.

### Fix

**File:** `supabase/functions/backtest-strategy/index.ts` (lines 321-326)

Replace the position sizing block:

```typescript
const riskBase = config.compounding ? balance : config.initialCapital;
const riskPercent = config.riskPerTrade || 0.02;
const riskAmount = riskBase * riskPercent;
const stopDistance = entryPrice * (slPercent / 100);
const quantity = riskAmount / stopDistance;  // Leverage does NOT scale risk

// Margin check: ensure position fits within available margin
const leverageMultiplier = config.leverage || 1;
const notionalValue = quantity * entryPrice;
const marginRequired = notionalValue / leverageMultiplier;

// If margin exceeds available balance, cap position size
const finalQuantity = marginRequired > balance
  ? (balance * leverageMultiplier) / entryPrice
  : quantity;
```

Use `finalQuantity` instead of `quantity` in the position object.

This means:
- **Low leverage**: May cap position size if margin is insufficient (realistic constraint)
- **High leverage**: Allows the full risk-based position because margin requirement is lower
- **Risk per trade**: Always determined by stop distance, never by leverage

### PnL Calculation Impact

The existing PnL formula (line 369-372) uses `position.quantity * price_delta` which remains correct -- the P&L on a futures position is based on notional size, not margin.

---

## Verified Safe: No Changes Needed

### PnL Unit Consistency
- `rawPnl` = gross (price delta x quantity)
- `pnl` = `rawPnl - commission` = net
- `totalPnl` = sum of net `pnl` values
- `grossPnl = totalPnl + totalCommissions` = correct reconstruction
- Units are consistent.

### Exposure Overlap
- Engine uses single-position model (`position = null` on exit, line 390)
- No pyramiding or concurrent positions possible
- Simple sum of trade durations is accurate

---

## Technical Summary

| File | Changes |
|------|---------|
| `supabase/functions/backtest-strategy/index.ts` | Replace leverage x quantity with margin-based position cap; leverage only affects margin requirement |

No other files need changes.
