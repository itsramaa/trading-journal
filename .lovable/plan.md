
# Plan: Membuat Sync Binance Lebih Robust, Continueable, dan Tanpa Miss

## Analisis Masalah

Berdasarkan cross-check kode, saya mengidentifikasi beberapa **titik kegagalan potensial** yang menyebabkan sync berhenti tiba-tiba tanpa menyimpan data:

### 1. **Tidak Ada Checkpoint/Resume Capability**
- **File**: `src/hooks/use-binance-aggregated-sync.ts`
- **Masalah**: Jika proses berhenti di tengah-tengah (network error, tab ditutup, rate limit), semua progress hilang dan harus mulai dari awal
- **Dampak**: Data yang sudah di-fetch sebelum error tidak disimpan

### 2. **Single-Transaction Insert**
- **File**: `src/hooks/use-binance-aggregated-sync.ts` (lines 473-502)
- **Masalah**: Semua trades di-insert dalam satu batch besar. Jika batch gagal, tidak ada yang tersimpan
- **Dampak**: Error di satu trade membatalkan seluruh batch

### 3. **Error Handling Tidak Granular**
- **Masalah**: Ketika `Promise.all` untuk parallel fetch gagal, seluruh proses berhenti
- **Dampak**: Satu symbol gagal = semua symbol gagal

### 4. **Tidak Ada Partial Progress Save**
- **Masalah**: Progress hanya disimpan di memory (Zustand store), bukan persisted dengan data fetch
- **Dampak**: Jika error terjadi setelah fetch tapi sebelum insert, data hilang

### 5. **Income API Empty Response Handling**
- **Dari network logs**: `{"success":true,"data":[]}` untuk income
- **Masalah**: Jika income kosong, proses berhenti dengan "0 symbols found"
- **Dampak**: Akun baru atau periode tanpa trade tidak handle dengan baik

---

## Solusi: Robust Sync Architecture

### Phase 1: Checkpoint-Based Sync dengan Partial Saves

```text
┌─────────────────────────────────────────────────────────────────┐
│                     IMPROVED SYNC FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. FETCH INCOME ──────────────────────────────────────────────│
│     └── Save checkpoint: { phase: 'income', data: [...] }      │
│                                                                 │
│  2. FETCH TRADES (per symbol with error tolerance)              │
│     ├── Symbol A: success ──> save checkpoint                  │
│     ├── Symbol B: FAIL ──> log, continue next                  │
│     └── Symbol C: success ──> save checkpoint                  │
│                                                                 │
│  3. GROUP INTO LIFECYCLES ─────────────────────────────────────│
│     └── Save checkpoint: { phase: 'grouped', lifecycles }      │
│                                                                 │
│  4. AGGREGATE (batch insert with retry)                         │
│     ├── Batch 1 (50 trades): success ──> committed to DB       │
│     ├── Batch 2 (50 trades): FAIL ──> retry 3x                 │
│     └── Batch 3 (50 trades): success ──> committed to DB       │
│                                                                 │
│  5. RECONCILE & REPORT ────────────────────────────────────────│
│     └── Report partial success + failed symbols list           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementasi Teknis

### File-file yang Dimodifikasi:

1. **`src/store/sync-store.ts`** - Tambah checkpoint state
2. **`src/hooks/use-binance-aggregated-sync.ts`** - Rewrite dengan checkpoint logic
3. **`src/services/binance/types.ts`** - Tambah checkpoint types
4. **`src/components/trading/BinanceFullSyncPanel.tsx`** - UI untuk resume

---

### 1. Update `src/store/sync-store.ts` - Checkpoint Persistence

Tambahkan checkpoint state yang persist ke localStorage:

```typescript
interface SyncCheckpoint {
  // Phase tracking
  currentPhase: 'idle' | 'fetching-income' | 'fetching-trades' | 'grouping' | 'aggregating' | 'inserting';
  
