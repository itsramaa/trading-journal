
# Accounts Page: Deep UX Analysis & Fixes

## Scope & Coverage (100%)

All files read in full:

**Pages**: `Accounts.tsx` (266 lines), `AccountDetail.tsx` (224 lines)

**Components**: `AccountCardList.tsx` (270 lines), `AccountComparisonTable.tsx` (124 lines), `AddAccountForm.tsx` (187 lines), `EditAccountDialog.tsx` (123 lines), `AccountTransactionDialog.tsx` (341 lines), `AccountSelect.tsx` (142 lines)

**Detail Sub-Components**: `AccountDetailHeader.tsx` (200 lines), `AccountDetailMetrics.tsx` (163 lines), `AccountDetailOverview.tsx` (261 lines), `AccountDetailTransactions.tsx` (181 lines), `AccountDetailFinancial.tsx` (125 lines)

**Hooks**: `use-accounts.ts` (372 lines), `use-account-analytics.ts` (84 lines)

**Shared**: `account-utils.ts`, `account.ts` (types)

---

## Issues Found

### 1. AccountDetail Tab Not URL-Persisted (UX Standard #1 Violation)

`AccountDetail.tsx` line 37: `const [activeTab, setActiveTab] = useState("overview");`

Per UX Consistency Standard #1, all top-level tabs must use `useSearchParams` for URL persistence. Refreshing the page resets the tab to Overview. Deep-linking (e.g., `/accounts/123?tab=financial`) is impossible.

**Fix**: Replace `useState` with `useSearchParams`-based tab state.

### 2. AccountComparisonTable Returns `null` When Empty (Layout Stability Violation - UX Standard #4)

`AccountComparisonTable.tsx` lines 52-54: `if (activeStats.length === 0) return null;`

When a user has accounts but zero completed trades, the comparison section disappears entirely, causing layout shift below the account cards.

**Fix**: Return a minimal empty-state card instead of null.

### 3. AccountTransactionDialog Shows All Accounts Regardless of Mode (Data Isolation Violation)

`AccountTransactionDialog.tsx` lines 158-159: The account select dropdown filters only by `is_active`, showing ALL accounts from both Paper and Live modes. A user in Paper mode can deposit to a Live account (and vice versa), violating strict mode isolation.

**Fix**: Filter the accounts list by the active mode using `isPaperAccount` and `useModeVisibility`.

### 4. Equity Curve Y-Axis Hardcodes Dollar Sign (Accuracy Violation)

`AccountDetailOverview.tsx` line 71: `tickFormatter={(v) => \`$\${v.toFixed(0)}\`}`

The Y-axis uses a hardcoded `$` symbol regardless of the user's selected currency (could be IDR/Rp). The tooltip on line 76 correctly uses `formatCurrency(value)`, creating an inconsistency within the same chart.

**Fix**: Use `formatCurrency` for axis tick formatting.

### 5. AccountDetail PnL Uses `||` Instead of `??` (Accuracy Risk)

`AccountDetail.tsx` line 96: `const pnl = trade.realized_pnl || trade.pnl || 0;`

The `||` operator treats `0` as falsy. If `realized_pnl` is exactly `0` (a breakeven trade), this falls through to `trade.pnl` instead of correctly using `0`. The standardized chain is `realized_pnl ?? pnl ?? 0` using nullish coalescing.

**Fix**: Change `||` to `??` for both fallbacks.

### 6. No Issues Found (Verified Correct)

