
# Implementation Plan: Fee Display Fix & Decimal Standardization

## Problem Summary

### Masalah 1: Fee Selalu 0 di Trade History Card

**Root Cause Analysis:**

1. Auto-sync menggunakan income endpoint (`/fapi/v1/income`) dengan filter `REALIZED_PNL`
2. Income endpoint hanya return P&L value, **TIDAK** include commission data
3. Commission adalah **record terpisah** dengan `incomeType: "COMMISSION"`
4. Fungsi `incomeToTradeEntry()` di `use-binance-auto-sync.ts` tidak populate fee field

**Data Flow Saat Ini:**
```
Binance Income API
      │
      ▼
┌─────────────────────────┐
│ REALIZED_PNL record     │─────► trade_entries.realized_pnl
│ - tranId                │
│ - income (P&L)          │
│ - symbol                │
│ - time                  │
│ ❌ NO commission field  │
└─────────────────────────┘

┌─────────────────────────┐
│ COMMISSION record       │─────► ❌ NOT synced to trades
│ - tranId (different)    │
│ - income (fee amount)   │
│ - symbol                │
└─────────────────────────┘
```

**Kenapa Fee Tidak Bisa Langsung Di-Sync:**
- COMMISSION records memiliki `tranId` berbeda dari REALIZED_PNL
- Tidak ada direct correlation antara satu trade dan fee-nya dari income endpoint
- Untuk akurasi, perlu query `/fapi/v1/userTrades` per symbol (rate limit concern)

### Masalah 2: Inconsistent Decimal Places

Banyak tempat menggunakan `.toFixed()` dengan nilai berbeda-beda:
- Persentase: `.toFixed(0)`, `.toFixed(1)`, `.toFixed(2)`
- Currency: `.toFixed(2)`, `.toFixed(4)`
- Quantity: `.toFixed(4)`, `.toFixed(8)`

**Standard yang Diminta:**
- Currency/Number: max 4 decimal (`.toFixed(4)`)
- Percentage: max 2 decimal (`.toFixed(2)`)

---

## Solution Design

### Phase 1: Fee Display - UI Improvement

**Strategy:** Jangan tampilkan Fee jika data tidak tersedia. Ganti dengan indicator yang jelas.

**Files to Modify:**

| File | Change |
|------|--------|
| `src/components/trading/TradeHistoryCard.tsx` | Update fee display logic |

**Implementation:**

```typescript
// Current (problematic):
{isBinance && entry.commission !== null && entry.commission !== undefined && (
  <div><span>Fee:</span> {entry.commission.toFixed(4)} {entry.commission_asset || 'USDT'}</div>
)}

// New (improved):
{isBinance && (
  <div className="flex items-center gap-1">
    <span className="text-muted-foreground">Fee:</span>
    {entry.commission && entry.commission > 0 ? (
      <span className="font-mono-numbers">{entry.commission.toFixed(4)} {entry.commission_asset || 'USDT'}</span>
    ) : (
      <span className="text-muted-foreground text-xs italic flex items-center gap-1">
        See Financial Summary
        <InfoTooltip content="Trading fees are aggregated in the Accounts page Financial Summary. Individual trade fees require manual sync." />
      </span>
    )}
  </div>
)}
```

**Rationale:**
- Fee = 0 atau null → show "See Financial Summary" dengan tooltip
- Fee > 0 → show actual fee value
- User diarahkan ke Accounts > Financial Summary untuk fee breakdown

### Phase 2: Improve Auto-Sync to Capture Fees (Optional Enhancement)

**Strategy:** Ketika sync REALIZED_PNL, lookup matching COMMISSION records.

**Files to Modify:**

| File | Change |
|------|--------|
| `src/hooks/use-binance-auto-sync.ts` | Enhance sync to match fees |

**Implementation Logic:**

```typescript
// In incomeToTradeEntry or sync logic
// 1. Get REALIZED_PNL record
// 2. Find COMMISSION records with same symbol & close timestamp (within 1 min)
// 3. Sum commissions for that trade

async function enrichWithFees(
  pnlRecords: BinanceIncome[],
  allIncome: BinanceIncome[]
): Map<number, number> {
  const feeMap = new Map<number, number>();
  
  const commissions = allIncome.filter(r => r.incomeType === 'COMMISSION');
  
  for (const pnl of pnlRecords) {
    // Find commissions within 1 minute of the PNL record for same symbol
    const matchingFees = commissions.filter(c => 
      c.symbol === pnl.symbol && 
      Math.abs(c.time - pnl.time) < 60000 // 1 minute window
    );
    
    const totalFee = matchingFees.reduce((sum, c) => sum + Math.abs(c.income), 0);
    feeMap.set(pnl.tranId, totalFee);
  }
  
  return feeMap;
}
```

**Note:** Ini adalah enhancement optional karena fee matching by timestamp tidak 100% akurat.

