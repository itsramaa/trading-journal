
# Plan: Fix Full History Sync & Implement Currency Conversion System

**Status: COMPLETED ✅**

## Implemented

Menangani 3 masalah utama:
1. **Full History Sync** tidak berfungsi dengan benar (trades hanya 10, padahal fees/funding sudah 627)
2. **Currency Conversion** - Saat ganti ke IDR, nilai harus di-convert (bukan hanya ganti format)
3. **IDR Compact Formatting** - Menggunakan notasi Indonesia: k, jt, m, t

---

## Part 1: Fix Full History Sync Issue

### Problem Analysis

Current state:
- `FeeHistoryTab` dan `FundingHistoryTab` menggunakan `useBinanceAllIncome(days, 1000)` → berhasil fetch 627+ records
- `TradeHistory` paginated query hanya menampilkan data dari local DB (`trade_entries` table)
- `useBinanceFullSync` seharusnya sync income → local DB, tapi:
  1. Hanya sync `REALIZED_PNL` income type
  2. Butuh manual trigger (tombol "Sync Full History")
  3. Setelah sync, data disimpan ke `trade_entries` table

**Root Cause**: Full sync flow berfungsi, tapi:
- User mungkin belum trigger sync
- Atau sync selesai tapi query paginated tidak di-invalidate dengan benar

### Solution

#### 1.1 Improve Full Sync Trigger & Feedback

**File**: `src/pages/TradeHistory.tsx`

- Tambahkan auto-detection: jika Binance connected tapi trades < 10 padahal income > 50, tampilkan prompt sync
- Improve sync progress feedback
- Auto-enable "Show Full History" setelah sync berhasil

#### 1.2 Fix Query Invalidation After Full Sync

**File**: `src/hooks/use-binance-full-sync.ts`

Pastikan setelah sync berhasil:
```typescript
onSuccess: (result) => {
  // Already calls invalidateTradeQueries - verify this includes paginated
  invalidateTradeQueries(queryClient);
  
  // Force refetch paginated data
  queryClient.refetchQueries({ queryKey: ['trade-entries-paginated'] });
}
```

#### 1.3 Add Sync Status Indicator

Tampilkan status sync di Trade History header:
- "Binance: 627 income records | Local: 10 trades | [Sync Now]"
- Membantu user memahami mengapa data tidak match

---

## Part 2: Currency Conversion System

### 2.1 Create Conversion Hook

**File baru**: `src/hooks/use-currency-conversion.ts`

```typescript
interface UseCurrencyConversionReturn {
  convert: (usdValue: number) => number;
  format: (usdValue: number) => string;
  formatPnl: (usdValue: number) => string;
  formatCompact: (usdValue: number) => string;
  formatCompactPnl: (usdValue: number) => string;
  currency: 'USD' | 'IDR';
  exchangeRate: number;
  isLoading: boolean;
}

export function useCurrencyConversion(): UseCurrencyConversionReturn {
  const { data: settings } = useUserSettings();
  const { exchangeRate } = useAppStore();
  
  const currency = settings?.default_currency || 'USD';
  
  const convert = (usdValue: number) => {
    if (currency === 'IDR') return usdValue * exchangeRate;
    return usdValue;
  };
  
  // Format with conversion
  const format = (usdValue: number) => {
    const converted = convert(usdValue);
    return formatCurrency(converted, currency);
  };
  
  // ... etc
}
```

### 2.2 Update formatters.ts with IDR Compact Notation

**File**: `src/lib/formatters.ts`

Tambahkan formatting Indonesia yang benar:

```typescript
/**
 * Format compact IDR with Indonesian notation
 * 1000-99999 = k (1k, 10k, 50k)
 * 100000-999999 = k (100k, 500k, 999k)  
 * 1000000+ = jt (1jt, 1.5jt, 10jt)
 * 1000000000+ = m (1m, 1.5m - miliar)
 * 1000000000000+ = t (1t - triliun)
 */
export function formatCompactIDR(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1_000_000_000_000) {
    return `${sign}Rp ${(absValue / 1_000_000_000_000).toFixed(1)}t`;
  }
  if (absValue >= 1_000_000_000) {
    return `${sign}Rp ${(absValue / 1_000_000_000).toFixed(1)}m`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}Rp ${(absValue / 1_000_000).toFixed(1)}jt`;
  }
  if (absValue >= 1_000) {
    return `${sign}Rp ${(absValue / 1_000).toFixed(0)}k`;
  }
  
  return formatCurrency(value, 'IDR');
}

