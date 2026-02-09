
# Plan: Integrasi Binance Open Orders ke Trading Journal

## Problem Statement
Tab "Pending" di Trading Journal saat ini **hanya menampilkan paper trades lokal** yang belum memiliki entry price. **Binance Open Orders** (limit orders, stop orders yang belum terisi) tidak diambil atau ditampilkan sama sekali.

## Root Cause Analysis

```text
┌──────────────────────────────────────────────────────────────────┐
│                    Current State                                  │
├──────────────────────────────────────────────────────────────────┤
│  TradingJournal.tsx                                              │
│  ├── useBinancePositions()    ✅ Used for Active tab             │
│  ├── useBinanceOpenOrders()   ❌ NOT USED (hook exists!)         │
│  └── useTradeEntries()        ✅ Used for paper trades           │
│                                                                   │
│  Tab "Pending" currently shows:                                   │
│  └── Paper trades where entry_price = 0 or null                  │
│                                                                   │
│  Tab "Pending" SHOULD also show:                                  │
│  └── Binance Open Orders (LIMIT, STOP, TAKE_PROFIT orders)       │
└──────────────────────────────────────────────────────────────────┘
```

## Solution Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                       Proposed Architecture                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────┐    ┌────────────────────┐                   │
│  │ useBinanceOpenOrders │────►│ BinanceOpenOrders  │                │
│  │ (existing hook)      │    │ Table (NEW)        │                  │
│  └────────────────────┘    └────────────────────┘                   │
│            │                          │                              │
│            ▼                          ▼                              │
│  ┌────────────────────────────────────────────────┐                 │
│  │          TradingJournal "Pending" Tab           │                │
│  │                                                  │                │
│  │   ┌─────────────────────────────────────────┐  │                 │
│  │   │  Section 1: Binance Open Orders          │  │                │
│  │   │  - LIMIT orders awaiting fill            │  │                │
│  │   │  - STOP orders not triggered             │  │                │
│  │   │  - Cancel button per order               │  │                │
│  │   └─────────────────────────────────────────┘  │                 │
│  │                                                  │                │
│  │   ┌─────────────────────────────────────────┐  │                 │
│  │   │  Section 2: Paper Pending Trades         │  │                │
│  │   │  - Draft trades (entry_price = 0)        │  │                │
│  │   └─────────────────────────────────────────┘  │                 │
│  └────────────────────────────────────────────────┘                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Create BinanceOpenOrdersTable Component
Komponen baru untuk menampilkan open orders dari Binance:

**File:** `src/components/journal/BinanceOpenOrdersTable.tsx`

**Features:**
- Display semua open orders (LIMIT, STOP, STOP_MARKET, TAKE_PROFIT, etc.)
- Kolom: Symbol, Type, Side, Price, Stop Price, Quantity, Status, Time, Actions
- Badge untuk order type (LIMIT, STOP, TP/SL)
- Button Cancel Order per row
- Auto-refresh setiap 30 detik (sudah di hook)
- Empty state jika tidak ada pending orders

**Columns:**
| Column | Source |
|--------|--------|
| Symbol | `order.symbol` |
| Type | `order.type` (LIMIT, STOP, etc.) |
| Side | `order.side` (BUY/SELL) |
| Direction | `order.positionSide` (LONG/SHORT) |
| Price | `order.price` |
| Stop Price | `order.stopPrice` (for STOP orders) |
| Quantity | `order.origQty` |
| Filled | `order.executedQty` |
| Time | `order.time` (formatted) |
| Actions | Cancel button |

### Step 2: Update TradingJournal Page
**File:** `src/pages/trading-journey/TradingJournal.tsx`

**Changes:**
1. Import dan call `useBinanceOpenOrders()` hook
2. Import `useCancelBinanceOrder()` untuk cancel functionality
3. Update tab "Pending" untuk menampilkan:
   - Section: Binance Open Orders (jika connected)
   - Section: Paper Pending Trades (existing)
4. Update badge count untuk include Binance open orders

### Step 3: Export Component dari index
**File:** `src/components/journal/index.ts`

Tambahkan export untuk `BinanceOpenOrdersTable`

## UI/UX Design

### Pending Tab Layout
```text
┌────────────────────────────────────────────────────────────┐
│  📋 Pending Orders                                          │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Binance Open Orders ─────────────────────────────────┐ │
│  │                                                         │ │
│  │  [📡 Binance] BTCUSDT  LIMIT BUY  $95,000  0.01 BTC   │ │
│  │                        @ LONG     ━━━━━━━  [Cancel]    │ │
│  │                                                         │ │
│  │  [📡 Binance] ETHUSDT  STOP  SELL $3,000   2.0 ETH    │ │
│  │                        @ SHORT    Stop: $3,050 [Cancel] │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ Paper Pending (Draft) ───────────────────────────────┐ │
│  │                                                         │ │
│  │  [📄 Paper] SOLUSDT   LONG   Entry: -   Planning...    │ │
│  │                                         [Edit] [Delete] │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Cancel Order Flow
1. User clicks "Cancel" button
2. Show confirmation dialog
3. Call `useCancelBinanceOrder` mutation
4. On success: Toast "Order cancelled" + refetch orders
5. On error: Toast error message

## Technical Details

### Files to Create
| File | Description |
|------|-------------|
| `src/components/journal/BinanceOpenOrdersTable.tsx` | Table component for Binance open orders |

### Files to Modify
| File | Changes |
|------|---------|
| `src/pages/trading-journey/TradingJournal.tsx` | Add useBinanceOpenOrders hook, update Pending tab UI |
| `src/components/journal/index.ts` | Export new component |

### Existing Hooks Used (No Changes Needed)
- `useBinanceOpenOrders()` - fetch open orders
- `useCancelBinanceOrder()` - cancel order mutation
- Both hooks already have proper staleTime, refetchInterval, and query invalidation

### Type Reference (Already Exists)
```typescript
interface BinanceOrder {
  orderId: number;
  symbol: string;
  status: string;
  price: number;
  avgPrice: number;
  origQty: number;
  executedQty: number;
  type: 'LIMIT' | 'MARKET' | 'STOP' | 'STOP_MARKET' | 'TAKE_PROFIT' | 'TAKE_PROFIT_MARKET';
  side: 'BUY' | 'SELL';
  positionSide: 'LONG' | 'SHORT' | 'BOTH';
  stopPrice: number;
  time: number;
  updateTime: number;
  // ... other fields
}
```

## Edge Cases Handled

1. **No Binance Connection**: Hide Binance section, only show paper trades
2. **No Open Orders**: Show empty state "No pending orders on Binance"
3. **Cancel Failed**: Show error toast with Binance error message
4. **Loading State**: Show skeleton while fetching
5. **Real-time Updates**: Auto-refresh every 30 seconds (existing hook config)

## Estimated Complexity
- **Low-Medium** - Menggunakan hook dan tipe yang sudah ada, hanya perlu membuat UI component baru dan integrasi ke halaman existing.
