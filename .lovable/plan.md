
# Plan: Hapus Algo Orders & Fix Market Data Page

## Ringkasan Masalah
1. **Algo Orders** - Endpoint memerlukan VIP access, menimbulkan error. Perlu dihapus seluruhnya.
2. **Whale Tracking & Trading Opportunities kosong** - Bug pada filter: data dari API menggunakan format 'BTC' tapi filter mencari 'BTCUSDT'.
3. **Pair yang dipilih tidak muncul di widget lain** - Ketika user memilih pair di Market Sentiment yang bukan top 5, pair tersebut harus tampil di paling atas Volatility Meter, Whale Tracking, dan Trading Opportunities.

---

## Bagian 1: Hapus Semua Kode Algo Orders

### File yang akan dihapus:
- `src/features/binance/useBinanceAlgoOrders.ts` - Hook untuk algo orders
- `src/components/trading/AlgoOrdersTab.tsx` - Komponen tab algo orders

### File yang akan dimodifikasi:

**1. `src/features/binance/index.ts`**
- Hapus export dari `useBinanceAlgoOrders`
- Hapus semua re-export terkait algo orders:
  - `useBinanceAlgoOrders`
  - `useBinanceAlgoOpenOrders`
  - `useBinanceAlgoOrder`
  - `getAlgoTypeLabel`
  - `getAlgoStatusVariant`

**2. `src/features/binance/types.ts`**
- Hapus BinanceAction types:
  - `'algo-orders'`
  - `'algo-open-orders'`
  - `'algo-order'`

**3. `src/pages/trading-journey/TradingJournal.tsx`**
- Hapus import `AlgoOrdersTab`
- Hapus tab "Algo Orders" dari TabsList (ubah grid-cols-3 menjadi grid-cols-2)
- Hapus TabsContent untuk "algo"
- Hapus icon Target dari imports jika tidak digunakan lagi

**4. `supabase/functions/binance-futures/index.ts`**
- Hapus function `getAlgoOrders`
- Hapus function `getAlgoOpenOrders`
- Hapus function `getAlgoOrder`
- Hapus case handler untuk 'algo-orders', 'algo-open-orders', 'algo-order' di main switch

---

## Bagian 2: Fix Whale Tracking & Trading Opportunities

### Root Cause:
Data dari `market-insight` edge function menggunakan format:
```javascript
{ asset: 'BTC', ... }  // untuk whale
{ pair: 'BTC/USDT', ... }  // untuk opportunities
```

Tapi filter di MarketData.tsx mencari:
```javascript
TOP_5_PAIRS = ['BTCUSDT', 'ETHUSDT', ...]
w.asset.includes('BTCUSDT')  // FALSE!
```

### Solusi:
**Modifikasi `src/pages/MarketData.tsx`:**

1. Ubah logic filter `getWhaleData()`:
```javascript
// OLD (salah)
return sentimentData.whaleActivity.filter(w => 
  TOP_5_PAIRS.includes(w.asset)
)

// NEW (benar)
const top5Assets = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB'];
return sentimentData.whaleActivity.filter(w => 
  top5Assets.includes(w.asset)
)
```

2. Ubah logic filter `getOpportunitiesData()`:
```javascript
// OLD (salah)
return sentimentData.opportunities.filter(o => 
  TOP_5_PAIRS.includes(o.pair)
)

// NEW (benar) - pair format is 'BTC/USDT'
const top5Pairs = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'BNB/USDT'];
return sentimentData.opportunities.filter(o => 
  top5Pairs.includes(o.pair)
)
```

---

## Bagian 3: Pair Terpilih Muncul di Widget Lain

### Requirement:
Ketika user memilih pair di Market Sentiment yang BUKAN top 5, pair tersebut harus:
- Muncul di paling atas Volatility Meter
- Muncul di paling atas Whale Tracking
- Muncul di paling atas Trading Opportunities

### Implementasi:

**1. MarketData.tsx - State Management:**
```javascript
// Tambah state untuk selected pair
const [selectedPair, setSelectedPair] = useState('BTCUSDT');

// Pass callback ke MarketSentimentWidget
<MarketSentimentWidget 
  defaultSymbol="BTCUSDT" 
  showSymbolSelector={true}
  onSymbolChange={setSelectedPair}  // NEW
/>
```

**2. MarketSentimentWidget.tsx - Add Callback:**
```javascript
interface MarketSentimentWidgetProps {
  defaultSymbol?: string;
  showSymbolSelector?: boolean;
  className?: string;
  onSymbolChange?: (symbol: string) => void;  // NEW
}

// Panggil callback saat symbol berubah
const handleSymbolChange = (newSymbol: string) => {
  setSymbol(newSymbol);
  onSymbolChange?.(newSymbol);  // NEW
};
```

**3. MarketData.tsx - Modified Widget Props:**

Untuk Volatility Meter:
```javascript
// Tambah selected pair ke symbols jika bukan top 5
const volatilitySymbols = useMemo(() => {
  const base = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT'];
  if (selectedPair && !base.includes(selectedPair)) {
    return [selectedPair, ...base];
  }
  return base;
}, [selectedPair]);

<VolatilityMeterWidget symbols={volatilitySymbols} />
```

Untuk Whale Tracking & Trading Opportunities:
```javascript
// Convert selectedPair untuk format yang sesuai
const selectedAsset = selectedPair.replace('USDT', '');  // 'BTCUSDT' -> 'BTC'
const selectedOpportunityPair = `${selectedAsset}/USDT`;  // 'BTC/USDT'

const getWhaleData = () => {
  if (!sentimentData?.whaleActivity) return [];
  const top5Assets = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB'];
  
  // Jika selected bukan top 5, ambil data untuk selected + top 5
  const isSelectedInTop5 = top5Assets.includes(selectedAsset);
  
  let result = sentimentData.whaleActivity.filter(w => 
    top5Assets.includes(w.asset)
  ).slice(0, 5);
  
  // Jika selected BUKAN top 5, cari di data dan tambahkan di depan
  if (!isSelectedInTop5) {
    const selectedWhale = sentimentData.whaleActivity.find(w => 
      w.asset === selectedAsset
    );
    if (selectedWhale) {
      result = [selectedWhale, ...result.slice(0, 4)];
    }
  }
  
  return result;
};
```

---

## File Changes Summary

| File | Action |
|------|--------|
| `src/features/binance/useBinanceAlgoOrders.ts` | DELETE |
| `src/components/trading/AlgoOrdersTab.tsx` | DELETE |
| `src/features/binance/index.ts` | EDIT - Remove algo exports |
| `src/features/binance/types.ts` | EDIT - Remove algo action types |
| `src/pages/trading-journey/TradingJournal.tsx` | EDIT - Remove algo tab |
| `supabase/functions/binance-futures/index.ts` | EDIT - Remove algo functions |
| `src/pages/MarketData.tsx` | EDIT - Fix filters & add selected pair logic |
| `src/components/market/MarketSentimentWidget.tsx` | EDIT - Add onSymbolChange callback |

---

## Catatan Teknis

1. **Edge Function Cleanup**: Fungsi `safeJsonParse` tetap dipertahankan karena mungkin berguna untuk endpoint lain di masa depan.

2. **Data Format Mismatch**: API `market-insight` menggunakan format berbeda:
   - Whale: `asset: 'BTC'`
   - Opportunities: `pair: 'BTC/USDT'`
   - Volatility: `symbol: 'BTCUSDT'`

3. **Fallback untuk Selected Pair**: Jika data untuk selected pair tidak tersedia dari API, widget tetap menampilkan top 5 tanpa error.
