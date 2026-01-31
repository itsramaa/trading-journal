
# Rencana Perbaikan Multi-Issue: Accounts, Transactions, Performance, Trade History

---

## Ringkasan Issues

| # | Issue | Lokasi | Severity |
|---|-------|--------|----------|
| 1 | API Settings Button redirect salah | `Accounts.tsx` line 103, 220 | LOW |
| 2 | Transactions Tab infinite empty | `BinanceTransactionHistory.tsx` | MEDIUM |
| 3 | Financial Tab filter tanggal terbatas | `FinancialSummaryCard.tsx` | LOW |
| 4 | Paper Account tidak muncul di Accounts page | `Accounts.tsx` & `use-trading-accounts.ts` | HIGH |
| 5 | AI Insights referensi akun tidak ada | `AIInsightsWidget.tsx` | MEDIUM |
| 6 | Performance Analysis filters bukan dropdown | `Performance.tsx` | LOW |
| 7 | Trade History Import tab redundan | `TradeHistory.tsx` | LOW |

---

## Issue 1: API Settings Button Redirect Salah

**Problem:** Link `to="/settings?tab=exchange"` seharusnya bekerja, tapi Settings page tidak handle URL query parameter untuk default tab.

**Root Cause:** Settings.tsx tidak read `?tab=` dari URL untuk set initial tab.

**Solution:**
```typescript
// Settings.tsx - Tambah useSearchParams
import { useSearchParams } from "react-router-dom";

const Settings = () => {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'trading';
  
  // Use defaultTab in Tabs component
  <Tabs defaultValue={defaultTab} className="space-y-4">
```

**Files:** `src/pages/Settings.tsx`

---

## Issue 2: Transactions Tab Infinite Empty

**Problem:** `BinanceTransactionHistoryTab` selalu menampilkan "No transactions found".

**Root Cause Analysis:**
1. Hook `useTransactionSummary` calls `useRecentTransactions`
2. `useRecentTransactions` calls `useBinanceTransactionHistory`
3. Edge function endpoint `transaction-history` mungkin belum di-implement atau return data kosong

**Investigation needed:** Check edge function `binance-futures` for action `transaction-history`.

**Solution:** 
- Add proper error state handling
- Add loading indicator
- Show meaningful message jika endpoint belum didukung atau data memang kosong

**Files:** `src/components/trading/BinanceTransactionHistory.tsx`, `src/features/binance/useBinanceTransactionHistory.ts`

---

## Issue 3: Financial Tab Filter Tanggal Terbatas

**Current:** Hanya 7, 30, 90 days preset.
**Required:** Flexible date filter max 1 tahun kebelakang + filter di View Details.

**Solution:**
1. Extend filter options dengan 180 days dan 365 days
2. Add custom date range picker (DateRangeFilter component)
3. Add filter inside collapsible detail section

```typescript
// FinancialSummaryCard.tsx
<SelectContent>
  <SelectItem value="7">7 days</SelectItem>
  <SelectItem value="30">30 days</SelectItem>
  <SelectItem value="90">90 days</SelectItem>
  <SelectItem value="180">6 months</SelectItem>
  <SelectItem value="365">1 year</SelectItem>
</SelectContent>

// Add type filter in details
<Select value={typeFilter} onValueChange={setTypeFilter}>
  <SelectContent>
    <SelectItem value="all">All Types</SelectItem>
    <SelectItem value="COMMISSION">Fees Only</SelectItem>
    <SelectItem value="FUNDING_FEE">Funding Only</SelectItem>
  </SelectContent>
</Select>
```

**Files:** `src/components/accounts/FinancialSummaryCard.tsx`

---

## Issue 4: Paper Account Tidak Muncul di Accounts Page (HIGH PRIORITY)

**Problem:** Trade Entry Wizard shows Paper accounts tapi Accounts page tidak.

**Root Cause Analysis:**
1. Trade Entry Wizard uses `useTradingAccounts()` → fetches accounts with `is_backtest=true`
2. Accounts page `AccountCardList` dengan prop `filterType="trading"` dan `backtestOnly` 
3. `AccountCardList` mungkin filter berbeda dari `useTradingAccounts`

**Verification:** Check `AccountCardList` component logic.

**Solution:**
- Ensure `AccountCardList` correctly filters for `is_backtest: true` accounts
- Verify data consistency antara `useAccounts` dan `useTradingAccounts`

