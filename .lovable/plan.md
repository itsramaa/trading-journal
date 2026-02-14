
# Accounts Page: Final Audit - 1 Remaining Issue

## Scope

All 17 files in the Accounts domain were read in full from scratch. The 5 previously implemented fixes are verified as correctly applied. One new accuracy issue was found.

---

## Verified Correct (All Previous Fixes)

1. **AccountDetail.tsx line 37-41**: `useSearchParams` for tab persistence - correct.
2. **AccountDetail.tsx line 100**: `trade.realized_pnl ?? trade.pnl ?? 0` - correct.
3. **AccountComparisonTable.tsx lines 52-67**: Empty-state Card instead of `null` - correct.
4. **AccountTransactionDialog.tsx lines 161-166**: Mode-filtered account dropdown - correct.
5. **AccountDetailOverview.tsx line 71**: `formatCurrency(v)` on Y-axis - correct.

---

## New Issue Found

### AccountDetail.tsx line 79: `initialBalance` uses `||` instead of `??` (Accuracy)

```typescript
const initialBalance = isBinanceVirtual
  ? Math.max((...), 1)
  : (account?.metadata?.initial_balance || Number(account?.balance));
```

If a user creates an account with `initial_balance: 0` (e.g., a paper account used purely for tracking without starting capital), the `||` operator treats `0` as falsy and falls through to `Number(account?.balance)`. This causes **Return on Capital** (ROC) in AccountDetailMetrics and AccountDetailFinancial to use the current balance as the denominator instead of the actual initial capital of `0`, producing a misleading ROC percentage instead of correctly showing infinity or N/A.

**Fix**: Change `||` to `??`:

```typescript
const initialBalance = isBinanceVirtual
  ? Math.max((Number(binanceBalance?.totalWalletBalance) || 0) - (stats?.totalPnlNet || 0), 1)
  : (account?.metadata?.initial_balance ?? Number(account?.balance));
```

---

## Full Verification Summary

All other areas confirmed correct:

- Mode-as-context parity (identical layouts Paper/Live)
- Data isolation (modeAccounts, modeAccountIds, open trades query)
- Loading skeletons across all views
- Empty states across all views
- Semantic color tokens (text-profit/text-loss throughout)
- ARIA roles and labels on summary region and comparison table
- Soft-delete with 30-day recovery messaging
- Financial audit trail (insert-only transactions, client-side balance check)
- Security (user_id scoping on all queries, RLS on server)
- Currency from user settings in AddAccountForm
- Zod validation with descriptive error messages
- Cross-domain links verified valid

---

## Technical Summary

| File | Change | Criteria |
|------|--------|----------|
| `src/pages/AccountDetail.tsx` line 79 | Change `\|\|` to `??` for `initialBalance` | Accuracy |

Total: 1 file, 1 change. Fixes the last remaining falsy-zero operator issue in the Accounts domain.
