
# Deep-Dive Analysis: Accounts Page and Account Detail Page

---

## 1. Accounts Page (`src/pages/Accounts.tsx`)

### A. Comprehensiveness

| Feature | Status | Notes |
|---------|--------|-------|
| Summary cards (Balance, Count, Positions) | Done | Mode-filtered correctly |
| Add Account (Paper mode) | Done | Form with validation |
| Account card list | Done | Binance virtual card + DB accounts |
| Account comparison table | Done | Side-by-side stats |
| Deposit/Withdraw dialog | Done | With account select, validation |
| Edit account dialog | Done | Name, broker, description, account number |
| Delete with soft-delete | Done | 30-day recovery messaging |
| Realtime updates | Done | `useAccountsRealtime()` |
| Mode filtering (Paper/Live) | Done | via `useModeVisibility` |

**Gaps:**

1. **Stale route link**: Line 158 links to `/risk?tab=settings` -- should be `/risk-analytics?tab=settings` after the route rename.
2. **No sorting/filtering on the card list**: Users with many accounts have no way to sort (by balance, name, P&L) or search.
3. **FinancialSummaryCard is not used** on the Accounts page -- it exists as a standalone component but isn't mounted anywhere. It could add value for Live mode users.

### B. Accuracy

| Check | Result |
|-------|--------|
| Balance aggregation | Correct -- `totalDbBalance` from mode-filtered accounts + Binance wallet balance |
| Account count | Correct -- `modeAccountsCount + (isConnected ? 1 : 0)` |
| Open positions | Correct -- DB open trades (query) + Binance active positions |
| Unrealized P&L display | Correct -- uses `balance.totalUnrealizedProfit` |
| Open trades query | Correct -- filters by `deleted_at IS NULL`, `status = 'open'`, and mode account IDs |

**Gaps:**

3. **Position icon logic is ambiguous**: The trending icon for "Open Positions" card (lines 204-212) uses Binance `totalUnrealizedProfit` to determine the icon even in Paper mode where `showExchangeData` might be false but `displayPositions > 0`. In that case, the icon defaults to green `TrendingUp` regardless of actual paper P&L.

### C. Clarity and Readability

**Gaps (missing tooltips):**

4. **"Balance" card** -- No tooltip. Should explain: "Total balance across all accounts in the active mode (Paper or Live). For Live mode, includes connected exchange wallet balance."
5. **"Accounts" card** -- No tooltip. Should explain: "Number of active trading accounts in the current mode."
6. **"Open Positions" card** -- No tooltip explaining what counts as an open position (DB trades with status 'open' + exchange active positions).
7. **"unrealized" label in positions card** -- Only appears for Binance. Paper open trades show no unrealized P&L summary.
8. **Comparison table column headers** -- No tooltips on "Win Rate", "Net P&L", "Avg P&L", "Profit Factor". These should have brief explanations for users unfamiliar with the metrics.

### D. Code Quality

9. **`useEffect` missing deps warning in `AccountTransactionDialog`** (line 75-78): `depositForm` and `withdrawForm` are not in the dependency array. React Hook Form instances are stable, but the linter may flag this.
10. **Inline query in page component**: The `openTradesCount` query (lines 94-113) is an inline `useQuery` with raw Supabase calls. Should be extracted to a hook for consistency with the rest of the codebase.
11. **`AccountCardList` filter logic overlap**: `excludeBacktest` and `backtestOnly` props are confusing -- `backtestOnly` is passed when `showPaperData` is true, but these are paper accounts, not "backtest" accounts. The naming is a legacy artifact from when `is_backtest` was the identifier.

---

## 2. Account Detail Page (`src/pages/AccountDetail.tsx`)

### A. Comprehensiveness

| Feature | Status | Notes |
|---------|--------|-------|
| Header with balance/equity/unrealized | Done | 3-tier model for Binance |
| 5 metric cards (P&L, ROC, WR, PF, Trades) | Done | State-aware (condensed when no trades) |
| Equity curve chart | Done | Cumulative P&L over time |
| Drawdown chart | Done | Peak-to-trough with standardized formula |
| Active positions table (Live) | Done | Symbol, side, size, entry, mark, uPnL, leverage |
| Fee breakdown | Done | Commission, funding, total |
| Capital flow (deposits/withdrawals) | Done | Net flow calculation |
| Transaction history tab | Done | Search + filter by type |
| Financial summary tab | Done | P&L breakdown, fee impact, ROC |
| Tab URL persistence | Done | via `useSearchParams` |
| Back navigation | Done | Arrow back to /accounts |
| Edit/Delete/Deposit/Withdraw actions | Done | Paper accounts only |