**Files:** `src/components/accounts/AccountCardList.tsx`

---

## Issue 5: AI Insights Referensi Akun Tidak Ada

**Problem:** AI Insights widget menggunakan data akun yang mungkin sudah tidak ada.

**Root Cause:** Widget menggunakan `useAccounts()` yang returns database accounts, tapi Trade Entry bisa reference "paper" accounts.

**Solution:**
1. Filter accounts to only active accounts
2. Handle case when referenced account doesn't exist
3. Show warning/fallback message

```typescript
// AIInsightsWidget.tsx
const { data: accounts = [] } = useAccounts();
const activeAccounts = accounts.filter(a => a.is_active);
```

**Files:** `src/components/dashboard/AIInsightsWidget.tsx`

---

## Issue 6: Performance Analysis Filters Bukan Dropdown

**Problem:** Strategy filter pakai Badges toggle, bukan dropdown select.

**Current:** Badges untuk multi-select
**Expected:** Dropdown/Select semua (konsisten dengan Trade History filters)

**Solution:**
Replace Badge-based strategy filter dengan Popover + Command (sama seperti TradeHistoryFilters)

```typescript
// Performance.tsx - Replace badges with Popover
<Popover open={strategyOpen} onOpenChange={setStrategyOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline">
      {selectedStrategyIds.length === 0 
        ? "All Strategies" 
        : `${selectedStrategyIds.length} selected`}
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    <Command>
      {strategies.map((strategy) => (
        <CommandItem key={strategy.id} onSelect={() => toggleStrategy(strategy.id)}>
          {strategy.name}
        </CommandItem>
      ))}
    </Command>
  </PopoverContent>
</Popover>
```

**Files:** `src/pages/Performance.tsx`

---

## Issue 7: Trade History Import Tab Redundan

**Problem:** Import tab tidak diperlukan karena trades auto-sync dari Binance.

**Solution:**
1. Remove `import` tab dari TabsList
2. Integrate sync button directly ke Binance tab header
3. Keep max 1 year data limit (already implemented via date range filter)

```typescript
// TradeHistory.tsx - Remove import tab
<TabsList className="mb-4">
  <TabsTrigger value="all">All</TabsTrigger>
  <TabsTrigger value="binance">Binance</TabsTrigger>
  <TabsTrigger value="paper">Paper</TabsTrigger>
  {/* Remove: <TabsTrigger value="import">Import</TabsTrigger> */}
</TabsList>
```

**Files:** `src/pages/TradeHistory.tsx`

---

## Implementasi Urutan

| Priority | Issue | Effort |
|----------|-------|--------|
| 1 | Issue 4: Paper Account visibility | Medium |
| 2 | Issue 1: Settings tab redirect | Low |
| 3 | Issue 7: Remove Import tab | Low |
| 4 | Issue 6: Performance filters to dropdown | Medium |
| 5 | Issue 3: Financial Tab date filter | Low |
| 6 | Issue 2: Transactions empty state | Medium |
| 7 | Issue 5: AI Insights account reference | Low |

---

## Files yang Akan Dimodifikasi

| File | Changes |
|------|---------|
| `src/pages/Settings.tsx` | Add URL query param handling for default tab |
| `src/pages/Accounts.tsx` | Verify paper account display logic |
| `src/pages/Performance.tsx` | Convert strategy badges to dropdown |
| `src/pages/TradeHistory.tsx` | Remove Import tab |
| `src/components/accounts/FinancialSummaryCard.tsx` | Extend date options + add detail filters |
| `src/components/accounts/AccountCardList.tsx` | Verify backtest filter logic |
| `src/components/trading/BinanceTransactionHistory.tsx` | Improve empty state messaging |
| `src/components/dashboard/AIInsightsWidget.tsx` | Handle missing account references |

**Estimated Total Lines Changed:** ~150-200 lines

---

## Technical Notes

1. **URL Query Params:** Gunakan `useSearchParams` dari react-router-dom
2. **Date Range Filter:** Reuse existing `DateRangeFilter` component
3. **Dropdown Pattern:** Copy pattern dari `TradeHistoryFilters.tsx`
4. **Account Sync:** Trade Entry Wizard dan Accounts page harus use same hook untuk konsistensi

