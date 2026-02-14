

# Deep UX Analysis: Accounts Page - Mode Consistency

## Core Problem

Mode (Paper/Live) is currently treated as a **feature type** rather than a **context filter**. This results in completely different layouts, disabled tabs, and asymmetric experiences between modes. The principle should be: **same structure, different data source**.

---

## Finding 1: Accounts Tab Has Completely Different Layouts Per Mode (CRITICAL)

**Current behavior:**
- **Live mode:** Shows Binance-specific section (Wallet Balance / Available / Unrealized P&L cards), no account card list
- **Paper mode:** Shows paper summary cards + AccountCardList + AddAccountForm

**Problem:** A user switching from Paper to Live sees a completely different page structure. Live mode has no card-based account list, no "Add Account" button, and no way to navigate to an account detail page (because there are no clickable cards).

**Fix:** Unify the Accounts tab into one layout:
1. Summary row (3 cards) - data differs by mode but layout is identical
2. Section header with "Add Account" button (both modes)
3. AccountCardList filtered by mode
4. AccountComparisonTable at bottom

For Live mode, the existing Binance balance cards become the summary row. The AccountCardList should show non-paper accounts (`excludeBacktest=true`). The "not configured" / "connection error" states remain as inline cards within the section.

**Files:** `src/pages/Accounts.tsx`

---

## Finding 2: Transactions & Financial Tabs Disabled in Paper Mode (CRITICAL)

**Current behavior:** Lines 260-261 and 285-286:
```typescript
disabled={!isConnected || !showExchangeData}
```
Both tabs are completely disabled when in Paper mode.

**Problem:** Paper accounts have deposit/withdrawal transactions (via `account_transactions` table). Disabling the Transactions tab means users cannot see their paper account transaction history from the main Accounts page. They must navigate to each AccountDetail individually.

**Fix:**
- **Transactions tab:** In Paper mode, show paper account transactions using `useAccountTransactions()` (already exists). In Live mode, keep `BinanceTransactionHistoryTab`.
- **Financial tab:** In Paper mode, show a simplified financial summary derived from paper trade stats (fees from `useTradeStats`). In Live mode, keep `FinancialSummaryCard`.

Create a new `PaperTransactionsTab` component that lists all paper account transactions in one table, and a `PaperFinancialSummary` component that shows aggregated paper trade costs.

**Files:** `src/pages/Accounts.tsx`, new `src/components/accounts/PaperTransactionsTab.tsx`, new `src/components/accounts/PaperFinancialSummary.tsx`

---

## Finding 3: AddAccountForm Only Available in Paper Section

**Current behavior:** The `<AddAccountForm />` button only renders inside `showPaperData` block (line 434).

**Problem:** In Live mode, there's no way to add a new (non-paper) trading account. Users might want to track multiple real accounts manually.

**Fix:** Show `<AddAccountForm />` in both mode sections. The form already has an `is_backtest` toggle, so users can choose the account type regardless of current mode. Set `defaultIsBacktest` based on current mode.

**Files:** `src/pages/Accounts.tsx`

---

## Finding 4: Paper Open Trades Query Not Filtered by Paper Accounts

**Current behavior:** Line 82-87:
```typescript
.eq('status', 'open')
.not('trading_account_id', 'is', null)
```
This counts ALL open trades with a trading_account_id, including live trades.

**Fix:** Join or filter to only count trades whose `trading_account_id` belongs to a paper account (exchange = 'manual' or null). Use an `in` filter with paper account IDs.

**Files:** `src/pages/Accounts.tsx`

---

## Finding 5: Overview Summary Cards Inconsistent Between Modes

**Current behavior:**
- Paper: "Paper Balance", "Paper Accounts", "Open Trades"
- Live: "Total Accounts" (count), "Total Balance", "Active Positions"

The top-level overview cards (lines 176-238) use mode-aware data, but their labels and semantics shift. Then each mode section has its OWN additional summary cards (Live: 3 Binance cards, Paper: 3 paper cards), creating visual duplication.

**Fix:** Remove the per-section summary cards. Keep only ONE unified summary row at the top with consistent labels:
- Card 1: "Balance" (paper total or Binance wallet)
- Card 2: "Accounts" (count)
- Card 3: "Open Positions" (paper open trades or Binance positions)

The subtitle text can indicate the data source (e.g., "Paper balance" vs "Binance wallet").

**Files:** `src/pages/Accounts.tsx`

---

## Finding 6: AccountCardList Not Shown in Live Mode

**Current behavior:** In Live mode, only Binance-specific cards render. There's no `<AccountCardList filterType="trading" excludeBacktest />` call.

**Problem:** If a user has manually created non-paper trading accounts (e.g., to track IBKR trades), they're invisible in Live mode.

**Fix:** Add `<AccountCardList filterType="trading" excludeBacktest />` to the Live section, alongside the Binance connection status card.

**Files:** `src/pages/Accounts.tsx`

---

## Implementation Plan

### Phase 1: Unified Layout Structure

Refactor `Accounts.tsx` to use one consistent layout:

