

# Plan: Finalisasi Currency Conversion - Semua Komponen Remaining

## Problem Analysis

Cross-check menemukan **banyak komponen yang masih menggunakan hardcoded `$` atau `.toFixed()`**:

### Komponen yang Perlu Diupdate:

| File | Lines | Issue |
|------|-------|-------|
| `SessionInsights.tsx` | 97, 202 | `formatPnl(data.totalPnl)` - tanpa currency conversion |
| `AIPatternInsights.tsx` | 132, 166 | `${pattern.avgPnl.toFixed(2)}` - hardcoded $ |
| `BinanceTradeHistory.tsx` | 200 | `${trade.price.toFixed(2)}` - hardcoded $ |
| `VolatilityStopLoss.tsx` | 156, 199 | `${volatility.atr.toFixed(2)}`, `${suggestion.price.toFixed(2)}` - hardcoded $ |
| `SetupStep.tsx` | 270, 289 | `${binanceBalance.availableBalance.toLocaleString()}`, `${account.balance}` - hardcoded $ |
| `PositionSizingStep.tsx` | 146, 275, 307, 312 | Multiple `$` hardcoded untuk balance, notional, position value, risk |
| `RiskEventLog.tsx` | 262 | `${order.avgPrice.toLocaleString()}` - hardcoded $ |
| `PositionCalculator.tsx` | 255 | `${Math.round(estimatedNotional).toLocaleString()}` - hardcoded $ |
| `use-paper-account-validation.ts` | 46, 55 | Error messages dengan hardcoded $ |
| `use-strategy-export.ts` | 342 | PDF export dengan hardcoded $ |

### Exception - Tetap USD:
Beberapa komponen sengaja tetap USD karena menampilkan exchange price:
- `MarketSentimentWidget.tsx` - Mark price dari Binance (exchange denomination)
- `AIAnalysisTab.tsx` - Signal prices dari exchange

---

## Implementation Strategy

### Untuk komponen UI:
1. Import `useCurrencyConversion` hook
2. Replace semua `${}...toFixed()` dengan `format(value)` atau `formatPnl(value)`

### Untuk hook/service:
1. Untuk validation messages, tetap USD karena ini adalah internal logic
2. Untuk PDF export, bisa diupdate tapi ini opsional

---

## Phase 1: Analytics Components

### 1.1 `SessionInsights.tsx`
**Current:**
```typescript
import { formatPnl, formatWinRate } from "@/lib/formatters";
// ...
{formatPnl(offHoursData.totalPnl)}
{formatPnl(data.totalPnl)}
```

**Fix:**
- Import `useCurrencyConversion`
- Replace semua `formatPnl()` dengan hook's version

### 1.2 `AIPatternInsights.tsx`
**Current:**
```typescript
<span>Avg: ${pattern.avgPnl.toFixed(2)}</span>
```

**Fix:**
- Import `useCurrencyConversion`
- Use `formatPnl(pattern.avgPnl)`

---

## Phase 2: Trading Components

### 2.1 `BinanceTradeHistory.tsx`
**Current:**
```typescript
${trade.price.toFixed(2)}
```

**Decision:** Keep USD - Ini exchange price, bukan user balance

### 2.2 `RiskEventLog.tsx`
**Current:**
```typescript
${order.avgPrice.toLocaleString()}
```

**Decision:** Keep USD - Ini exchange order price

---

## Phase 3: Risk Calculator

### 3.1 `VolatilityStopLoss.tsx`
**Current:**
```typescript
${volatility.atr.toFixed(2)}
${suggestion.price.toFixed(2)}
```

**Decision:** Keep USD - Ini ATR value dan suggested stop loss price (exchange level)

---

## Phase 4: Trade Entry Wizard

### 4.1 `SetupStep.tsx`
**Current:**
```typescript
${binanceBalance.availableBalance.toLocaleString()}
${Number(account.current_balance).toLocaleString()}
```

**Fix:**
- Import `useCurrencyConversion`
- Use `format(binanceBalance.availableBalance)`
- Use `format(Number(account.current_balance))`

### 4.2 `PositionSizingStep.tsx`
**Current:**
```typescript
Balance: ${accountBalance.toLocaleString()}
Leverage exceeds max for ${notionalValue.toLocaleString()} notional
${result.position_value.toLocaleString()}
${result.risk_amount.toFixed(2)}
```

**Fix:**
- Import `useCurrencyConversion`
- Use `format()` untuk balance dan risk amount
- Keep USD untuk notional (exchange level)

---

## Phase 5: Position Calculator Page

### 5.1 `PositionCalculator.tsx`
**Current:**
```typescript
${Math.round(estimatedNotional).toLocaleString()} notional
```

**Decision:** Keep USD - Notional adalah nilai di exchange

---

## Phase 6: Hooks (Optional - Low Priority)

### 6.1 `use-paper-account-validation.ts`
- Error messages dengan hardcoded $ - optional fix
- Ini adalah internal validation, bukan UI display

### 6.2 `use-strategy-export.ts`
- PDF export dengan hardcoded $ - optional fix
- Bisa diupdate untuk future enhancement

---

## Files to Modify

| File | Priority | Changes |
|------|----------|---------|
| `src/components/analytics/SessionInsights.tsx` | HIGH | Add hook, fix formatPnl calls |
| `src/components/analytics/AIPatternInsights.tsx` | HIGH | Add hook, fix avgPnl display |
| `src/components/trade/entry/SetupStep.tsx` | HIGH | Add hook, fix balance displays |
| `src/components/trade/entry/PositionSizingStep.tsx` | HIGH | Add hook, fix balance/risk displays |

---

## Files to Keep USD (Intentional)

| File | Reason |
|------|--------|
| `BinanceTradeHistory.tsx` | Exchange trade prices |
| `VolatilityStopLoss.tsx` | ATR and SL prices (exchange level) |
| `RiskEventLog.tsx` | Order prices from exchange |
| `PositionCalculator.tsx` | Notional value (exchange level) |
| `MarketSentimentWidget.tsx` | Mark price dari Binance |
| `AIAnalysisTab.tsx` | Signal prices dari exchange |

---

## Technical Implementation

### Hook Usage Pattern
```typescript
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";

function MyComponent() {
  const { format, formatPnl, formatCompact } = useCurrencyConversion();
  
  // Use format() for balances and values
  return <span>{format(balance)}</span>;
  
  // Use formatPnl() for P&L with +/- prefix
  return <span>{formatPnl(pnlValue)}</span>;
}
```

---

## Implementation Order

```text
Phase 1: Analytics Components (user-facing P&L)
├── SessionInsights.tsx
└── AIPatternInsights.tsx

Phase 2: Trade Entry Wizard (user balances)
├── SetupStep.tsx
└── PositionSizingStep.tsx
```

---

## Outcome

After implementation:
1. **SessionInsights** - P&L converted ke IDR jika user pilih IDR
2. **AIPatternInsights** - Avg P&L per pattern converted
3. **SetupStep** - Account balances converted
4. **PositionSizingStep** - Balance dan risk amount converted
5. **Exchange prices tetap USD** - Mark price, ATR, order prices tetap dalam USD karena denominasi exchange

---

## IDR Notation Reminder

Format IDR menggunakan notasi ringkas Indonesia:
- `k` = ribu (1.000 - 999.999)
- `jt` = juta (1.000.000 - 999.999.999)
- `m` = miliar (1.000.000.000 - 999.999.999.999)
- `t` = triliun (1.000.000.000.000+)

Contoh:
- 15.000 → "15k"
- 1.500.000 → "1.5jt"
- 2.300.000.000 → "2.3m"

