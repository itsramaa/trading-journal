
# Plan: Integrasi Trading Pairs System ke Seluruh Aplikasi

## Temuan Analisis

Dari hasil pencarian, berikut komponen yang saat ini menggunakan trading pairs dan perlu diintegrasikan:

| File | Current Implementation | Status |
|------|------------------------|--------|
| `TradeDetails.tsx` | Sudah terintegrasi dengan `useTradingPairs()` | DONE |
| `AIAssistant.tsx` | Hardcoded 4 pairs (BTC, ETH, SOL, BNB) | PERLU UPDATE |
| `StrategyManagement.tsx` | Import `COMMON_PAIRS` dari `types/strategy.ts` | PERLU UPDATE |
| `TradingJournal.tsx` | Input text manual untuk pair | PERLU UPDATE |
| `SessionDetail.tsx` | Input text manual untuk pair | PERLU UPDATE |
| `types/strategy.ts` | Export `COMMON_PAIRS` hardcoded array | PERLU DEPRECATE |

---

## 1. Update AIAssistant.tsx

### Current (Hardcoded):
```typescript
<SelectContent>
  <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
  <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
  <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
  <SelectItem value="BNB/USDT">BNB/USDT</SelectItem>
</SelectContent>
```

### After (Dynamic dari database):
```typescript
import { useTradingPairs } from "@/hooks/use-trading-pairs";

// Di component
const { data: tradingPairs, isLoading: pairsLoading } = useTradingPairs();

// Ubah default value
const [checkerPair, setCheckerPair] = useState("");

// Di render
<Select 
  value={checkerPair} 
  onValueChange={setCheckerPair}
  disabled={pairsLoading}
>
  <SelectTrigger>
    <SelectValue placeholder={pairsLoading ? "Loading..." : "Select pair"} />
  </SelectTrigger>
  <SelectContent className="max-h-[300px]">
    {tradingPairs?.map((pair) => (
      <SelectItem key={pair.symbol} value={pair.symbol}>
        {pair.symbol}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

## 2. Update StrategyManagement.tsx

### Current (Hardcoded `COMMON_PAIRS`):
```typescript
import { COMMON_PAIRS } from "@/types/strategy";

// Di render
{COMMON_PAIRS.map((pair) => (
  <Badge ... />
))}
```

### After (Dynamic dengan `useBaseAssets`):

Tambah helper hook baru di `use-trading-pairs.ts`:

```typescript
// Hook untuk mendapatkan unique base assets (BTC, ETH, dll)
export function useBaseAssets() {
  const { data: tradingPairs } = useTradingPairs();
  
  return useMemo(() => {
    if (!tradingPairs) return [];
    const baseAssets = [...new Set(tradingPairs.map(p => p.base_asset))];
    return baseAssets.sort();
  }, [tradingPairs]);
}
```

Update StrategyManagement:
```typescript
import { useBaseAssets } from "@/hooks/use-trading-pairs";

// Ganti COMMON_PAIRS dengan hook
const baseAssets = useBaseAssets();

// Di render
{baseAssets.map((pair) => (
  <Badge
    key={pair}
    variant={selectedValidPairs.includes(pair) ? "default" : "outline"}
    className="cursor-pointer"
    onClick={() => togglePair(pair)}
  >
    {pair}
  </Badge>
))}
```

---

## 3. Update TradingJournal.tsx

### Current (Input text manual):
```typescript
<div>
  <Label>Pair *</Label>
  <Input {...form.register("pair")} placeholder="BTC/USDT" />
</div>
```

### After (Select dari database):
```typescript
import { useTradingPairs } from "@/hooks/use-trading-pairs";

const { data: tradingPairs } = useTradingPairs();

