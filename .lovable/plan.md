
# Accounts Page System-First Compliance Fix

## Objective
Refactor the Accounts page to follow the "System-First, Exchange-Second" architecture pattern, ensuring:
1. Overview cards aggregate Binance + Paper account data
2. Exchange-Exclusive components have internal guards
3. All tabs remain visible with appropriate empty states

---

## Current Issues Identified

| Issue | Location | Problem |
|-------|----------|---------|
| Balance shows Binance only | Overview "Total Balance" card | Excludes paper account balances |
| Active Positions Binance-only | Overview "Active Positions" card | No fallback for paper trades |
| Tabs hidden when not connected | `{isConnected && (...)}`  | Transactions/Financial tabs invisible |
| No internal guard | `FinancialSummaryCard` | Relies on parent to guard, could error if rendered without connection |
| No internal guard | `BinanceTransactionHistoryTab` | Same as above |

---

## Implementation Plan

### 1. Create Unified Account Balance Aggregation

**File:** `src/pages/Accounts.tsx`

**Changes:**
```
Lines 51-54: Add paper account balance calculation

// Calculate aggregated balances
const paperAccounts = accounts?.filter(a => 
  a.account_type === 'trading' && a.metadata?.is_backtest
) || [];
const paperTotalBalance = paperAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);

// Combined total = Binance (if connected) + Paper accounts
const combinedTotalBalance = (isConnected ? (balance?.totalWalletBalance || 0) : 0) + paperTotalBalance;
```

**UI Changes for Overview Cards (Lines 120-171):**

| Card | Current | Fixed |
|------|---------|-------|
| Total Balance | Binance only | Binance + Paper aggregated with source breakdown |
| Active Positions | Binance only | Show paper open trades count as fallback |

### 2. Improve "Total Balance" Card

**Current (Lines 134-153):**
Shows only Binance wallet balance with no fallback.

**Fixed:**
```typescript
<Card>
  <CardHeader>
    <CardTitle>Total Balance</CardTitle>
    <Wallet className="h-4 w-4" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">
      {formatCurrency(combinedTotalBalance, 'USD')}
    </div>
    <div className="flex items-center gap-2 mt-1">
      {isConnected && (
        <Badge variant="outline" className="text-xs">
          Binance: {formatCurrency(balance?.totalWalletBalance || 0, 'USD')}
        </Badge>
      )}
      {paperTotalBalance > 0 && (
        <Badge variant="secondary" className="text-xs">
          Paper: {formatCurrency(paperTotalBalance, 'USD')}
        </Badge>
      )}
    </div>
  </CardContent>
</Card>
```

### 3. Improve "Active Positions" Card

**Current (Lines 155-170):**
Shows only Binance positions, no paper trade fallback.

**Fixed:**
- Add query for open paper trades from `trade_entries` table
- Show combined count: "X Binance + Y Paper"
- Show "No open positions" empty state instead of just "0"

```typescript
// Add hook for paper open trades
const { data: paperOpenTrades } = useQuery({
  queryKey: ['paper-open-trades'],
  queryFn: async () => {
    const { data } = await supabase
      .from('trade_entries')
      .select('id')
      .eq('status', 'open')
      .not('trading_account_id', 'is', null);
    return data?.length || 0;
  },
});

const totalActivePositions = activePositions.length + (paperOpenTrades || 0);
```

### 4. Make All Tabs Always Visible

**Current (Lines 185-196):**
```typescript
{isConnected && (
  <>
    <TabsTrigger value="transactions">...</TabsTrigger>
    <TabsTrigger value="financial">...</TabsTrigger>
  </>
)}
```

**Fixed:**
Always show tabs, but indicate when they require connection:

```typescript
<TabsTrigger 
  value="transactions" 
  disabled={!isConnected}
  className={!isConnected ? "opacity-50" : ""}
>
  <ArrowDownUp className="h-4 w-4" />
  Transactions
  {!isConnected && (
    <Tooltip>
      <TooltipTrigger>
        <Wifi className="h-3 w-3 ml-1 text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent>Requires Binance connection</TooltipContent>
    </Tooltip>
  )}
</TabsTrigger>
```

### 5. Add Internal Guards to Exchange-Exclusive Components

#### 5.1 `FinancialSummaryCard.tsx`

