
# Cross-Check: Redundant, Deprecated & Duplicate Code Cleanup

## Executive Summary

Analisis menyeluruh menemukan **18 file/komponen** yang harus dihapus dan **12 tabel database** yang sudah deprecated karena fokus project sekarang adalah Trading Journal, bukan Portfolio/Financial Freedom.

---

## PART 1: CODE CLEANUP

### A. Files to DELETE (Complete Removal)

| File | Reason | Impact |
|------|--------|--------|
| `src/lib/trading-data.ts` | Demo data file - duplicates functions in `trading-calculations.ts`. Uses hardcoded `demoStrategies` and `demoTrades` instead of real DB data. | None - not imported by working code |
| `src/components/accounts/AccountsDashboard.tsx` | Re-export wrapper for backward compatibility - unnecessary indirection | None - direct import works |
| `src/components/trading/StrategySelector.tsx` | Uses deprecated `trading-data.ts` types. Not imported anywhere in codebase. | None |
| `src/components/trading/TradingAIAnalysis.tsx` | Uses deprecated `Trade` type from `trading-data.ts`. Not imported anywhere. | None |
| `src/components/trading/SessionAnalytics.tsx` | Complete component - NOT imported anywhere. Duplicates functionality in `SessionAIAnalysis.tsx` | None |
| `src/components/NavLink.tsx` | Custom NavLink wrapper - NOT imported anywhere (only self-reference) | None |

**Total: 6 files to delete**

---

### B. Functions to REMOVE from Existing Files

#### `src/components/ui/empty-state.tsx`

Remove these unused empty state components:

```typescript
// DELETE - Not used (portfolio features removed)
export function EmptyTransactions({ onAddTransaction }) { ... }
export function EmptyHoldings({ onAddTransaction }) { ... }
export function EmptyGoals({ onAddGoal }) { ... }
export function EmptySearchResults({ onClearSearch }) { ... }
export function EmptyAnalytics() { ... }
export function EmptyAccounts({ onAddAccount }) { ... }

// KEEP - Used for Trading Journal
export function EmptyTrades({ onAddTrade }) { ... }
export function EmptyInsights() { ... }
export function EmptySessions({ onStartSession }) { ... }
export function EmptyStrategies({ onCreateStrategy }) { ... }
```

#### `src/components/ui/loading-skeleton.tsx`

Remove these unused skeletons:

```typescript
// DELETE - Not used (portfolio features removed)
export function HoldingCardSkeleton() { ... }
export function HoldingsGridSkeleton({ count }) { ... }

// KEEP - Used
export function CardSkeleton() { ... }
export function MetricsGridSkeleton() { ... }
export function TableRowSkeleton() { ... }
export function TableSkeleton({ rows }) { ... }
export function ChartSkeleton() { ... }
export function PageSkeleton() { ... }
```

---

### C. i18n Strings to REMOVE

From `src/lib/i18n.ts`, remove deprecated translation keys:

**English (lines ~44-145):**
```typescript
// DELETE - Financial Freedom section
fireCalculator: 'FIRE Calculator',
budget: 'Budget',
debtPayoff: 'Debt Payoff',
emergencyFund: 'Emergency Fund',

// DELETE - Portfolio section
portfolio: { ... },  // Entire object

// DELETE - Financial Freedom details
ff: { ... },  // Entire object
```

**Indonesian (lines ~258-356):**
Same keys to remove in Indonesian translations.

---

## PART 2: DATABASE CLEANUP

### Tables to DROP (Deprecated - Not Used)

Based on project focus shift from "Financial Management" to "Trading Journal", these tables have no references in active code:

| Table | Original Purpose | Current Usage |
|-------|------------------|---------------|
| `portfolios` | Investment portfolio tracking | Not used |
| `portfolio_transactions` | Buy/sell/dividend records | Not used |
| `portfolio_history` | Portfolio value snapshots | Not used |
| `holdings` | Asset positions | Not used |
| `assets` | Stocks/crypto definitions | Not used |
| `price_cache` | Cached market prices | Not used |
| `price_alerts` | Price notification triggers | Not used |
| `debts` | Debt tracking | Not used |
| `financial_goals` | Savings goals | Not used |
| `fire_settings` | FIRE calculator config | Not used |
| `budget_categories` | Budget management | Not used |
| `account_links` | Account relationships | Not used |

**Total: 12 tables to drop**

### Database Functions to DROP

```sql
-- Related to deprecated tables
sync_holdings_from_transaction()
sync_holdings_from_portfolio_transaction()
update_account_from_portfolio_transaction()
update_account_from_portfolio_tx()
update_account_from_budget_expense()
update_account_from_emergency_fund_transaction()
sync_budget_from_account_transaction()
sync_budget_spent_amount()
update_emergency_fund_balance()
record_portfolio_snapshot()
```

