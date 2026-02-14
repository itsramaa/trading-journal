

# Deep UX Analysis: Accounts & AccountDetail

## Status: Mostly Solid, 6 Issues Found

After auditing all 13 files across the Accounts domain, the refactor is largely correct. The unified layout, sub-component extraction, mode-aware filtering, and data isolation are working as intended. However, 6 issues remain -- 2 are logic bugs that cause data contamination, 2 are dead code, and 2 are cosmetic.

---

## Issues Found

### BUG 1: Open Trades Count Leaks Cross-Mode Data (Critical)

**File:** `src/pages/Accounts.tsx` (lines 67-88)

`openTradesCount` queries `trade_entries` using `allAccountIds` (ALL accounts), but should use `modeAccounts` IDs only. In Paper mode, this count includes open trades from exchange accounts, and vice versa.

**Fix:** Replace `allAccountIds` with mode-filtered account IDs:

```typescript
const modeAccountIds = useMemo(() => modeAccounts.map(a => a.id), [modeAccounts]);
```

Then use `modeAccountIds` in the query key and query filter instead of `allAccountIds`.

---

### BUG 2: ROC Always 0% for Binance Virtual (Medium)

**File:** `src/pages/AccountDetail.tsx` (line 73-74)

`initialBalance` for Binance virtual is set to `totalWalletBalance`, which is the CURRENT balance. Since ROC = `netPnl / initialBalance`, and the "initial" equals current, the metric is meaningless.

**Fix:** For Binance virtual, skip the ROC metric or calculate it differently. The most pragmatic approach: use `totalWalletBalance - totalPnlNet` as a derived "initial capital" estimate:

```typescript
const initialBalance = isBinanceVirtual
  ? Math.max((Number(binanceBalance?.totalWalletBalance) || 0) - (stats?.totalPnlNet || 0), 1)
  : (account?.metadata?.initial_balance || Number(account?.balance));
```

This gives a reasonable approximation. Alternatively, show "N/A" for ROC in Live mode if no initial capital reference exists.

---

### CLEANUP 3: Unused Import in AccountDetail.tsx

**File:** `src/pages/AccountDetail.tsx` (line 25)

`useCurrencyConversion` is imported but never used (formatting is done in sub-components).

**Fix:** Remove the import.

---

### CLEANUP 4: Unused Variable `isConfigured` in Accounts.tsx

**File:** `src/pages/Accounts.tsx` (line 102)

`isConfigured` is declared but never referenced in the template.

**Fix:** Remove the variable.

---

### COSMETIC 5: Stale Comment "4 tabs"

**File:** `src/pages/AccountDetail.tsx` (line 187)

Comment says "identical 4 tabs" but only 3 tabs remain after Strategies tab removal.

**Fix:** Update comment to "3 tabs".

---

### COSMETIC 6: FinancialSummaryCard Domain Boundary

**File:** `src/components/accounts/FinancialSummaryCard.tsx`

This component is a Binance-specific financial summary (uses `useBinanceAllIncome`). It belongs in `src/features/binance/` or `src/components/binance/`, not in the accounts domain. However, it is not currently imported by any accounts page, so it has no functional impact. This is a file organization issue only.

**Fix:** Move to `src/features/binance/components/FinancialSummaryCard.tsx` and update any imports elsewhere. (Low priority -- no functional impact.)

---

## Verified Working Correctly

| Component | Status | Detail |
|-----------|--------|--------|
| AccountDetail layout parity | OK | 3 identical tabs (Overview, Transactions, Financial) for both modes |
| AccountDetailHeader actions | OK | Paper: Edit/Deposit/Withdraw/Delete. Live: Refresh only |
| AccountDetailMetrics | OK | 5 unified cards with same labels; unrealized badge for Live |
| AccountDetailOverview equity curve | OK | Uses synced `trade_mode='live'` trades for Binance |
| AccountDetailTransactions | OK | Paper: full history. Live: "Managed by exchange" |
| AccountDetailFinancial | OK | Unified P&L breakdown, fee analysis, capital efficiency |
| AccountCardList styling | OK | Uniform card design, no special borders |
| AddAccountForm | OK | `is_backtest` hardcoded true, toggle hidden |
| AccountComparisonTable mode filter | OK | Filters by `isPaperAccount` via `useModeVisibility` |
| AccountSelect | OK | Uses canonical `isPaperAccount` |
| EditAccountDialog | OK | Paper-only, proper field set |
| AccountTransactionDialog | OK | Paper-only deposit/withdraw |

---

## Implementation Summary

| File | Change | Scope |
|------|--------|-------|
| `src/pages/Accounts.tsx` | Fix `openTradesCount` to use mode-filtered IDs; remove `isConfigured` | 2 changes |
| `src/pages/AccountDetail.tsx` | Fix `initialBalance` for Live ROC; remove unused import; fix comment | 3 changes |
| `src/components/accounts/FinancialSummaryCard.tsx` | Optional: move to binance domain | Low priority |

Total: 5 mandatory fixes across 2 files. All are surgical line-level edits, no structural changes needed.