**Gaps:**

12. **No Max Drawdown metric card**: The drawdown chart exists but there's no summary card showing the max drawdown percentage. This is a key risk metric that should be surfaced in the metrics row.
13. **No trade list/history on the detail page**: The overview shows equity curve but doesn't list recent trades for the account. Users must navigate to Trade History and filter separately.
14. **Binance initial balance estimation**: Line 78 uses `walletBalance - netPnl` as a fallback for initial capital. This is documented in memory but has no tooltip or explanation for the user.
15. **No "Avg Loss" display**: `AccountDetailMetrics` shows "Avg Win" under Profit Factor but never shows "Avg Loss". Both should be visible for a complete picture.

### B. Accuracy

| Check | Result |
|-------|--------|
| PnL calculation | Correct -- uses `realized_pnl ?? pnl ?? 0` fallback chain |
| Drawdown formula | Correct -- `(peak - current) / (initialBalance + peak) * 100`, capped at 100 |
| ROC calculation | Correct -- `netPnl / initialBalance * 100` |
| Equity curve data | Correct -- sorted by date, cumulative sum |
| Flow stats | Correct -- deposits minus withdrawals |
| Fee breakdown | Correct -- commission + funding + total from RPC stats |
| Win/Loss counts | Correct -- from `get_trade_stats` RPC |

**Gaps:**

16. **Fee breakdown conditionally hidden**: Line 211 in `AccountDetailOverview` only shows fee breakdown when `totalFees > 0`. For accounts with zero fees (paper trading), this is fine. But if an account has positive rebates that offset fees to exactly 0, the breakdown disappears. Edge case, but worth noting.
17. **Capital flow conditionally hidden**: Line 236 only renders when `flowStats` is non-null. Since `flowStats` is null when `transactions` is empty, users see nothing -- no empty state card. This violates the layout stability standard.

### C. Clarity and Readability

**Gaps (missing tooltips):**

18. **"Net P&L" metric card** -- Has "Gross:" subtitle but no tooltip explaining Gross vs Net (fees deducted).
19. **"Return on Capital" metric card** -- Has a formula tooltip but it's on a separate line, not inline with the label. The UX could be cleaner.
20. **"Win Rate" metric card** -- No tooltip. Should reference `WinRateTooltip` component that already exists.
21. **"Profit Factor" metric card** -- No tooltip. Should reference `ProfitFactorTooltip` that already exists.
22. **"Total Trades" metric card** -- No tooltip clarifying these are closed trades only.
23. **"Equity Curve" chart** -- No tooltip on the title explaining this tracks cumulative realized P&L, not account equity (which would include unrealized).
24. **"Drawdown" chart** -- Has a tooltip but it says "from peak cumulative P&L" which is technically correct but could add "Formula: (Peak - Current) / (Initial + Peak)".
25. **Active positions table** -- "Size" column doesn't clarify the unit (contracts vs base asset). "Entry Price" and "Mark Price" lack currency labels.
26. **Financial tab** -- "Fee Impact" (line ~95 of `AccountDetailFinancial`) shows "Fees as % of gross P&L" but has no tooltip explaining why this matters or what a good/bad percentage looks like.
27. **Balance/Equity/Unrealized in header** -- No tooltips explaining the three-tier model for Binance accounts.

### D. Code Quality

28. **`AccountDetailFinancial` has an unused import**: `Link` from `react-router-dom` is imported and used, but the component pattern is fine.
29. **`equityData` memo recalculates on every `initialBalance` change**: Since `initialBalance` for Binance is derived from `walletBalance - netPnl`, it can fluctuate. This causes unnecessary re-renders of the equity chart. Consider memoizing `initialBalance` separately.
30. **Active positions table hardcodes `.toFixed(2)` for prices**: Low-cap altcoins (e.g., PEPEUSDT) can have prices like `0.00001234` which would display as `0.00`. Should use dynamic precision.

