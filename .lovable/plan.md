
# Plan: Fix Whale Tracking & Trading Opportunities

## 🔍 Root Cause Analysis

### Perbedaan Kunci antara Widget

| Aspek | Volatility Meter ✅ | Whale Tracking ❌ | Trading Opportunities ❌ |
|-------|---------------------|-------------------|--------------------------|
| **Data Source** | `useMultiSymbolVolatility(symbols)` - fetch LANGSUNG per symbol | `useMarketSentiment()` - response dari edge function | `useMarketSentiment()` - response dari edge function |
| **Cara Fetch** | Hook menerima array `symbols[]` dan fetch data untuk SETIAP symbol secara individual via `Promise.all()` | Mengambil dari field `sentimentData.whaleActivity` - data STATIC dari edge function | Mengambil dari field `sentimentData.opportunities` - data STATIC dari edge function |
| **Dynamic Selection** | ✅ Jika user pilih DOTUSDT, hook langsung fetch volatility data untuk DOTUSDT | ❌ Edge function HANYA return data untuk BTC, ETH, SOL (hardcoded) | ❌ Edge function HANYA return data untuk BTC, ETH, SOL (hardcoded) |

### Masalah Utama

1. **Edge function `market-insight`** hanya fetch data untuk 3 asset: `BTC`, `ETH`, `SOL` (hardcoded di lines 229-247)

2. **Tidak ada mekanisme request dynamic symbol** - Berbeda dengan `useMultiSymbolVolatility` yang menerima array symbols dan fetch per symbol

3. **Data filter di MarketData.tsx** mencari TOP_5_ASSETS yang tidak pernah dikembalikan oleh edge function:
   - TOP_5_ASSETS = `['BTC', 'ETH', 'SOL', 'XRP', 'BNB']`
   - Edge function hanya return: `['BTC', 'ETH', 'SOL']`
   - XRP dan BNB TIDAK PERNAH ADA dalam response!

4. **Selected pair tidak di-fetch** - Jika user pilih DOGEUSDT, tidak ada mekanisme untuk fetch whale/opportunity data untuk DOGE

---

## ✅ Solusi: Buat Hook Khusus + Update Edge Function

### Pendekatan: Samakan arsitektur dengan Volatility Meter

**Volatility Meter Flow:**
```
MarketData.tsx
    ↓
<VolatilityMeterWidget symbols={volatilitySymbols} />
    ↓
useMultiSymbolVolatility(symbols) ← Hook terima array symbols
    ↓
Promise.all(symbols.map(fetch)) ← Fetch SETIAP symbol
    ↓
Binance API (historical-volatility) per symbol
```

**Yang perlu dibuat untuk Whale & Opportunities:**
```
MarketData.tsx
    ↓
<WhaleTrackingWidget symbols={whaleSymbols} />
<TradingOpportunitiesWidget pairs={opportunityPairs} />
    ↓
useMultiSymbolWhaleActivity(symbols) ← Hook BARU
useMultiSymbolOpportunities(pairs) ← Hook BARU
    ↓
Promise.all(symbols.map(fetch)) ← Fetch SETIAP symbol
    ↓
Edge function dengan parameter symbol
```

---

## Implementasi Detail

### 1. Update Edge Function `market-insight`

Modifikasi untuk menerima parameter `symbols`:

```typescript
// supabase/functions/market-insight/index.ts

serve(async (req) => {
  // Parse request body untuk symbols (opsional)
  let requestedSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']; // default
  
  try {
    const body = await req.json();
    if (body.symbols && Array.isArray(body.symbols)) {
      // User bisa request specific symbols
      requestedSymbols = body.symbols;
    }
  } catch {
    // No body, use defaults
  }
  
  // Fetch data untuk SEMUA requested symbols
  const symbolData = await Promise.all(
    requestedSymbols.map(async (symbol) => {
      const klines = await fetchBinanceKlines(symbol, '1h', 200);
      const ticker = await fetchBinanceTicker(symbol);
      // ... calculate whale, volatility, opportunity per symbol
    })
  );
  
  // Build response arrays
  return { whaleActivity: [...], opportunities: [...], volatility: [...] };
});
```

### 2. Buat Hook `useMultiSymbolMarketInsight`

```typescript
// src/features/market-insight/useMultiSymbolMarketInsight.ts

export function useMultiSymbolMarketInsight(symbols: string[]) {
  return useQuery({
    queryKey: ['market-insight-multi', symbols.join(',')],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('market-insight', {
        body: { symbols }
      });
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: symbols.length > 0,
  });
}
```

### 3. Update MarketData.tsx

```typescript
// src/pages/MarketData.tsx

// Compute symbols to fetch (Top 5 + selected if not in top 5)
const symbolsToFetch = useMemo(() => {
  const base = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT'];
  if (selectedPair && !base.includes(selectedPair)) {
    return [selectedPair, ...base];
  }
  return base;
}, [selectedPair]);

// Use new hook
const { data: marketData, isLoading } = useMultiSymbolMarketInsight(symbolsToFetch);

// Now whaleActivity and opportunities will have data for ALL requested symbols!
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/market-insight/index.ts` | EDIT | Accept `symbols` parameter, fetch dynamic symbols |
| `src/features/market-insight/useMultiSymbolMarketInsight.ts` | CREATE | New hook yang pass symbols ke edge function |
| `src/features/market-insight/index.ts` | EDIT | Export hook baru |
| `src/pages/MarketData.tsx` | EDIT | Gunakan hook baru dengan dynamic symbols |

---

## Catatan Teknis

1. **Backward Compatibility**: Edge function tetap default ke BTC/ETH/SOL jika tidak ada body

2. **Rate Limit**: Dengan 5-6 symbols, akan ada 5-6 parallel fetch ke Binance (masih dalam limit 1200/min)

3. **Caching**: TanStack Query akan cache berdasarkan `queryKey` yang include symbols, jadi different symbol sets = different cache entries

4. **Performance**: Promise.all() di edge function untuk parallel fetching (sama seperti Volatility Meter)

---

## Expected Behavior After Fix

1. **Whale Tracking**: Menampilkan data untuk Top 5 (BTC, ETH, SOL, XRP, BNB) + selected pair
2. **Trading Opportunities**: Menampilkan data untuk Top 5 + selected pair
3. **Dynamic Selection**: Ketika user pilih DOGEUSDT di Market Sentiment, DOGE akan muncul di paling atas kedua widget
4. **Konsisten dengan Volatility Meter**: Semua 3 widget menggunakan pola yang sama - pass symbols, fetch per symbol, display results