- **Mode-as-context parity**: Accounts page layout is 100% identical between Paper and Live. AccountDetail page has identical 3-tab structure for both modes. Only CRUD availability differs (Paper: full CRUD; Live/Binance: read-only + refresh). Correct.
- **Data isolation (main page)**: `modeAccounts` correctly filters by `isPaperAccount` + `showPaperData`. Summary cards show mode-filtered totals. Open trades query filters by `modeAccountIds`. Correct.
- **Loading states**: Accounts page has skeleton for balance card. AccountCardList has 3-skeleton grid. AccountComparisonTable has skeleton rows. AccountDetail has full-page 5-card skeleton. AccountDetailTransactions has 5-skeleton rows. AccountDetailFinancial has 4-skeleton rows. All correct.
- **Empty states**: AccountCardList shows centered empty card with mode-contextual message. AccountDetailTransactions shows "managed by exchange" for Binance, search-aware empty for Paper. AccountDetailOverview equity curve shows "No closed trades yet". All correct.
- **Error states**: Not-found checks for both Binance disconnected and missing DB account with back-navigation. Delete confirmation uses AlertDialog with soft-delete messaging. All correct.
- **Semantic color tokens**: All components use `text-profit`/`text-loss` consistently. AccountCardList uses `bg-chart-4/10` for paper account icons. AccountComparisonTable uses semantic tokens for all financial metrics. AccountDetailMetrics uses semantic tokens throughout. All correct.
- **ARIA**: Accounts page summary has `role="region" aria-label="Accounts overview"`. AccountComparisonTable has `role="region" aria-label="Account performance comparison"`. Refresh button has `aria-label`. All correct.
- **Realtime**: `useAccountsRealtime()` subscribes to live updates on the main page. Correct.
- **Soft delete**: `useDeleteAccount` sets `deleted_at` and `is_active: false` (recoverable). `useAccounts` filters by `is('deleted_at', null)`. Dialog messaging confirms 30-day recovery. Correct.
- **Financial audit trail**: Deposit/withdrawal are insert-only (no UPDATE/DELETE on `account_transactions`), matching the immutable ledger policy. Withdrawal validates balance client-side. Initial balance creates a deposit transaction. Correct.
- **Security (RLS)**: `useAccounts` filters by authenticated `user.id`. `useAccountTransactions` filters by `user.id`. Mutations check auth. Correct.
- **Currency from settings**: AddAccountForm auto-selects currency from `useUserSettings().default_currency`. Form informs user of the auto-selected currency. Correct.
- **AccountSelect**: Uses canonical `isPaperAccount` for filtering. Correct.
- **Validation**: AddAccountForm uses Zod schema with descriptive error messages. Balance cannot be negative. Name is required with max length. Correct.
- **Cross-domain links**: Risk Settings links to `/risk?tab=settings`. API Settings links to `/settings?tab=exchange`. Performance link in Financial tab links to `/performance`. All verified valid.

---

## Implementation Plan

### File 1: `src/pages/AccountDetail.tsx`

**Add URL-persisted tab state**: Replace `useState` with `useSearchParams`:

```typescript
// Replace line 8 import to include useSearchParams:
import { useParams, useNavigate, useSearchParams } from "react-router-dom";

// Replace line 37:
// const [activeTab, setActiveTab] = useState("overview");
const [searchParams, setSearchParams] = useSearchParams();
const activeTab = searchParams.get("tab") || "overview";
const setActiveTab = (tab: string) => {
  setSearchParams({ tab }, { replace: true });
};
```

Remove `useState` from line 8 import (only `useMemo` remains needed from React).

### File 2: `src/components/accounts/AccountComparisonTable.tsx`

**Replace null return with empty-state card** (lines 52-54):

```tsx
if (activeStats.length === 0) {
  return (
    <Card role="region" aria-label="Account performance comparison">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Account Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Complete trades across your accounts to unlock side-by-side performance comparison
        </p>
      </CardContent>
    </Card>
  );
}
```

### File 3: `src/components/accounts/AccountTransactionDialog.tsx`

**Filter account select by active mode**: Import `isPaperAccount` and `useModeVisibility`, then filter:

```typescript
import { isPaperAccount } from "@/lib/account-utils";
import { useModeVisibility } from "@/hooks/use-mode-visibility";

// Inside the component:
const { showPaperData } = useModeVisibility();

// In renderAccountSelect, update the filter (lines 158-159):
{accounts
  ?.filter((a) => {
    if (!a.is_active) return false;
    const paper = isPaperAccount(a);
    return showPaperData ? paper : !paper;
  })
  .map((account) => ( ... ))
}
```

### File 4: `src/components/accounts/detail/AccountDetailOverview.tsx`

**Fix hardcoded dollar sign on Y-axis** (line 71):

Replace:
```typescript
tickFormatter={(v) => `$${v.toFixed(0)}`}
```

With:
```typescript
tickFormatter={(v) => formatCurrency(v)}
```

The `formatCurrency` function is already imported and available (line 47).

### File 5: `src/pages/AccountDetail.tsx`

**Fix PnL fallback operator** (line 96):

Replace:
```typescript
const pnl = trade.realized_pnl || trade.pnl || 0;
```

With:
```typescript
const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
```

---

## Technical Summary

| File | Change | Criteria |
|------|--------|----------|
| `src/pages/AccountDetail.tsx` | URL-persist tab state via `useSearchParams` | Clarity (deep-linking) |
| `src/pages/AccountDetail.tsx` | Fix PnL `\|\|` to `??` operator | Accuracy |
| `src/components/accounts/AccountComparisonTable.tsx` | Replace `null` return with empty-state card | Clarity (layout stability) |
| `src/components/accounts/AccountTransactionDialog.tsx` | Filter account select by active trade mode | Security (data isolation) |
| `src/components/accounts/detail/AccountDetailOverview.tsx` | Fix hardcoded `$` on Y-axis to use currency hook | Accuracy |

Total: 4 files modified (5 changes). Fixes cover 1 UX standard violation (URL persistence), 1 layout stability violation, 1 data isolation violation, 1 accuracy issue (hardcoded currency), and 1 accuracy risk (falsy-zero PnL operator).