---

## 3. Summary of All Recommendations

### Priority 1 -- Bugs / Incorrect Behavior

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | Stale route `/risk?tab=settings` | `Accounts.tsx:158` | Change to `/risk-analytics?tab=settings` |
| 30 | Price `.toFixed(2)` truncates small values | `AccountDetailOverview.tsx:189-192` | Use dynamic precision based on price magnitude |

### Priority 2 -- Missing Tooltips (Clarity)

| # | Element | File | Tooltip Content |
|---|---------|------|-----------------|
| 4 | Balance summary card | `Accounts.tsx` | "Total balance across all accounts in the active mode. Live mode includes exchange wallet." |
| 5 | Accounts count card | `Accounts.tsx` | "Number of active trading accounts in the current mode." |
| 6 | Open Positions card | `Accounts.tsx` | "Trades with status 'open' plus active exchange positions." |
| 8 | Comparison table headers | `AccountComparisonTable.tsx` | Use existing `WinRateTooltip`, `ProfitFactorTooltip` etc. |
| 18 | Net P&L metric | `AccountDetailMetrics.tsx` | "Total profit/loss after all fees. Gross P&L shown below." |
| 20 | Win Rate metric | `AccountDetailMetrics.tsx` | Reference `WinRateTooltip` |
| 21 | Profit Factor metric | `AccountDetailMetrics.tsx` | Reference `ProfitFactorTooltip` |
| 22 | Total Trades metric | `AccountDetailMetrics.tsx` | "Count of closed trades only. Open trades are not included." |
| 23 | Equity Curve title | `AccountDetailOverview.tsx` | "Cumulative realized P&L over time. Does not include unrealized gains/losses." |
| 25 | Positions table columns | `AccountDetailOverview.tsx` | "Size" -> "Size (base asset)", price columns with currency |
| 26 | Fee Impact | `AccountDetailFinancial.tsx` | "Percentage of gross profits consumed by fees. Below 10% is efficient." |
| 27 | Header balance labels | `AccountDetailHeader.tsx` | Tooltips on Balance, Equity, Unrealized explaining the three-tier model |

### Priority 3 -- Comprehensiveness Gaps

| # | Gap | Fix |
|---|-----|-----|
| 3 | Position icon logic for paper mode | Use paper trade uPnL to determine icon direction, not just Binance |
| 7 | No unrealized P&L for paper open trades | Calculate paper uPnL summary from open trade entries |
| 12 | No max drawdown metric card | Add a 6th metric or replace/augment one of the 5 |
| 15 | No "Avg Loss" shown | Add Avg Loss next to Avg Win under Profit Factor subtitle |
| 17 | Capital Flow hidden when no transactions | Show empty state card instead of hiding entirely |

### Priority 4 -- Code Quality

| # | Issue | Fix |
|---|-------|-----|
| 10 | Inline query for openTradesCount | Extract to `useOpenTradesCount(accountIds)` hook |
| 11 | `backtestOnly`/`excludeBacktest` naming confusion | Rename to `paperOnly`/`exchangeOnly` for clarity |
| 29 | `initialBalance` fluctuation causing re-renders | Memoize `initialBalance` with stable reference |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Accounts.tsx` | Fix stale route (P1), add tooltips to 3 summary cards (P2), extract openTradesCount to hook (P4) |
| `src/components/accounts/AccountCardList.tsx` | Rename prop naming (P4) |
| `src/components/accounts/AccountComparisonTable.tsx` | Add tooltips to table headers (P2) |
| `src/components/accounts/detail/AccountDetailMetrics.tsx` | Add tooltips to all 5 metric cards, add Avg Loss (P2/P3) |
| `src/components/accounts/detail/AccountDetailOverview.tsx` | Add tooltips to chart titles, fix price precision, add empty state for Capital Flow (P1/P2/P3) |
| `src/components/accounts/detail/AccountDetailHeader.tsx` | Add tooltips to Balance/Equity/Unrealized labels (P2) |
| `src/components/accounts/detail/AccountDetailFinancial.tsx` | Add tooltip to Fee Impact (P2) |