  // Data checkpoints
  incomeData: BinanceIncome[] | null;
  tradesBySymbol: Record<string, BinanceTrade[]>;
  ordersBySymbol: Record<string, BinanceOrder[]>;
  
  // Progress tracking
  processedSymbols: string[];
  failedSymbols: Array<{ symbol: string; error: string }>;
  
  // Resume metadata
  syncStartTime: number;
  syncRangeDays: number | 'max';
  lastCheckpointTime: number;
}

interface SyncStoreState {
  // ... existing state ...
  
  // NEW: Checkpoint
  checkpoint: SyncCheckpoint | null;
  
  // NEW: Actions
  saveCheckpoint: (checkpoint: Partial<SyncCheckpoint>) => void;
  clearCheckpoint: () => void;
  hasResumableSync: () => boolean;
}
```

### 2. Update `src/hooks/use-binance-aggregated-sync.ts` - Core Logic

#### A. Per-Symbol Error Tolerance (Replace parallel fetch)

```typescript
// BEFORE: Promise.all fails if ANY symbol fails
const batchResults = await Promise.all(
  batch.map(async (symbol) => { ... })
);

// AFTER: Promise.allSettled continues even if some fail
const batchResults = await Promise.allSettled(
  batch.map(async (symbol) => {
    try {
      const [trades, orders] = await Promise.all([
        fetchTradesForSymbol(symbol, startTime, endTime),
        fetchOrdersForSymbol(symbol, startTime, endTime),
      ]);
      return { symbol, trades, orders, success: true };
    } catch (error) {
      console.error(`[FullSync] Failed to fetch ${symbol}:`, error);
      return { symbol, trades: [], orders: [], success: false, error };
    }
  })
);

// Process results - continue with successful ones
for (const result of batchResults) {
  if (result.status === 'fulfilled') {
    const { symbol, trades, orders, success } = result.value;
    if (success) {
      allTrades.push(...trades);
      allOrders.push(...orders);
      processedSymbols.push(symbol);
    } else {
      failedSymbols.push({ symbol, error: result.value.error?.message });
    }
    // Save checkpoint after each symbol
    saveCheckpoint({ 
      tradesBySymbol: { ...checkpoint.tradesBySymbol, [symbol]: trades }
    });
  }
}
```

#### B. Batched DB Insert dengan Retry

```typescript
// BEFORE: Single insert for all trades
const { error: insertError } = await supabase
  .from('trade_entries')
  .insert(dbRows);

// AFTER: Batched insert with retry per batch
const BATCH_SIZE = 50;
const insertedTrades: AggregatedTrade[] = [];
const insertErrors: Array<{ batch: number; error: string }> = [];

