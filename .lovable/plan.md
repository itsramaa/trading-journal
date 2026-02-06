

# Plan: Hapus Batasan 1 Tahun - Fetch Seluruh History Binance

## Ringkasan Perubahan

Menghapus batasan 1 tahun pada pengambilan data Binance untuk mendukung **seluruh riwayat trading** tanpa batas waktu.

---

## Analisis Limitasi API Binance

| Parameter | Limitasi Binance API |
|-----------|---------------------|
| **Max per request** | 1000 records |
| **Max time window** | 3 bulan (90 hari) per request |
| **Total history** | **Unlimited** (bisa sejak akun dibuat) |

Sistem **sudah mendukung** chunked fetching melalui `useBinanceFullSync`, tapi saat ini dibatasi 12 bulan.

---

## Perubahan yang Diperlukan

### 1. Update `src/hooks/use-binance-full-sync.ts`

**Perubahan:**
- Ubah default `monthsBack` dari `12` menjadi `24` atau lebih
- Tambahkan opsi `fetchAll: true` untuk fetch unlimited history
- Deteksi awal akun dari record pertama yang ditemukan

```typescript
export interface FullSyncOptions {
  monthsBack?: number;
  fetchAll?: boolean; // NEW: Fetch seluruh history
  onProgress?: (progress: number) => void;
}

// Modified chunked fetching - keep going until no more data
async function fetchChunkedIncomeHistory(
  monthsBack: number = 24, // Increased default
  fetchAll: boolean = false,
  onProgress?: (progress: number) => void
)
```

### 2. Update `src/components/trading/FeeHistoryTab.tsx`

**Perubahan:**
- Saat `showFullHistory = true`, gunakan chunked fetching tanpa batas
- Implementasi lazy loading untuk data besar

```typescript
// Calculate days - support unlimited when showFullHistory
const days = useMemo(() => {
  if (showFullHistory) return 730; // 2 years for now, can be extended
  // ... rest
}, [dateRange, showFullHistory]);
```

### 3. Update `src/components/trading/FundingHistoryTab.tsx`

Same pattern as FeeHistoryTab.

### 4. Update `src/features/binance/useBinanceFutures.ts`

**Perubahan pada `useBinanceAllIncome`:**
```typescript
export function useBinanceAllIncome(daysBack = 7, limit = 1000, enableChunking = false) {
  // If daysBack > 90 and enableChunking, use multiple requests
  // This allows fetching beyond the 3-month API limit
}
```

---

## Strategi Pengambilan Data

### Tanpa Chunking (Default, Fast):
```
daysBack <= 90 → Single API call
```

### Dengan Chunking (Full History, Slower):
```
daysBack > 90 → Multiple API calls in 90-day chunks
└── Chunk 1: today - 90 days
└── Chunk 2: 90 days - 180 days
└── Chunk 3: 180 days - 270 days
└── ... continue until no more data
```

---

## File yang Akan Dimodifikasi

| File | Perubahan |
|------|-----------|
| `src/hooks/use-binance-full-sync.ts` | Increase default, add `fetchAll` option |
| `src/features/binance/useBinanceFutures.ts` | Add chunked fetching to `useBinanceAllIncome` |
| `src/components/trading/FeeHistoryTab.tsx` | Increase max days untuk full history |
| `src/components/trading/FundingHistoryTab.tsx` | Same as above |

---

## Perilaku Baru

| Toggle | Perilaku Sebelum | Perilaku Sesudah |
|--------|-----------------|------------------|
| **Full History = OFF** | Filter by date range | Same (no change) |
| **Full History = ON** | Max 365 hari | Max **730 hari** (2 tahun), bisa diperluas |

---

## Trade-offs

### Pro:
- User bisa melihat seluruh history trading
- Data fees dan funding lengkap untuk tax reporting

### Contra:
- Request lebih banyak ke API (chunked)
- Loading time lebih lama untuk history besar
- Rate limit Binance bisa tercapai lebih cepat

---

## Rekomendasi Implementasi

1. **Phase 1**: Tingkatkan default dari 365 → 730 hari (2 tahun)
2. **Phase 2**: Jika user butuh lebih, implementasi dynamic chunking yang terus fetch sampai tidak ada data

Untuk saat ini, **730 hari (2 tahun)** adalah kompromi yang reasonable antara coverage data dan performance.

---

## Technical Summary

1. **Extend `useBinanceAllIncome`**: Support `daysBack > 365` dengan chunked fetching
2. **Extend Sync hooks**: Increase default sync window
3. **Update Tab components**: Ubah `365` → `730` untuk full history mode
4. **Optional**: Add progress indicator untuk large data fetches

