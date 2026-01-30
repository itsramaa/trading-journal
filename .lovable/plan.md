
# Full Feature Binance Income Integration

## Tujuan
Memperluas integrasi Binance untuk mendukung **SEMUA income types** yang tersedia dari API dengan permission "Enable Reading", termasuk fee tracking, funding rates, dan lainnya.

---

## All Binance Income Types (dari dokumentasi resmi)

Berdasarkan dokumentasi Binance Futures API, berikut semua income types yang bisa diakses:

| Income Type | Deskripsi | Prioritas |
|------------|-----------|-----------|
| `REALIZED_PNL` | Profit/Loss dari closed positions | ✅ Sudah ada |
| `COMMISSION` | Trading fees (maker/taker) | ✅ Sudah ada |
| `FUNDING_FEE` | Funding rate payments | 🆕 Akan ditambah |
| `TRANSFER` | Deposit/Withdrawal ke Futures | 🆕 Akan ditambah |
| `WELCOME_BONUS` | Promo bonus | 🆕 Akan ditambah |
| `INSURANCE_CLEAR` | Insurance fund clearance | 🆕 Akan ditambah |
| `REFERRAL_KICKBACK` | Referral rewards | 🆕 Akan ditambah |
| `COMMISSION_REBATE` | Fee rebates | 🆕 Akan ditambah |
| `API_REBATE` | API trading rebates | 🆕 Akan ditambah |
| `CONTEST_REWARD` | Trading contest prizes | 🆕 Akan ditambah |
| `COIN_SWAP_DEPOSIT` | Asset conversion in | 🆕 Akan ditambah |
| `COIN_SWAP_WITHDRAW` | Asset conversion out | 🆕 Akan ditambah |
| `INTERNAL_TRANSFER` | Internal wallet transfer | 🆕 Akan ditambah |
| `DELIVERED_SETTELMENT` | Delivery settlement | 🆕 Akan ditambah |
| `AUTO_EXCHANGE` | Auto exchange | 🆕 Akan ditambah |

---

## Implementation Plan

### 1. Update Types - `src/features/binance/types.ts`

**Perubahan:**
- Extend `BinanceIncomeType` untuk include semua income types
- Tambahkan interface baru untuk aggregated stats

```typescript
export type BinanceIncomeType = 
  | 'REALIZED_PNL'
  | 'COMMISSION' 
  | 'FUNDING_FEE'
  | 'TRANSFER'
  | 'WELCOME_BONUS'
  | 'INSURANCE_CLEAR'
  | 'REFERRAL_KICKBACK'
  | 'COMMISSION_REBATE'
  | 'API_REBATE'
  | 'CONTEST_REWARD'
  | 'COIN_SWAP_DEPOSIT'
  | 'COIN_SWAP_WITHDRAW'
  | 'INTERNAL_TRANSFER'
  | 'DELIVERED_SETTELMENT'
  | 'AUTO_EXCHANGE';

export interface BinanceIncomeAggregated {
  byType: Record<BinanceIncomeType, { total: number; count: number }>;
  bySymbol: Record<string, { pnl: number; fees: number; funding: number }>;
  summary: {
    netPnl: number;
    totalFees: number;
    totalFunding: number;
    totalRebates: number;
    totalTransfers: number;
  };
}
```

---

### 2. Update Hooks - `src/features/binance/useBinanceFutures.ts`

**Perubahan:**
- Tambahkan `useBinanceFundingFees()` hook
- Tambahkan `useBinanceAllIncome()` hook untuk fetch semua types sekaligus
- Update `useBinanceIncomeHistory()` untuk support multiple types

```typescript
// New hook: Fetch ALL income types dalam satu call
export function useBinanceAllIncome(daysBack = 7, limit = 1000) {
  const startTime = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
  
  return useQuery({
    queryKey: ['binance', 'all-income', daysBack, limit],
    queryFn: async () => {
      // Fetch tanpa filter incomeType = dapat semua types
      const result = await callBinanceApi('income', { startTime, limit });
      return result.data || [];
    },
    staleTime: 60 * 1000,
  });
}

// Convenience hook for Funding Fees
export function useBinanceFundingFees(limit = 500) {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  return useBinanceIncomeHistory('FUNDING_FEE', oneDayAgo, limit);
}
```

---

### 3. Update `src/hooks/use-binance-daily-pnl.ts`

**Perubahan:**
- Tambahkan tracking untuk Funding Fees
- Calculate net P&L (PnL - Fees - Funding)
- Return detailed breakdown

```typescript
interface BinanceDailyPnlStats {
  // Existing
  totalPnl: number;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalCommission: number;
  
  // NEW
  totalFunding: number;
  netPnl: number;           // PnL - Fees - Funding
  totalRebates: number;     // Commission rebates + API rebates
  byIncomeType: Record<string, number>;
  
  source: 'binance' | 'local';
  isConnected: boolean;
  bySymbol: Record<string, { pnl: number; fees: number; funding: number }>;
}
```

---

### 4. Update `src/components/trading/BinanceIncomeHistory.tsx`