for (let i = 0; i < newTrades.length; i += BATCH_SIZE) {
  const batch = newTrades.slice(i, i + BATCH_SIZE);
  const dbRows = batch.map(t => mapToDbRow(t, user.id));
  
  // Retry logic per batch
  let retries = 3;
  let success = false;
  
  while (retries > 0 && !success) {
    const { error } = await supabase
      .from('trade_entries')
      .insert(dbRows);
    
    if (!error) {
      success = true;
      insertedTrades.push(...batch);
      console.log(`[FullSync] Batch ${Math.floor(i/BATCH_SIZE) + 1} inserted successfully`);
    } else {
      retries--;
      if (retries > 0) {
        console.warn(`[FullSync] Batch failed, retrying (${retries} left)...`);
        await new Promise(r => setTimeout(r, 1000));
      } else {
        insertErrors.push({ 
          batch: Math.floor(i/BATCH_SIZE) + 1, 
          error: error.message 
        });
      }
    }
  }
  
  // Update progress for each batch
  updateProgress({
    phase: 'inserting',
    current: Math.min(i + BATCH_SIZE, newTrades.length),
    total: newTrades.length,
    message: `Saving batch ${Math.floor(i/BATCH_SIZE) + 1}...`,
  });
}
```

#### C. Resume Capability

```typescript
export function useBinanceAggregatedSync() {
  const { checkpoint, saveCheckpoint, clearCheckpoint, hasResumableSync } = useSyncStore();
  
  // Check if there's a resumable sync
  const canResume = hasResumableSync();
  
  const resumeSync = useCallback(async () => {
    if (!checkpoint) return;
    
    // Resume from last checkpoint phase
    switch (checkpoint.currentPhase) {
      case 'fetching-income':
        // Income was fetched, continue to trades
        await fetchTradesForSymbols(checkpoint.incomeData);
        break;
        
      case 'fetching-trades':
        // Resume from remaining symbols
        const remainingSymbols = getSymbolsNotInCheckpoint(checkpoint);
        await fetchTradesForSymbols(remainingSymbols);
        break;
        
      case 'grouping':
        // Trades fetched, continue grouping
        await groupAndAggregate(checkpoint.tradesBySymbol);
        break;
        
      case 'aggregating':
        // Continue from aggregation
        await completeAggregation(checkpoint);
        break;
    }
  }, [checkpoint]);
  
  return {
    // ... existing returns ...
    canResume,
    resumeSync,
  };
}
```

### 3. Update `src/components/trading/BinanceFullSyncPanel.tsx` - Resume UI

Tambahkan tombol Resume ketika ada checkpoint tersimpan:

```typescript
export function BinanceFullSyncPanel({ isBinanceConnected, compact }: Props) {
  const { canResume, resumeSync } = useBinanceAggregatedSync();
  
  // Show resume option if checkpoint exists
  if (canResume && status === 'idle') {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Incomplete sync found
        </Badge>
        
        <Button variant="default" size="sm" onClick={resumeSync}>
          <PlayCircle className="h-4 w-4 mr-2" />
          Resume Sync
        </Button>
        
        <Button variant="ghost" size="sm" onClick={clearCheckpoint}>
          <X className="h-4 w-4 mr-2" />
          Discard
        </Button>
      </div>
    );
  }
  
  // ... rest of existing logic
}
```

### 4. Update Types (`src/services/binance/types.ts`)

```typescript
// Add phase for 'inserting'
export interface AggregationProgress {
  phase: 'fetching-trades' | 'fetching-income' | 'grouping' | 'aggregating' | 'validating' | 'inserting';
  current: number;
  total: number;
  message: string;
}

// Add partial result tracking
export interface AggregationResult {
  // ... existing fields ...
  
  // NEW: Partial success tracking
  partialSuccess: {
    insertedCount: number;
    failedBatches: Array<{ batch: number; error: string }>;
    failedSymbols: Array<{ symbol: string; error: string }>;
    skippedDueToError: number;
  };
}
```

---

## Urutan Implementasi

| Step | File | Perubahan |
|------|------|-----------|
| 1 | `src/services/binance/types.ts` | Tambah checkpoint types & update AggregationProgress |
| 2 | `src/store/sync-store.ts` | Tambah checkpoint state & persistence |
| 3 | `src/hooks/use-binance-aggregated-sync.ts` | Rewrite dengan checkpoint, batched insert, error tolerance |
| 4 | `src/components/trading/BinanceFullSyncPanel.tsx` | UI Resume button |

---

## Hasil yang Diharapkan

1. **Continueable**: Jika sync berhenti di tengah, bisa di-resume dari checkpoint terakhir
2. **Partial Success**: Jika beberapa symbol gagal, yang sukses tetap tersimpan
3. **Batched Insert**: Error di satu batch tidak membatalkan batch lain
4. **No Data Loss**: Progress di-checkpoint setiap tahap, data tidak hilang
5. **Transparent Reporting**: UI menampilkan berapa yang sukses, berapa yang skip/failed

---

## Catatan Teknis

- Checkpoint disimpan ke localStorage dengan key `binance_sync_checkpoint`
- Checkpoint expired setelah 24 jam (untuk menghindari stale data)
- Batched insert menggunakan 50 trades per batch (optimized for Supabase)
- Failed symbols dicatat dan bisa di-retry manual via Re-Sync Time Window
