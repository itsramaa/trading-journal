

# Plan: Perbaikan Full Sync untuk Memastikan Semua Data Ter-fetch

## Diagnosis Masalah

Berdasarkan analisis mendalam terhadap kode dan network logs, saya menemukan beberapa masalah kritis:

### 1. Pagination Bug di Income Fetching
```
File: src/hooks/use-binance-aggregated-sync.ts (lines 204-243)
```
**Masalah**: Fungsi `fetchAllIncome` menggunakan parameter `page` yang **tidak didukung** oleh Binance Income API. Binance hanya mendukung time-based atau `fromId` cursor pagination.

**Akibat**: Hanya 1000 income records pertama yang diambil, sisanya hilang.

### 2. Time Chunking Tidak Optimal
**Masalah**: Menggunakan 30-day chunks untuk income, tapi tidak ada mekanisme untuk fetch beyond 1000 records per chunk.

**Akibat**: Jika dalam 30 hari ada >1000 trades, sebagian akan hilang.

### 3. Tidak Ada Logging untuk Debugging
**Masalah**: Tidak ada console.log yang menunjukkan actual startTime dan endTime saat fetch income.

**Akibat**: Sulit debug kenapa data tidak lengkap.

---

## Solusi: Refactor Income Fetching dengan Proper Pagination

### Perubahan di `src/hooks/use-binance-aggregated-sync.ts`

```text
┌─────────────────────────────────────────────────────────────────┐
│                    IMPROVED INCOME FETCHING                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. TIME-BASED CHUNKING (30-day windows)                        │
│     └── For each 30-day chunk:                                  │
│         ├── Fetch first 1000 records                            │
│         ├── If got 1000 → use last tranId for cursor           │
│         └── Continue until < 1000 records returned              │
│                                                                 │
│  2. LOGGING untuk debug                                         │
│     └── Log actual time range dan record count                  │
│                                                                 │
│  3. SAFETY LIMIT                                                │
│     └── Max 20,000 income records per sync (prevent hang)      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Kode yang Akan Diubah:

**A. Update `fetchAllIncome` function:**

```typescript
async function fetchAllIncome(
  startTime: number,
  endTime: number,
  onProgress?: (fetched: number) => void
): Promise<BinanceIncome[]> {
  const allRecords: BinanceIncome[] = [];
  const numChunks = Math.ceil((endTime - startTime) / MAX_INCOME_INTERVAL_MS);
  
  console.log(`[FullSync] Fetching income from ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);
  console.log(`[FullSync] Time range: ${Math.round((endTime - startTime) / (24 * 60 * 60 * 1000))} days in ${numChunks} chunks`);
  
  const MAX_RECORDS_SAFETY = 20000; // Safety limit
  
  for (let i = 0; i < numChunks; i++) {
    const chunkStart = startTime + (i * MAX_INCOME_INTERVAL_MS);
    const chunkEnd = Math.min(chunkStart + MAX_INCOME_INTERVAL_MS, endTime);
    
    console.log(`[FullSync] Chunk ${i + 1}/${numChunks}: ${new Date(chunkStart).toISOString()} - ${new Date(chunkEnd).toISOString()}`);
    
    // Cursor-based pagination within chunk
    let lastTranId: number | undefined = undefined;
    let chunkRecords = 0;
    
    while (allRecords.length < MAX_RECORDS_SAFETY) {
      const result = await callBinanceApi<BinanceIncome[]>('income', {
        startTime: chunkStart,
        endTime: chunkEnd,
        limit: RECORDS_PER_PAGE,
        ...(lastTranId && { fromId: lastTranId }),
      });
      
      if (!result.success || !result.data?.length) break;
      
      allRecords.push(...result.data);
      chunkRecords += result.data.length;
      onProgress?.(allRecords.length);
      
      // If less than limit, we've got all records for this chunk
      if (result.data.length < RECORDS_PER_PAGE) break;
      
      // Get cursor for next page (tranId of last record + 1)
      const lastRecord = result.data[result.data.length - 1];
      lastTranId = typeof lastRecord.tranId === 'string' 
        ? parseInt(lastRecord.tranId, 10) + 1
        : lastRecord.tranId + 1;
      
      await new Promise(r => setTimeout(r, getAdaptiveDelay()));
    }
    
    console.log(`[FullSync] Chunk ${i + 1} fetched ${chunkRecords} records`);
    
    if (i < numChunks - 1) {
      await new Promise(r => setTimeout(r, getAdaptiveDelay()));
    }
  }
  
  console.log(`[FullSync] Total income records fetched: ${allRecords.length}`);
  
  return allRecords;
}
```

**B. Update Edge Function untuk mendukung `fromId` dengan benar:**

Edge function sudah mendukung `fromId` (line 614), jadi tidak perlu diubah.

**C. Tambahkan logging di mutation function:**

```typescript
// Di dalam syncMutation.mutationFn (sekitar line 535)
console.log(`[FullSync] Starting sync with range: ${options.daysToSync}`);
console.log(`[FullSync] Time range: ${new Date(startTime).toISOString()} - ${new Date(endTime).toISOString()}`);
```

---

## File yang Akan Dimodifikasi

| File | Perubahan |
|------|-----------|
| `src/hooks/use-binance-aggregated-sync.ts` | Fix income pagination, tambah logging |

---

## Expected Result

Setelah perbaikan:
1. **Semua income records** akan ter-fetch, tidak hanya 1000 pertama
2. **Console logs** akan menunjukkan actual time range yang di-fetch
3. **Debug lebih mudah** jika ada masalah
4. **Safety limit** mencegah infinite loop atau memory issues

---

## Catatan Teknis

- Binance Income API menggunakan **tranId** sebagai cursor, bukan page number
- Limit per request adalah 1000 records
- Time-based chunking (30 hari) tetap diperlukan karena Binance mungkin membatasi data lama
- `fromId` harus berupa tranId + 1 untuk mendapat record berikutnya