---

## PART 3: TYPE CLEANUP

### Deprecated Types in `src/types/account.ts`

The existing types are correct for Trading Journal. No changes needed.

### Deprecated References in Code Comments

Update `src/index.css` header comment:
```css
/* Trading Journey - Trading Performance Tracking System */
/* (Remove "Portfolio Assets Management" reference) */
```

---

## IMPLEMENTATION PLAN

### Phase 1: Code Cleanup (Safe - No Dependencies)

1. Delete 6 unused files
2. Remove deprecated functions from `empty-state.tsx`
3. Remove deprecated functions from `loading-skeleton.tsx`
4. Clean i18n strings

### Phase 2: Database Migration

```sql
-- Migration: Drop deprecated tables
-- WARNING: Run this only after confirming no data loss concerns

-- Drop foreign key constraints first
ALTER TABLE portfolio_transactions DROP CONSTRAINT IF EXISTS portfolio_transactions_portfolio_id_fkey;
ALTER TABLE portfolio_transactions DROP CONSTRAINT IF EXISTS portfolio_transactions_asset_id_fkey;
ALTER TABLE holdings DROP CONSTRAINT IF EXISTS holdings_portfolio_id_fkey;
ALTER TABLE holdings DROP CONSTRAINT IF EXISTS holdings_asset_id_fkey;
ALTER TABLE portfolio_history DROP CONSTRAINT IF EXISTS portfolio_history_portfolio_id_fkey;
ALTER TABLE price_alerts DROP CONSTRAINT IF EXISTS price_alerts_asset_id_fkey;
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_portfolio_id_fkey;
ALTER TABLE account_transactions DROP CONSTRAINT IF EXISTS account_transactions_category_id_fkey;

-- Drop triggers
DROP TRIGGER IF EXISTS on_portfolio_transaction_holdings_sync ON portfolio_transactions;
DROP TRIGGER IF EXISTS on_portfolio_transaction_account_update ON portfolio_transactions;
DROP TRIGGER IF EXISTS on_budget_expense_account_update ON account_transactions;

-- Drop functions
DROP FUNCTION IF EXISTS sync_holdings_from_transaction();
DROP FUNCTION IF EXISTS sync_holdings_from_portfolio_transaction();
DROP FUNCTION IF EXISTS update_account_from_portfolio_transaction();
DROP FUNCTION IF EXISTS update_account_from_portfolio_tx();
DROP FUNCTION IF EXISTS update_account_from_budget_expense();
DROP FUNCTION IF EXISTS update_account_from_emergency_fund_transaction();
DROP FUNCTION IF EXISTS sync_budget_from_account_transaction();
DROP FUNCTION IF EXISTS sync_budget_spent_amount();
DROP FUNCTION IF EXISTS update_emergency_fund_balance();
DROP FUNCTION IF EXISTS record_portfolio_snapshot();

-- Drop tables (order matters for dependencies)
DROP TABLE IF EXISTS portfolio_history;
DROP TABLE IF EXISTS holdings;
DROP TABLE IF EXISTS portfolio_transactions;
DROP TABLE IF EXISTS portfolios;
DROP TABLE IF EXISTS price_alerts;
DROP TABLE IF EXISTS price_cache;
DROP TABLE IF EXISTS assets;
DROP TABLE IF EXISTS debts;
DROP TABLE IF EXISTS financial_goals;
DROP TABLE IF EXISTS fire_settings;
DROP TABLE IF EXISTS budget_categories;
DROP TABLE IF EXISTS account_links;
```

### Phase 3: Verification

1. Run build to ensure no import errors
2. Test all pages load correctly
3. Verify database queries work

---

## SUMMARY

| Category | Items to Remove |
|----------|-----------------|
| Files | 6 |
| Functions | 8 |
| i18n Objects | 3 |
| Database Tables | 12 |
| Database Functions | 10 |

**Expected Result:**
- Cleaner codebase
- Reduced bundle size
- Simpler database schema
- Improved maintainability
- ~93% → ~96% overall alignment

---

## FILES TO MODIFY

| File | Action |
|------|--------|
| `src/lib/trading-data.ts` | DELETE |
| `src/components/accounts/AccountsDashboard.tsx` | DELETE |
| `src/components/trading/StrategySelector.tsx` | DELETE |
| `src/components/trading/TradingAIAnalysis.tsx` | DELETE |
| `src/components/trading/SessionAnalytics.tsx` | DELETE |
| `src/components/NavLink.tsx` | DELETE |
| `src/components/ui/empty-state.tsx` | Remove 6 functions |
| `src/components/ui/loading-skeleton.tsx` | Remove 2 functions |
| `src/lib/i18n.ts` | Remove deprecated keys |
| `src/index.css` | Update header comment |
| Database | Migration to drop 12 tables |
