

# Deep UX Analysis: Accounts Domain - Mode Consistency Refactor

## Core Principle

Mode (Paper/Live) is a **context filter**, not a feature type. The Accounts page should have **no tabs** - Transactions and Financial belong exclusively in AccountDetail. The main page is a **list/overview** page; the detail page is the **analytics hub**.

---

## Current State Analysis

### Accounts.tsx (Main Page)
- Has 3 tabs: Accounts, Transactions, Financial
- Transactions and Financial tabs are **disabled in Paper mode** (broken UX)
- Live mode: Shows Binance-specific cards, no AccountCardList, no Add Account
- Paper mode: Shows paper summary cards + AccountCardList + AddAccountForm
- Completely different layouts per mode (violates "mode = context" principle)

### AccountDetail.tsx (Detail Page)
- Has 3 tabs: Overview, Strategies, Transactions
- Already has full actions (Edit, Deposit, Withdraw, Delete via DropdownMenu)
- **Missing:** Financial tab (fees, funding, capital costs)
- Works for both Paper and Live accounts (good)

---

## Findings & Fixes

### Finding 1: Remove Tabs from Main Accounts Page (CRITICAL)

**Problem:** Transactions and Financial tabs on the main page are redundant with AccountDetail. They're disabled in Paper mode, creating asymmetric UX. Each account already has its own detail page with these features.

**Fix:** Remove `Tabs` entirely from `Accounts.tsx`. Render content directly:
1. Summary cards (mode-aware data, identical layout)
2. Binance connection status (Live only, inline)
3. Section header with "Add Account" button (both modes)
4. AccountCardList filtered by mode
5. AccountComparisonTable at bottom

### Finding 2: Layouts Differ Completely Between Modes (CRITICAL)

**Problem:**
- Live mode: 3 Binance detail cards (Wallet/Available/Unrealized), no card list, no Add button
- Paper mode: 3 paper summary cards, card list, Add button

A user switching modes sees a completely different page.

**Fix:** One unified layout for both modes:

```text
+--------------------------------------------------+
| PageHeader                                        |
+--------------------------------------------------+
| Summary Cards: Balance | Accounts | Positions     |
| (data source differs, layout identical)           |
+--------------------------------------------------+
| [Live only: Binance connection/detail section]    |
+--------------------------------------------------+
| Section header + "Add Account" button             |
| AccountCardList (filtered by mode)                |
+--------------------------------------------------+
| AccountComparisonTable                            |
+--------------------------------------------------+
```

- Summary cards at top use unified labels ("Balance", "Accounts", "Positions") with subtitle indicating source ("Paper balance" vs "Binance wallet")
- Remove per-section duplicate summary cards (Paper 3-card row and Live 3-card row)
- Binance detail cards (Wallet/Available/Unrealized) become a collapsible sub-section under Live mode only, not the primary layout
- AddAccountForm available in both modes with `defaultIsBacktest` based on current mode

### Finding 3: AccountCardList Not Shown in Live Mode (CRITICAL)

**Problem:** Live mode only shows Binance-specific cards. No `AccountCardList` renders. Users who manually created non-paper trading accounts (e.g., to track IBKR) can't see them in Live mode.

**Fix:** Render `AccountCardList` in both modes:
- Paper mode: `backtestOnly={true}`
- Live mode: `excludeBacktest={true}`

### Finding 4: AccountDetail Missing Financial Tab (MEDIUM)

**Problem:** Financial data (fees, funding rates, rebates) currently lives as a disabled tab on the main page. AccountDetail has Overview/Strategies/Transactions but no Financial tab.

**Fix:** Add a 4th "Financial" tab to AccountDetail:
- For accounts with exchange (Live/Binance): Render `FinancialSummaryCard` (Binance fees/funding data)
- For paper accounts: Show a simplified financial summary derived from trade stats (Gross P&L, Net P&L, estimated fees, Return on Capital)

### Finding 5: Paper Open Trades Query Not Filtered (MEDIUM)

**Problem:** Line 82-87 of Accounts.tsx counts ALL open trades with a trading_account_id, including live trades:
```typescript
.eq('status', 'open')
.not('trading_account_id', 'is', null)
```

**Fix:** Filter by paper account IDs:
```typescript
const paperAccountIds = paperAccounts.map(a => a.id);
// Use .in('trading_account_id', paperAccountIds)
```

### Finding 6: AddAccountForm defaultIsBacktest Not Mode-Aware (MINOR)

**Problem:** `AddAccountForm` renders only in Paper section. The `defaultIsBacktest` prop defaults to `false` and is never set based on current mode.