**Add internal guard at component level (before line 69):**

```typescript
import { useBinanceConnectionStatus } from "@/features/binance";
import { BinanceNotConfiguredState } from "@/components/binance/BinanceNotConfiguredState";

export function FinancialSummaryCard({ ... }: FinancialSummaryCardProps) {
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected ?? false;
  
  // Guard: show empty state if not connected
  if (!isConnected) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CircleDollarSign className="h-5 w-5 text-primary" />
            Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BinanceNotConfiguredState
            title="Financial Data Requires Exchange"
            description="Connect your Binance API to view trading fees, funding rates, and rebates."
          />
        </CardContent>
      </Card>
    );
  }
  
  // ... rest of component
}
```

#### 5.2 `BinanceTransactionHistoryTab.tsx`

**Add internal guard (before line 31):**

```typescript
import { useBinanceConnectionStatus } from "@/features/binance";
import { BinanceNotConfiguredState } from "@/components/binance/BinanceNotConfiguredState";

export function BinanceTransactionHistoryTab() {
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected ?? false;
  
  // Guard: show empty state if not connected
  if (!isConnected) {
    return (
      <div className="py-8">
        <BinanceNotConfiguredState
          title="Transaction History Requires Exchange"
          description="Connect your Binance API to view deposits, withdrawals, and transfer history."
        />
      </div>
    );
  }
  
  // ... rest of component
}
```

### 6. Update Tab Content Rendering

**Current (Lines 343-354):**
```typescript
{isConnected && (
  <TabsContent value="transactions">...</TabsContent>
)}
```

**Fixed:**
Always render TabsContent (even if empty state inside):

```typescript
<TabsContent value="transactions" className="mt-6">
  <BinanceTransactionHistoryTab />
</TabsContent>

<TabsContent value="financial" className="mt-6">
  <FinancialSummaryCard showDetails={true} />
</TabsContent>
```

The internal guards in each component will handle the empty state display.

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Accounts.tsx` | Modify | Aggregate balances, always show tabs, add paper trades query |
| `src/components/accounts/FinancialSummaryCard.tsx` | Modify | Add internal `isConnected` guard with empty state |
| `src/components/trading/BinanceTransactionHistory.tsx` | Modify | Add internal `isConnected` guard with empty state |

---

## Visual Changes

### Before (No Binance Connected)
```
┌──────────────────────────────────────────────────────────────┐
│ Total Accounts: 2    Total Balance: $0.00    Active Pos: 0   │
│                      (Binance only)          (Binance only)  │
├──────────────────────────────────────────────────────────────┤
│ [Accounts]  (other tabs hidden)                              │
└──────────────────────────────────────────────────────────────┘
```

### After (No Binance Connected)
```
┌──────────────────────────────────────────────────────────────┐
│ Total Accounts: 2    Total Balance: $10,000  Active Pos: 3   │
│ 0 Binance + 2 Paper  [Paper: $10,000]        2 Binance + 1 Paper │
├──────────────────────────────────────────────────────────────┤
│ [Accounts]  [Transactions 🔗]  [Financial 🔗]                │
│             (disabled+tooltip) (disabled+tooltip)            │
└──────────────────────────────────────────────────────────────┘
```

---

## Technical Notes

### Data Source Priority
```
Total Balance = Binance (if connected) + Sum(Paper Accounts)
Active Positions = Binance Positions + Paper Open Trades
```

### Component Self-Defense Pattern
Each Exchange-Exclusive component should:
1. Import `useBinanceConnectionStatus`
2. Check `isConnected` at render start
3. Return `BinanceNotConfiguredState` if not connected
4. Never assume parent has already guarded

This ensures components are safe to render in any context.

---

## Testing Checklist

After implementation:

1. **No Binance, No Paper Accounts**
   - Total Balance shows $0 with helpful message
   - All tabs visible, Transactions/Financial disabled with tooltip
   
2. **No Binance, With Paper Accounts**
   - Total Balance shows paper sum with "Paper" badge
   - Active Positions shows paper open trades
   - Transactions/Financial tabs show "Connect Exchange" state
   
3. **Binance Connected, With Paper Accounts**
   - Total Balance shows combined with source breakdown badges
   - Active Positions shows combined count
   - All tabs functional