```text
+--------------------------------------------------+
| PageHeader (same for both modes)                 |
+--------------------------------------------------+
| Summary Cards: Balance | Accounts | Positions    |
| (data source differs, layout identical)          |
+--------------------------------------------------+
| Tabs: Accounts | Transactions | Financial         |
+--------------------------------------------------+
| Accounts Tab:                                     |
|   [Live: Binance status card if applicable]       |
|   Section header + Add Account button             |
|   AccountCardList (filtered by mode)              |
|   AccountComparisonTable                          |
+--------------------------------------------------+
| Transactions Tab:                                 |
|   [Live: BinanceTransactionHistoryTab]            |
|   [Paper: PaperTransactionsTab]                   |
+--------------------------------------------------+
| Financial Tab:                                    |
|   [Live: FinancialSummaryCard]                    |
|   [Paper: PaperFinancialSummary]                  |
+--------------------------------------------------+
```

Changes to `src/pages/Accounts.tsx`:
- Remove duplicated summary card rows (keep only the top-level overview)
- Unify the Accounts tab content: one section with Binance status (Live only) + AccountCardList (both modes) + AddAccountForm (both modes)
- Enable Transactions and Financial tabs for both modes
- Fix paper open trades query to filter by paper account IDs
- Move Binance Wallet/Available/Unrealized cards into a collapsible "Binance Details" section within the Accounts tab (Live only), not as the primary layout

### Phase 2: Paper Mode Tab Content

Create two new components:

**`src/components/accounts/PaperTransactionsTab.tsx`:**
- Uses `useAccountTransactions()` without accountId filter (gets all user transactions)
- Filters to only show transactions from paper accounts
- Reuses the same Table layout pattern as `BinanceTransactionHistoryTab`
- Includes search, type filter, and date range

**`src/components/accounts/PaperFinancialSummary.tsx`:**
- Uses trade stats from paper mode to show:
  - Total Gross P&L vs Net P&L
  - Simulated fees (if tracked)
  - Capital efficiency (Return on Capital)
- Simpler than Binance financial summary since paper trades don't have real funding fees

### Phase 3: Consistency Polish

- Ensure tab trigger labels and icons are identical between modes (no mode-specific badges on tabs)
- Remove `disabled` prop from Transactions and Financial tabs
- Ensure all empty states are actionable ("Add your first account" / "Connect Binance")
- Verify AccountCardList renders in both modes with correct filters

### Technical Details

**Accounts.tsx refactor (key changes):**

1. Top summary cards - unified:
```typescript
// Card 1: Balance
const displayBalance = showPaperData ? paperTotalBalance : binanceBalanceNum;
const balanceLabel = showPaperData ? 'Paper balance' : 'Binance wallet';

// Card 2: Accounts  
const displayCount = showPaperData ? paperAccountsCount : liveAccountsCount;

// Card 3: Positions
const displayPositions = showPaperData ? paperOpenTradesCount : binancePositionsCount;
```

2. Accounts tab - unified structure:
```typescript
<TabsContent value="accounts">
  {/* Binance connection status - Live only */}
  {showExchangeData && !isConnected && <BinanceStatusCard />}
  
  {/* Binance details - Live only, connected */}
  {showExchangeData && isConnected && <BinanceDetailsCards />}
  
  {/* Section header with Add button - BOTH modes */}
  <SectionHeader>
    <AddAccountForm defaultIsBacktest={showPaperData} />
  </SectionHeader>
  
  {/* Account cards - BOTH modes, filtered */}
  <AccountCardList 
    filterType="trading"
    excludeBacktest={!showPaperData}
    backtestOnly={showPaperData}
  />
  
  <AccountComparisonTable />
</TabsContent>
```

3. Tabs - always enabled:
```typescript
<TabsTrigger value="transactions">Transactions</TabsTrigger>
<TabsTrigger value="financial">Financial</TabsTrigger>
// No disabled prop, no Wifi icon
```

4. Tab content - mode-switched:
```typescript
<TabsContent value="transactions">
  {showExchangeData ? <BinanceTransactionHistoryTab /> : <PaperTransactionsTab />}
</TabsContent>
<TabsContent value="financial">
  {showExchangeData ? <FinancialSummaryCard /> : <PaperFinancialSummary />}
</TabsContent>
```

**PaperTransactionsTab.tsx:**
- Fetches all account transactions via `useAccountTransactions()`
- Cross-references with `useAccounts()` to get account names
- Table columns: Date, Account, Type, Description, Amount
- Search + type filter
- Empty state: "No transactions yet. Use Deposit/Withdraw from account cards."

**PaperFinancialSummary.tsx:**
- Uses `useTradeStats()` with paper mode filter
- Shows: Gross P&L, Net P&L, Total Trades, Win Rate, Avg Trade P&L, Return on Capital
- Simpler layout than Binance financial (no funding/rebate data)
- Links to Performance page for detailed breakdown

**Paper open trades fix:**
```typescript
const paperAccountIds = paperAccounts.map(a => a.id);
const { count } = await supabase
  .from('trade_entries')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .eq('status', 'open')
  .in('trading_account_id', paperAccountIds);
```