**Perubahan:**
- Tambahkan filter untuk semua income types (tidak hanya P&L, Commission, Funding)
- Tampilkan summary cards untuk setiap category
- Color coding per income type
- Export/download functionality

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Binance Income History                    [All Symbols ▼]   │
├─────────────────────────────────────────────────────────────┤
│ Filter: [All] [P&L] [Fees] [Funding] [Transfers] [Other]    │
├─────────────────────────────────────────────────────────────┤
│ Summary Cards (4 columns):                                  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │Net P&L   │ │Total Fees│ │ Funding  │ │ Rebates  │        │
│ │+$245.50  │ │ -$12.34  │ │ -$5.67   │ │  +$2.00  │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────────────────┤
│ Time      │ Symbol  │ Type          │ Amount    │ Net      │
│ 01/30 14:│ ZECUSDT │ REALIZED_PNL  │ -$1.78    │ -$1.80   │
│ 01/30 14:│ ZECUSDT │ COMMISSION    │ -$0.02    │          │
│ 01/30 13:│ BTCUSDT │ FUNDING_FEE   │ -$0.15    │          │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

---

### 5. Create New Component: `src/components/trading/FundingRateTracker.tsx`

**Purpose:** Dedicated component untuk tracking funding fees

**Features:**
- 24H funding summary
- Positive/negative funding balance
- By symbol breakdown
- Alert jika funding fee terlalu tinggi

---

### 6. Update `src/components/dashboard/TodayPerformance.tsx`

**Perubahan:**
- Tambahkan Funding Fees ke metrics
- Show Net P&L (after fees + funding)
- Quick view dropdown untuk fee breakdown

**Layout:**
```
Today's Performance
┌─────────────────────────────────────────────────────────────┐
│  Gross P&L      Net P&L       Fees        Funding          │
│   +$250.00      +$227.49    -$12.34      -$10.17           │
│                   ↑ Final                                   │
│                                                             │
│  ▼ Fee Breakdown                                            │
│    Commission: -$12.34                                      │
│    Funding:    -$10.17                                      │
│    Rebates:    +$0.00                                       │
└─────────────────────────────────────────────────────────────┘
```

---

### 7. Update Auto-Sync Hook

**File:** `src/hooks/use-binance-auto-sync.ts`

**Perubahan:**
- Sync semua income types, bukan hanya REALIZED_PNL
- Separate table atau column untuk fee tracking
- Option untuk sync Funding Fees ke database

---

### 8. Update Trading Journal Tab

**File:** `src/pages/trading-journey/TradingJournal.tsx`

**Perubahan:**
- Tab Import menggunakan `BinanceIncomeHistory` dengan full features
- Show Net P&L di summary cards (gross - fees - funding)
- Fee breakdown per trade di history view

---

## Files to Create/Modify

| File | Action | Deskripsi |
|------|--------|-----------|
| `src/features/binance/types.ts` | Modify | Extend income types |
| `src/features/binance/useBinanceFutures.ts` | Modify | Add new hooks |
| `src/features/binance/index.ts` | Modify | Export new hooks |
| `src/hooks/use-binance-daily-pnl.ts` | Modify | Add funding tracking |
| `src/components/trading/BinanceIncomeHistory.tsx` | Modify | Full income display |
| `src/components/trading/FundingRateTracker.tsx` | Create | Funding fee tracking |
| `src/components/dashboard/TodayPerformance.tsx` | Modify | Add net P&L display |
| `src/hooks/use-binance-auto-sync.ts` | Modify | Sync all types |
| `src/pages/trading-journey/TradingJournal.tsx` | Modify | Integrate full income |

---

## Summary Stats to Track

| Metric | Source | Calculation |
|--------|--------|-------------|
| Gross P&L | REALIZED_PNL | Sum of all closed positions |
| Trading Fees | COMMISSION | Sum of all fees (negative) |
| Funding Fees | FUNDING_FEE | Sum of funding payments |
| Fee Rebates | COMMISSION_REBATE + API_REBATE | Sum of rebates (positive) |
| Net P&L | Calculated | Gross - Fees - Funding + Rebates |
| Transfers | TRANSFER | In/out movements |

---

## Technical Notes

### Income Type Categories:

**Trading Related:**
- `REALIZED_PNL` - Core P&L
- `COMMISSION` - Trading fees
- `FUNDING_FEE` - Funding payments

**Rewards/Rebates:**
- `COMMISSION_REBATE` - Fee rebates
- `API_REBATE` - API trading rebates  
- `REFERRAL_KICKBACK` - Referral rewards
- `WELCOME_BONUS` - Promo bonus
- `CONTEST_REWARD` - Contest prizes

**Transfers:**
- `TRANSFER` - Deposit/Withdrawal
- `INTERNAL_TRANSFER` - Internal wallet
- `COIN_SWAP_DEPOSIT/WITHDRAW` - Asset conversion

**System:**
- `INSURANCE_CLEAR` - Insurance fund
- `DELIVERED_SETTELMENT` - Delivery
- `AUTO_EXCHANGE` - Auto exchange

### Color Coding:
- **Green**: Positive income (P&L wins, rebates, bonuses)
- **Red**: Negative income (losses, fees, funding paid)
- **Blue**: Neutral (transfers)
- **Yellow**: Funding received (positive funding)

---

## Edge Cases

1. **Funding dapat positif atau negatif** - Jika holding position saat funding time, bisa receive atau pay funding
2. **Commission Rebates** - Jika user punya VIP level atau promo
3. **Zero-value entries** - Skip untuk display tapi track untuk completeness
4. **Asset non-USDT** - Handle multi-asset income (BTC, ETH rewards)

---

## Testing Checklist

- [ ] All 15+ income types muncul di filter dropdown
- [ ] Funding fees tracked dan displayed correctly
- [ ] Net P&L calculation: Gross - Fees - Funding + Rebates
- [ ] Summary cards menampilkan breakdown lengkap
- [ ] Auto-sync import semua income types ke database
- [ ] TodayPerformance shows accurate net figures
- [ ] Fee breakdown collapsible dalam UI
