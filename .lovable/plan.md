

# Accounts Page - Comprehensive Functional Audit

## Audit Scope

Reviewed 17 files across the Accounts domain: pages (Accounts.tsx, AccountDetail.tsx), components (AccountCardList, AccountTransactionDialog, AddAccountForm, EditAccountDialog, AccountComparisonTable, AccountTransactionsTable, AccountSelect, FinancialSummaryCard), detail sub-components (Header, Metrics, Overview, Transactions, Financial), hooks (use-accounts, use-account-analytics, use-exchange-analytics, use-mode-filtered-trades), types, and utilities.

---

## Issues Found

### 1. Open Trades Count Includes Soft-Deleted Trades (Accuracy - HIGH)

**File:** `src/pages/Accounts.tsx` lines 101-106

The query counting open positions does not exclude soft-deleted trades:

```typescript
const { count } = await supabase
  .from('trade_entries')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .eq('status', 'open')
  .in('trading_account_id', modeAccountIds);
```

A soft-deleted trade that was still "open" when deleted will be counted toward "Open Positions" in the summary card, inflating the displayed number.

**Fix:** Add `.is('deleted_at', null)` to the query, consistent with every other trade query in the codebase.

---

### 2. Balance Summary Card Missing Loading State for DB Accounts (Accuracy - MEDIUM)

**File:** `src/pages/Accounts.tsx` lines 172-174

The Balance summary card only shows a loading skeleton when `balanceLoading` is true (Binance balance loading). In Paper mode, the balance comes entirely from DB accounts via `useAccounts()`, but the accounts loading state is never checked for the skeleton. This means:

- User navigates to Accounts page in Paper mode
- `useAccounts()` is still fetching
- `totalDbBalance` is `0` (from empty array)
- The card displays `$0.00` briefly before jumping to the real balance

**Fix:** Destructure `isLoading: accountsLoading` from `useAccounts()` and combine with `balanceLoading`:

```typescript
const { data: accounts, isLoading: accountsLoading } = useAccounts();
// ...
const summaryLoading = balanceLoading || accountsLoading;
```

Then use `summaryLoading` instead of `balanceLoading` for the skeleton condition.

---

## Verified Correct (No Issues)

The following areas were explicitly verified and found to be functioning correctly:

- **PnL Fallback Chain**: `trade.realized_pnl ?? trade.pnl ?? 0` used consistently in equity curve (AccountDetail.tsx line 100)
- **Tab URL Persistence**: `useSearchParams` for AccountDetail tab state
- **Nullish Coalescing for initialBalance**: `account?.metadata?.initial_balance ?? Number(account?.balance)` (already fixed)
- **Mode Isolation**: `modeAccounts`, `modeAccountIds`, mode-filtered transaction dialog dropdowns all filter by `isPaperAccount` correctly
- **Soft-Delete Architecture**: 30-day recovery messaging in both AccountCardList and AccountDetailHeader delete dialogs
- **Database Trigger for Balance**: `on_account_transaction_insert` trigger handles balance updates on deposit/withdraw
- **Withdrawal Validation**: Client-side `amount > balance` check in AccountTransactionDialog
- **Financial Audit Trail**: Insert-only `account_transactions` with RLS (no UPDATE/DELETE policies)
- **User-ID Scoping**: All queries scope by `user_id` via `supabase.auth.getUser()`
- **Semantic Colors**: `text-profit` / `text-loss` used consistently across all financial indicators
- **Loading Skeletons**: Present in AccountCardList, AccountDetail, AccountDetailTransactions, FinancialSummaryCard
- **Empty States**: Present in AccountCardList, AccountTransactionsTable, AccountDetailOverview, AccountDetailTransactions, AccountComparisonTable
- **AccountComparisonTable**: Shows empty Card (not null) when no data, correct
- **Zod Validation**: Descriptive error messages in AddAccountForm schema
- **Currency from Settings**: `useUserSettings().default_currency` used in AddAccountForm
- **Equity Curve & Drawdown**: Correct cumulative PnL and peak-to-trough drawdown calculation
- **Binance Virtual Account**: Proper routing, data isolation, read-only actions
- **Account Comparison Table Mode Filtering**: Correctly filters by `isPaperAccount` logic

---

## Summary Table

| # | File | Issue | Criteria | Severity |
|---|------|-------|----------|----------|
| 1 | `src/pages/Accounts.tsx` line 105 | Open trades query missing `.is('deleted_at', null)` | Accuracy | High |
| 2 | `src/pages/Accounts.tsx` lines 56, 172 | Balance card missing loading state for DB accounts | Accuracy | Medium |

Total: 1 file, 2 fixes.

## Technical Details

### Fix 1: Add soft-delete filter to open trades query

In `src/pages/Accounts.tsx`, add `.is('deleted_at', null)` after the `.eq('status', 'open')` line:

```typescript
const { count } = await supabase
  .from('trade_entries')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .eq('status', 'open')
  .is('deleted_at', null)          // <-- add this line
  .in('trading_account_id', modeAccountIds);
```

### Fix 2: Add accounts loading state to balance skeleton

Change:
```typescript
const { data: accounts } = useAccounts();
```
To:
```typescript
const { data: accounts, isLoading: accountsLoading } = useAccounts();
```

And change the skeleton condition from `balanceLoading` to `(balanceLoading || accountsLoading)`.