// Di render - ganti Input dengan Select
<div>
  <Label>Pair *</Label>
  <Select
    value={form.watch("pair")}
    onValueChange={(v) => form.setValue("pair", v)}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select pair" />
    </SelectTrigger>
    <SelectContent className="max-h-[300px]">
      {tradingPairs?.map((pair) => (
        <SelectItem key={pair.symbol} value={pair.symbol}>
          {pair.symbol}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

---

## 4. Update SessionDetail.tsx

### Current (Input text manual):
```typescript
<div>
  <Label>Pair *</Label>
  <Input {...form.register("pair")} placeholder="BTC/USDT" />
</div>
```

### After (Select dari database):
```typescript
import { useTradingPairs } from "@/hooks/use-trading-pairs";

const { data: tradingPairs } = useTradingPairs();

// Di render - ganti Input dengan Select
<div className="col-span-1">
  <Label>Pair *</Label>
  <Select
    value={form.watch("pair")}
    onValueChange={(v) => form.setValue("pair", v)}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select pair" />
    </SelectTrigger>
    <SelectContent className="max-h-[300px]">
      {tradingPairs?.map((pair) => (
        <SelectItem key={pair.symbol} value={pair.symbol}>
          {pair.symbol}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

---

## 5. Update use-trading-pairs.ts

Tambahkan helper hook `useBaseAssets`:

```typescript
import { useMemo } from "react";

// ... existing hooks ...

// Hook untuk mendapatkan unique base assets (untuk Strategy valid pairs)
export function useBaseAssets() {
  const { data: tradingPairs } = useTradingPairs();
  
  return useMemo(() => {
    if (!tradingPairs) return [];
    const baseAssets = [...new Set(tradingPairs.map(p => p.base_asset))];
    return baseAssets.sort();
  }, [tradingPairs]);
}
```

---

## 6. Deprecate COMMON_PAIRS di types/strategy.ts

### Current:
```typescript
export const COMMON_PAIRS = [
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC',
  'LINK', 'UNI', 'ATOM', 'LTC', 'FIL', 'APT', 'ARB', 'OP', 'NEAR', 'INJ'
];
```

### After (Add deprecation note, keep for fallback):
```typescript
/**
 * @deprecated Use useBaseAssets() hook instead for dynamic pairs from database
 * This is kept as fallback when database pairs are not yet synced
 */
export const COMMON_PAIRS = [
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC',
  'LINK', 'UNI', 'ATOM', 'LTC', 'FIL', 'APT', 'ARB', 'OP', 'NEAR', 'INJ'
];
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/use-trading-pairs.ts` | Add `useBaseAssets()` helper hook |
| `src/pages/AIAssistant.tsx` | Replace hardcoded pairs with `useTradingPairs()` |
| `src/pages/trading-journey/StrategyManagement.tsx` | Replace `COMMON_PAIRS` with `useBaseAssets()` |
| `src/pages/trading-journey/TradingJournal.tsx` | Replace Input with Select using `useTradingPairs()` |
| `src/pages/trading-journey/SessionDetail.tsx` | Replace Input with Select using `useTradingPairs()` |
| `src/types/strategy.ts` | Add deprecation comment to `COMMON_PAIRS` |

---

## Technical Details

### Data Flow

```text
Binance API (/fapi/v1/premiumIndex)
         ↓
sync-trading-pairs Edge Function
         ↓
trading_pairs Table (symbol, base_asset, quote_asset)
         ↓
useTradingPairs() / useBaseAssets() Hooks
         ↓
┌──────────────────────────────────────────┐
│ AIAssistant    → Select (symbol)         │
│ TradeDetails   → Select (symbol) ✓ DONE  │
│ TradingJournal → Select (symbol)         │
│ SessionDetail  → Select (symbol)         │
│ StrategyMgmt   → Badges (base_asset)     │
└──────────────────────────────────────────┘
```

### Hook Usage Pattern

```typescript
// Untuk full symbol (BTCUSDT, ETHUSDT, dll)
const { data: tradingPairs } = useTradingPairs();
// → Use for trade entry forms

// Untuk base asset saja (BTC, ETH, dll)  
const baseAssets = useBaseAssets();
// → Use for strategy valid pairs selection
```

### Fallback Handling

Semua komponen akan handle case ketika pairs belum di-sync:
- Loading state dengan skeleton/placeholder
- Empty state dengan tombol sync
- Fallback ke input manual jika diperlukan

---

## Summary

| Component | Before | After |
|-----------|--------|-------|
| AIAssistant | 4 hardcoded pairs | Dynamic from DB |
| StrategyManagement | 20 COMMON_PAIRS hardcoded | Dynamic useBaseAssets() |
| TradingJournal | Manual text input | Select dropdown from DB |
| SessionDetail | Manual text input | Select dropdown from DB |
| TradeDetails | Already integrated | No changes needed |