// Update formatCompactCurrency to use IDR-specific formatting
export function formatCompactCurrency(
  value: number,
  currency: Currency | AssetMarket | string = 'USD'
): string {
  if (currency === 'IDR' || currency === 'ID') {
    return formatCompactIDR(value);
  }
  // ... existing K/M/B logic for USD
}
```

### 2.3 Fetch Real-time Exchange Rate

**File baru**: `src/hooks/use-exchange-rate.ts`

```typescript
// Fetch from free API (e.g., exchangerate.host or similar)
export function useExchangeRate() {
  const { setExchangeRate } = useAppStore();
  
  return useQuery({
    queryKey: ['exchange-rate', 'USD', 'IDR'],
    queryFn: async () => {
      // Use free exchange rate API
      const response = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=IDR');
      const data = await response.json();
      const rate = data.rates?.IDR || 16000;
      
      setExchangeRate(rate);
      return rate;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: 60 * 60 * 1000, // Refresh hourly
  });
}
```

### 2.4 Update CurrencyDisplay Component

**File**: `src/components/layout/CurrencyDisplay.tsx`

- Tampilkan current exchange rate
- Trigger rate fetch saat mount

---

## Part 3: Propagate Currency Conversion to Components

### High-Priority Components (Dashboard)

| Component | Current State | Fix |
|-----------|---------------|-----|
| `PortfolioOverviewCard.tsx` | Hardcoded 'USD' | Use `useCurrencyConversion()` |
| `TodayPerformance.tsx` | Hardcoded 'USD' | Use `useCurrencyConversion()` |
| `DailyLossTracker.tsx` | Local formatter | Use centralized formatter |
| `SystemStatusIndicator.tsx` | Uses formatPnl | Pass currency param |

### Analytics Components

| Component | Fix |
|-----------|-----|
| `SevenDayStatsCard.tsx` | Use currency hook |
| `EquityCurveWithEvents.tsx` | Accept currency prop |
| `CryptoRanking.tsx` | Use currency hook |
| `SessionPerformanceChart.tsx` | Use currency hook |

### Risk Components

| Component | Fix |
|-----------|-----|
| `RiskSummaryCard.tsx` | Use currency hook |
| `PositionSizeCalculator.tsx` | Use currency hook |

### Journal/Trade Components

| Component | Fix |
|-----------|-----|
| `TradeGalleryCard.tsx` | Accept formatCurrency prop (already does) |
| `TradeSummaryStats.tsx` | Use currency hook |
| `BinanceIncomeHistory.tsx` | Use currency hook |
| `FeeHistoryTab.tsx` | Use currency hook |
| `FundingHistoryTab.tsx` | Use currency hook |
| `FinancialSummaryCard.tsx` | Use currency hook |

---

## Implementation Order

```text
Phase 1: Core Infrastructure (Foundation)
├── 1.1 Create use-currency-conversion.ts hook
├── 1.2 Update formatters.ts with IDR compact (jt/m/t)
├── 1.3 Create use-exchange-rate.ts hook
└── 1.4 Update CurrencyDisplay with rate display

Phase 2: Fix Full History Sync
├── 2.1 Add sync detection in TradeHistory
├── 2.2 Improve feedback & auto-trigger
└── 2.3 Verify query invalidation

Phase 3: Dashboard Components
├── 3.1 PortfolioOverviewCard.tsx
├── 3.2 TodayPerformance.tsx
├── 3.3 DailyLossTracker.tsx
└── 3.4 SystemStatusIndicator.tsx

Phase 4: Analytics Components
├── 4.1 SevenDayStatsCard.tsx
├── 4.2 CryptoRanking.tsx
├── 4.3 SessionPerformanceChart.tsx
└── 4.4 EquityCurveWithEvents.tsx

Phase 5: Journal & Trade Components
├── 5.1 FinancialSummaryCard.tsx
├── 5.2 FeeHistoryTab.tsx
├── 5.3 FundingHistoryTab.tsx
├── 5.4 BinanceIncomeHistory.tsx
└── 5.5 TradeSummaryStats.tsx

Phase 6: Risk Components
├── 6.1 RiskSummaryCard.tsx
└── 6.2 PositionSizeCalculator.tsx
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/use-currency-conversion.ts` | Centralized conversion hook |
| `src/hooks/use-exchange-rate.ts` | Real-time USD/IDR rate fetcher |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/formatters.ts` | Add `formatCompactIDR()`, update `formatCompactCurrency()` |
| `src/components/layout/CurrencyDisplay.tsx` | Show exchange rate |
| `src/pages/TradeHistory.tsx` | Add sync detection & improved UX |
| `src/hooks/use-binance-full-sync.ts` | Ensure proper invalidation |
| `src/components/dashboard/PortfolioOverviewCard.tsx` | Use currency conversion |
| `src/components/dashboard/TodayPerformance.tsx` | Use currency conversion |
| `src/components/risk/DailyLossTracker.tsx` | Use centralized formatter |
| `src/components/dashboard/SystemStatusIndicator.tsx` | Use currency conversion |
| `src/components/analytics/*.tsx` | Use currency conversion |
| `src/components/trading/*.tsx` | Use currency conversion |
| `src/components/accounts/FinancialSummaryCard.tsx` | Use currency conversion |

---

## Technical Notes

### Exchange Rate API Options (Free)

1. **exchangerate.host** - Free, no API key required
2. **Open Exchange Rates** - Free tier available
3. **Fallback**: Store default rate (16000) in app-store

### IDR Formatting Examples

| Value (IDR) | Compact Display |
|-------------|-----------------|
| 500 | Rp 500 |
| 1,000 | Rp 1k |
| 10,000 | Rp 10k |
| 100,000 | Rp 100k |
| 1,000,000 | Rp 1jt |
| 1,500,000 | Rp 1.5jt |
| 10,000,000 | Rp 10jt |
| 1,000,000,000 | Rp 1m |
| 1,000,000,000,000 | Rp 1t |

### Currency Conversion Flow

```text
USD Value (from Binance/DB)
    ↓
useCurrencyConversion()
    ↓
Check user's default_currency setting
    ↓
If IDR: multiply by exchangeRate
    ↓
Format with appropriate notation
    ↓
Display
```

---

## Outcome

After implementation:

1. **Full History Sync**: Trades properly synced from Binance to local DB with clear feedback
2. **Currency Conversion**: Switching to IDR converts values (not just formats)
3. **IDR Notation**: Uses Indonesian compact format (k, jt, m, t)
4. **Consistent Display**: All components use user's preferred currency
5. **Real-time Rate**: Exchange rate fetched and cached hourly
