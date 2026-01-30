
# Plan: Implementasi Phase 2 - Account Data Enhancement

## Overview

Mengimplementasi 5 endpoint Binance Futures yang memerlukan API Key (USER_DATA permission) untuk meningkatkan akurasi P&L, position sizing, dan risk management.

| Endpoint | Use Case | Impact |
|----------|----------|--------|
| Commission Rate | Exact fee calculation | Medium |
| Leverage Brackets | Position size limits | Medium |
| Force Orders | Liquidation history | **Critical** |
| Position Mode | Hedge/One-way detection | Medium |
| All Orders | Complete order history | Medium |

---

## Implementation Steps

### 1. Extend Edge Function (`binance-futures/index.ts`)

Tambahkan 5 handler baru pada edge function yang sudah ada:

```typescript
// New actions to add:
case 'commission-rate':
  result = await getCommissionRate(apiKey, apiSecret, symbol);
  break;
  
case 'leverage-brackets':
  result = await getLeverageBrackets(apiKey, apiSecret, symbol);
  break;
  
case 'force-orders':
  result = await getForceOrders(apiKey, apiSecret, params);
  break;
  
case 'position-mode':
  result = await getPositionMode(apiKey, apiSecret);
  break;
  
case 'all-orders':
  result = await getAllOrders(apiKey, apiSecret, symbol, params);
  break;
```

**Endpoint Details:**

| Action | Endpoint | Method |
|--------|----------|--------|
| `commission-rate` | `/fapi/v1/commissionRate` | GET |
| `leverage-brackets` | `/fapi/v1/leverageBracket` | GET |
| `force-orders` | `/fapi/v1/forceOrders` | GET |
| `position-mode` | `/fapi/v1/positionSide/dual` | GET |
| `all-orders` | `/fapi/v1/allOrders` | GET |

---

### 2. Add TypeScript Types (`features/binance/types.ts`)

```typescript
// Commission Rate
interface CommissionRate {
  symbol: string;
  makerCommissionRate: number;  // e.g., 0.0002 (0.02%)
  takerCommissionRate: number;  // e.g., 0.0004 (0.04%)
}

// Leverage Brackets
interface LeverageBracket {
  symbol: string;
  notionalCoef: number;
  brackets: {
    bracket: number;
    initialLeverage: number;
    notionalCap: number;
    notionalFloor: number;
    maintMarginRatio: number;
    cum: number;
  }[];
}

// Force Orders (Liquidations)
interface ForceOrder {
  orderId: number;
  symbol: string;
  status: string;
  side: 'BUY' | 'SELL';
  price: string;
  avgPrice: string;
  origQty: string;
  executedQty: string;
  type: string;
  time: number;
  updateTime: number;
}

// Position Mode
interface PositionMode {
  dualSidePosition: boolean;  // true = Hedge, false = One-way
}

// Update BinanceAction type
type BinanceAction = 
  | 'validate' | 'balance' | 'positions' | 'trades' 
  | 'open-orders' | 'place-order' | 'cancel-order' | 'income'
  | 'commission-rate'      // NEW
  | 'leverage-brackets'    // NEW  
  | 'force-orders'         // NEW
  | 'position-mode'        // NEW
  | 'all-orders';          // NEW
```

---

### 3. Create React Hooks (`features/binance/useBinanceAccountData.ts`)

```typescript
// Commission rate for accurate fee calculation
export function useBinanceCommissionRate(symbol: string)

// Leverage brackets for position sizing limits
export function useBinanceLeverageBrackets(symbol?: string)

// Force orders for liquidation history
export function useBinanceForceOrders(params?: ForceOrderParams)

// Position mode (hedge vs one-way)
export function useBinancePositionMode()

// All orders history (not just trades)
export function useBinanceAllOrders(symbol: string, params?: AllOrdersParams)

// Combined hook for Position Calculator
export function usePositionSizingData(symbol: string)
```

---

### 4. Update Feature Exports (`features/binance/index.ts`)

```typescript
// Phase 2: Account data hooks
export * from './account-data-types';
export * from './useBinanceAccountData';

export {
  useBinanceCommissionRate,
  useBinanceLeverageBrackets,
  useBinanceForceOrders,
  useBinancePositionMode,
  useBinanceAllOrders,
  usePositionSizingData,
} from './useBinanceAccountData';
```

---

### 5. Update Documentation

Mark Phase 2 as **IMPLEMENTED** in `docs/binance/BINANCE_ENHANCEMENT_PROPOSAL.md`

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/binance-futures/index.ts` | Modify | Add 5 new action handlers |
| `src/features/binance/types.ts` | Modify | Add Phase 2 types |
| `src/features/binance/useBinanceAccountData.ts` | **Create** | New hooks for account data |
| `src/features/binance/index.ts` | Modify | Export new hooks |
| `docs/binance/BINANCE_ENHANCEMENT_PROPOSAL.md` | Modify | Update status |

---

## Integration Points (Immediate Use Cases)

### Position Size Calculator
```typescript
// Use actual commission rates instead of hardcoded 0.04%
const { data: rates } = useBinanceCommissionRate("BTCUSDT");
const fee = isMarketOrder ? rates.takerCommissionRate : rates.makerCommissionRate;
```

### Risk Management
```typescript
// Track liquidation history for AI learning
const { data: liquidations } = useBinanceForceOrders({ limit: 100 });
// Display in Risk Event Log
```

### Trade Entry Wizard
```typescript
// Validate positionSide before order placement
const { data: mode } = useBinancePositionMode();
const positionSide = mode?.dualSidePosition ? "LONG" : "BOTH";
```

### Leverage Tier Warnings
```typescript
// Show max leverage per position size tier
const { data: brackets } = useBinanceLeverageBrackets("BTCUSDT");
// Warn if position exceeds tier limit
```

---

## Technical Notes

1. **All endpoints require API key** - Will return error if not configured
2. **Rate limits** - Same as other authenticated endpoints (10 requests/second)
3. **Caching strategy**:
   - Commission Rate: 5 min stale (rarely changes)
   - Leverage Brackets: 1 hour stale (static per symbol)
   - Force Orders: 1 min stale (historical data)
   - Position Mode: 5 min stale (user config)
   - All Orders: 1 min stale (active data)

4. **Force Orders is CRITICAL** - Essential for:
   - Risk audit trail
   - AI learning from liquidation patterns
   - Position size recommendations based on historical liquidations

---

## Benefits

1. **Accurate P&L** - Exact commission rates instead of estimates
2. **Better Position Sizing** - Leverage tier awareness
3. **Risk Prevention** - Learn from liquidation history
4. **Order Validation** - Correct hedge/one-way mode parameters
5. **Complete History** - All orders including cancelled/rejected