**Fix:** Pass `defaultIsBacktest={showPaperData}` so the Paper Trading toggle matches current context.

---

## Implementation Plan

### Step 1: Refactor Accounts.tsx - Remove Tabs, Unify Layout

Remove `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` wrapping. Remove `BinanceTransactionHistoryTab` and `FinancialSummaryCard` imports and usage. Remove `activeTab` state.

New structure:
- Keep top summary cards (already mode-aware, just clean up labels)
- Binance section: Show connection status or detail cards when Live + connected (as a sub-section, not primary layout)
- Always render `AccountCardList` with mode-based filter props
- Always render `AddAccountForm` with `defaultIsBacktest={showPaperData}`
- `AccountComparisonTable` at the bottom
- Fix paper open trades query to use `paperAccountIds`

### Step 2: Add Financial Tab to AccountDetail.tsx

Add a 4th tab "Financial" to the existing `TabsList`:
```typescript
<TabsTrigger value="financial">Financial</TabsTrigger>
```

Content:
- If account has exchange and is not paper: Render `FinancialSummaryCard`
- If paper account: Render inline financial summary using existing `stats` data (already computed - totalPnlGross, totalPnlNet, totalFees, totalCommission, totalFundingFees)

The paper financial summary will show:
- Gross P&L vs Net P&L
- Fee breakdown (commission, funding) if available
- Return on Capital percentage
- Link to Performance page for detailed breakdown

### Step 3: Clean Up

- Remove unused imports from `Accounts.tsx` (Wifi, CircleDollarSign, BinanceTransactionHistoryTab, FinancialSummaryCard, etc.)
- Remove duplicate Paper summary cards (the top-level overview cards already show this data)
- Update `docs/` if any documentation references the tab structure

---

## Technical Details

### Accounts.tsx - Key Structural Changes

**Before (516 lines with tabs):**
```text
PageHeader
Overview Cards (3)
Tabs
  -> Accounts tab (Binance section + Paper section)
  -> Transactions tab (BinanceTransactionHistoryTab)
  -> Financial tab (FinancialSummaryCard)
```

**After (simplified, ~300 lines):**
```text
PageHeader
Overview Cards (3, unified labels)
[Live: Binance connection status or detail cards]
Section Header + AddAccountForm
AccountCardList (mode-filtered)
AccountComparisonTable
```

**Unified Summary Cards:**
```typescript
const displayBalance = showPaperData ? paperTotalBalance : binanceBalanceNum;
const balanceSubtitle = showPaperData ? 'Paper balance' : 'Binance wallet';
const displayCount = showPaperData ? paperAccountsCount : (isConnected ? 1 : 0);
const displayPositions = showPaperData ? (paperOpenTradesCount || 0) : binancePositionsCount;
```

**AccountCardList - both modes:**
```typescript
<AccountCardList
  filterType="trading"
  excludeBacktest={!showPaperData}
  backtestOnly={showPaperData}
  onTransact={handleTransact}
  onEdit={handleEdit}
  emptyMessage={showPaperData 
    ? "No paper trading accounts yet. Create one to test your strategies risk-free."
    : "No live trading accounts yet. Add an account to track your real trades."}
/>
```

### AccountDetail.tsx - Financial Tab Addition

```typescript
<TabsList>
  <TabsTrigger value="overview">Overview</TabsTrigger>
  <TabsTrigger value="strategies">Strategies</TabsTrigger>
  <TabsTrigger value="transactions">Transactions</TabsTrigger>
  <TabsTrigger value="financial">Financial</TabsTrigger>
</TabsList>

<TabsContent value="financial" className="mt-4">
  {!isBacktest ? (
    <FinancialSummaryCard />
  ) : (
    <Card>
      <CardHeader>
        <CardTitle>Financial Summary</CardTitle>
        <CardDescription>Trading costs and capital efficiency</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Grid with: Gross P&L, Net P&L, Total Fees, Return on Capital */}
        {/* Using existing stats data already fetched */}
      </CardContent>
    </Card>
  )}
</TabsContent>
```

### Files Changed

| File | Change |
|------|--------|
| `src/pages/Accounts.tsx` | Major refactor: remove tabs, unify layout, fix paper query |
| `src/pages/AccountDetail.tsx` | Add Financial tab with mode-aware content |

### Files NOT Needed (Removed from Previous Plan)

- `PaperTransactionsTab.tsx` - Not needed, AccountDetail already has Transactions tab
- `PaperFinancialSummary.tsx` - Not needed, inline in AccountDetail Financial tab using existing stats

