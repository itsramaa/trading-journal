
# Deep Dive Audit: Market Data Page

## Executive Summary

Audit terhadap seluruh domain Market Data berdasarkan 6 judging criteria menemukan **2 critical issues**, **3 medium issues**, dan **4 minor improvements**. Arsitektur secara keseluruhan sudah solid dengan centralized config, ErrorBoundary wrapping, dan type safety. Namun ada inkonsistensi kritis pada state management dan security gap pada API call.

---

## 1. ACCURACY - MarketData Page Ignores Global MarketContext (CRITICAL)

**Problem:** `MarketContext` sudah tersedia sebagai global state untuk `selectedSymbol`, digunakan di `PositionCalculator`. Tapi `MarketData.tsx` menggunakan `useState` lokal sendiri (line 21):
```typescript
const [selectedPair, setSelectedPair] = useState(DEFAULT_SYMBOL);
```

Ini berarti:
- Jika user memilih SOLUSDT di Market Data, lalu pindah ke Calculator, symbol tidak sync
- Jika user sudah set ETHUSDT di Calculator, masuk ke Market Data tetap BTCUSDT
- Melanggar memory `architecture/global-market-context` yang menyatakan symbol harus persist across pages

**Fix:** Ganti `useState` dengan `useMarketContext()`:
```typescript
const { selectedSymbol, setSelectedSymbol } = useMarketContext();
```
Dan map `onSymbolChange` ke `setSelectedSymbol`.

**Files:** `src/pages/MarketData.tsx`

---

## 2. SECURITY - callMarketDataApi Missing Auth Header (CRITICAL)

**Problem:** `callMarketDataApi` di `useBinanceMarketData.ts` (line 38-49) menggunakan `fetch()` langsung tanpa menyertakan `Authorization` header atau Supabase anon key:
```typescript
const response = await fetch(MARKET_DATA_FUNCTION_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action, ...params }),
});
```

Sementara hook lain seperti `useMultiSymbolMarketInsight` menggunakan `supabase.functions.invoke()` yang secara otomatis menyertakan auth header. Tanpa minimal anon key, edge function bisa reject request.

**Fix:** Tambahkan `Authorization` header dengan anon key, atau lebih baik refactor untuk menggunakan `supabase.functions.invoke()` agar konsisten dengan pattern lain:
```typescript
async function callMarketDataApi<T>(action: string, params: Record<string, any> = {}): Promise<MarketDataApiResponse<T>> {
  const { data, error } = await supabase.functions.invoke('binance-market-data', {
    body: { action, ...params },
  });
  if (error) return { success: false, error: error.message };
  return data as MarketDataApiResponse<T>;
}
```

**Files:** `src/features/binance/useBinanceMarketData.ts`

---

## 3. CLARITY - WhaleTrackingWidget Error Prop Type Mismatch (MEDIUM)

**Problem:** `MarketData.tsx` line 84 passes `error` (which is `Error | null` from react-query) directly to `WhaleTrackingWidget`:
```typescript
<WhaleTrackingWidget error={error} ... />
```

Tapi untuk `TradingOpportunitiesWidget` (line 94), error di-wrap terlebih dahulu:
```typescript
const apiError = error instanceof Error ? error : error ? new Error(String(error)) : null;
<TradingOpportunitiesWidget error={apiError} ... />
```

Inkonsistensi ini berarti `WhaleTrackingWidget` bisa menerima non-Error object, yang akan menyebabkan `error.message` undefined di `AsyncErrorFallback`.

**Fix:** Gunakan error wrapping yang sama untuk kedua widget. Atau lebih baik, buat utility `normalizeError()` dan gunakan di kedua tempat.

**Files:** `src/pages/MarketData.tsx`

---

## 4. CODE QUALITY - VolatilityMeterWidget onRetry Uses window.location.reload() (MEDIUM)

**Problem:** `VolatilityMeterWidget` (line 212) menggunakan `window.location.reload()` sebagai retry handler:
```typescript
<ErrorBoundary onRetry={() => window.location.reload()}>
```

Ini adalah anti-pattern di SPA karena:
- Menghapus semua React state dan cache
- Memaksa full page reload yang lambat
- Inkonsisten dengan widget lain yang menggunakan `refetch()`

Tapi karena `VolatilityMeterWidget` mengelola data fetching secara internal (via `useMultiSymbolVolatility`), parent tidak punya akses ke `refetch()`.

**Fix:** Expose internal refetch via callback, atau gunakan key-based remount sebagai alternative:
```typescript
// Gunakan key-based remount instead of full reload
const [retryKey, setRetryKey] = useState(0);
<ErrorBoundary onRetry={() => setRetryKey(k => k + 1)}>
  <VolatilityMeterContent key={retryKey} {...props} />
</ErrorBoundary>
```