### Phase 3: Centralized Decimal Formatter Functions

**Strategy:** Buat helper functions di `src/lib/formatters.ts` untuk standardized decimals.

**Files to Modify:**

| File | Change |
|------|--------|
| `src/lib/formatters.ts` | Add standardized decimal formatters |

**New Functions:**

```typescript
/**
 * Format number with standard 4 decimal max
 * For: fees, quantities, prices
 */
export function formatNumber(value: number, maxDecimals: number = 4): string {
  // Remove trailing zeros
  return parseFloat(value.toFixed(maxDecimals)).toString();
}

/**
 * Format currency with appropriate decimals
 * Standard: 2 for display, up to 4 for small values
 */
export function formatCurrencyStandard(
  value: number, 
  currency: string = 'USD',
  options: { maxDecimals?: number; showTrailingZeros?: boolean } = {}
): string {
  const { maxDecimals = 4, showTrailingZeros = false } = options;
  // ... implementation
}

/**
 * Format percentage with standard 2 decimal max
 */
export function formatPercentStandard(value: number, signed: boolean = true): string {
  const sign = signed && value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
```

### Phase 4: Apply Standard Formatting to Key Components

**Files to Update (Priority Order):**

1. **Trade History Domain:**
   - `src/components/trading/TradeHistoryCard.tsx`
   - `src/components/trading/BinanceTradeHistory.tsx`
   - `src/pages/TradeHistory.tsx`

2. **Dashboard:**
   - `src/components/dashboard/PortfolioOverviewCard.tsx`
   - `src/components/dashboard/TodayPerformance.tsx`
   - `src/components/dashboard/SystemStatusIndicator.tsx`

3. **Risk:**
   - `src/components/risk/PositionSizeCalculator.tsx`
   - `src/components/risk/DailyLossTracker.tsx`

4. **Analytics:**
   - `src/components/analytics/CryptoRanking.tsx`
   - `src/components/analytics/SevenDayStatsCard.tsx`

---

## Technical Details

### Decimal Standards

| Category | Max Decimals | Example |
|----------|--------------|---------|
| Currency Display (P&L, Balance) | 2-4 | `$1,234.56`, `$0.0012` |
| Fee/Commission | 4 | `0.0156 USDT` |
| Quantity | 4-8 (crypto) | `0.0015 BTC` |
| Percentage | 2 | `+5.25%`, `-2.10%` |
| Win Rate | 1-2 | `65.5%` |
| Ratio (R:R) | 2 | `2.50:1` |

### formatters.ts Enhancements

```typescript
// Update existing formatCurrency to use max 4 decimals
export function formatCurrency(
  value: number,
  currency: Currency | AssetMarket | string = 'USD'
): string {
  // For small values, use up to 4 decimals
  const decimals = Math.abs(value) < 1 ? 4 : 2;
  // ... rest of implementation
}

// Update formatPercent to always use 2 decimals
export function formatPercent(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
```

---

## Execution Order

### Step 1: Fix Fee Display (Phase 1)
1. Update `TradeHistoryCard.tsx` dengan improved fee display logic
2. Add InfoTooltip untuk redirect user ke Financial Summary

### Step 2: Centralize Formatters (Phase 3)
1. Add new standardized functions ke `src/lib/formatters.ts`
2. Update existing functions dengan max decimal logic

### Step 3: Apply Formatting Standards (Phase 4)
1. Update `TradeHistoryCard.tsx` - use formatNumber for fees
2. Update other high-visibility components

### Step 4 (Optional): Enhance Auto-Sync (Phase 2)
1. Implement fee matching logic in `use-binance-auto-sync.ts`
2. Update incomeToTradeEntry to populate fee fields

---

## Success Criteria

| Criteria | Expected Behavior |
|----------|-------------------|
| Fee = 0 Display | Shows "See Financial Summary" with tooltip |
| Fee > 0 Display | Shows `0.0123 USDT` format |
| Currency Decimals | Max 4 for small values, 2 for large |
| Percentage Decimals | Always 2 decimals |
| Consistency | All components use same formatting standards |

---

## File Impact Summary

| File | Priority | Changes |
|------|----------|---------|
| `src/components/trading/TradeHistoryCard.tsx` | High | Fee display logic, decimal standardization |
| `src/lib/formatters.ts` | High | Add/update standardized formatters |
| `src/pages/TradeHistory.tsx` | Medium | Use standardized formatters |
| `src/components/dashboard/PortfolioOverviewCard.tsx` | Medium | Decimal standardization |
| `src/hooks/use-binance-auto-sync.ts` | Low | Optional fee enrichment |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing fee display | Only change display when fee = 0, preserve when > 0 |
| Formatter changes affect other domains | Test key pages after changes |
| Fee matching inaccurate | Mark as optional, implement with clear tolerance window |