**Files:** `src/components/dashboard/VolatilityMeterWidget.tsx`

---

## 5. CLARITY - MarketSentimentWidget Internal Symbol State Disconnected (MEDIUM)

**Problem:** `MarketSentimentWidget` menerima `defaultSymbol` prop (line 59) tapi mengelola symbol selection secara internal:
```typescript
const [symbol, setSymbol] = useState(defaultSymbol);
```

Jika parent (MarketData) mengubah `defaultSymbol` setelah initial render, widget tidak akan update karena `useState` hanya membaca initial value.

Ini terkait dengan Fix #1 - setelah menggunakan MarketContext, perlu dipastikan widget sync dengan context.

**Fix:** Jadikan widget controlled component - terima `symbol` dan `onSymbolChange` dari parent, atau sync internal state dengan prop via `useEffect`.

**Files:** `src/components/market/MarketSentimentWidget.tsx`

---

## 6. ACCURACY - Sentiment Score Calculation Edge Case (MINOR)

**Problem:** Di `useBinanceMarketSentiment` (line 413-414):
```typescript
const totalFactors = bullishFactors + bearishFactors;
const bullishScore = totalFactors > 0 ? Math.round((bullishFactors / totalFactors) * 100) : 50;
```

Jika semua 5 faktor neutral (totalFactors = 0), score default ke 50. Ini benar secara logika, tapi faktor neutral seharusnya juga dihitung - 5 neutral berbeda dari 0 data. Saat ini keduanya menghasilkan score 50.

**Fix (minor):** Tidak blocking, tapi bisa ditambahkan label "Insufficient Data" vs "Neutral" untuk membedakan kedua case.

---

## 7. CODE QUALITY - Unused Import BADGE_LABELS di MarketData.tsx (MINOR)

**Problem:** Line 17 imports `BADGE_LABELS` tapi tidak digunakan di `MarketData.tsx`:
```typescript
import { ..., BADGE_LABELS } from "@/lib/constants/market-config";
```

`BADGE_LABELS` hanya digunakan di child widgets (`WhaleTrackingWidget`, `TradingOpportunitiesWidget`), bukan di page level.

**Fix:** Remove unused import.

---

## 8. INNOVATION - Missing ARIA Labels on Market Data Page (MINOR)

**Problem:** Berdasarkan memory `accessibility/aria-standardization`, semua analytics components harus memiliki ARIA support. Market Data page dan widget-widgetnya belum memiliki `role="region"` atau `aria-label`.

**Fix:** Tambahkan ARIA attributes:
```typescript
<div className="space-y-6" role="region" aria-label="Market Data Dashboard">
```
Dan pada setiap widget Card:
```typescript
<Card className={className} role="region" aria-label="Market Sentiment">
```

---

## 9. CLARITY - Data Quality Footer Not Responsive (MINOR)

**Problem:** Footer di line 100-110:
```typescript
<div className="flex items-center justify-between text-xs text-muted-foreground">
```

Pada mobile, `justify-between` bisa membuat text terlalu rapat. Dan separator `•` bisa terpotong.

**Fix:** Tambahkan `flex-wrap gap-2` dan pisahkan menjadi items terpisah.

---

## Implementation Priority

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| P0 | #1 Use MarketContext instead of local state | Data consistency | Low |
| P0 | #2 Fix callMarketDataApi auth header | Security | Low |
| P1 | #3 Normalize error prop for WhaleTrackingWidget | Bug prevention | Low |
| P1 | #4 Fix VolatilityMeter retry (remove reload) | UX | Low |
| P1 | #5 Sync MarketSentimentWidget with parent state | UX consistency | Medium |
| P2 | #7 Remove unused import | Code cleanliness | Trivial |
| P2 | #8 Add ARIA labels | Accessibility | Low |
| P2 | #9 Responsive footer | Mobile UX | Trivial |
| P3 | #6 Sentiment edge case labeling | Accuracy polish | Low |

---

## Technical Plan

### Phase 1: Critical Fixes (P0)
1. Update `MarketData.tsx` to use `useMarketContext()` instead of `useState`
2. Refactor `callMarketDataApi` to use `supabase.functions.invoke()`
3. Remove unused `BADGE_LABELS` import

### Phase 2: Consistency Fixes (P1)
4. Create `normalizeError()` utility and apply to both whale and opportunities error props
5. Fix `VolatilityMeterWidget` retry to use key-based remount instead of `window.location.reload()`
6. Update `MarketSentimentWidget` to be controlled by parent symbol state

### Phase 3: Polish (P2-P3)
7. Add ARIA `role="region"` and `aria-label` to all Market Data widgets
8. Make footer responsive with `flex-wrap`
9. Add "Insufficient Data" label for sentiment edge case
