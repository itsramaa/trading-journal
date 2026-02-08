
# Plan: Background-Persistent Full Sync

## 1. Problem Summary

| Issue | Penyebab | Dampak |
|-------|----------|--------|
| **Sync restart saat navigasi** | State disimpan di `useState` dalam komponen | User harus re-click button setelah pindah halaman |
| **Progress hilang** | Komponen unmount = state hilang | User tidak tahu sync masih jalan atau tidak |
| **Inkonsisten dengan Settings** | Full Sync di TradeHistory, Auto-Sync di Settings | Membingungkan user |

## 2. Root Cause Analysis

```text
CURRENT ARCHITECTURE (Broken):
┌─────────────────────────────────────────────────────────────┐
│                     TradeHistory Page                       │
│                                                             │
│   useBinanceAggregatedSync()                                │
│   └── useState(progress)  ← HILANG saat unmount             │
│   └── useState(result)    ← HILANG saat unmount             │
│                                                             │
│   BinanceFullSyncPanel                                      │
│   └── useBinanceAggregatedSync() ← BUAT INSTANCE BARU       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ Navigation
                           
┌─────────────────────────────────────────────────────────────┐
│                      Other Page                             │
│                                                             │
│   ❌ Tidak ada state sync                                   │
│   ❌ Sync tetap jalan tapi tidak visible                    │
│   ❌ Saat kembali ke TradeHistory = state reset             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 3. Solution Architecture

```text
TARGET ARCHITECTURE (Fixed):
┌─────────────────────────────────────────────────────────────┐
│                    DashboardLayout (App Level)              │
│                                                             │
│   useGlobalSyncState()  ← ZUSTAND STORE (PERSISTENT)        │
│   └── syncState: { isRunning, progress, result }            │
│   └── actions: startSync(), updateProgress(), etc.          │
│                                                             │
│   useBinanceBackgroundSync()                                │
│   └── Untuk incremental auto-sync                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ Shared State
                           
┌─────────────────────────────────────────────────────────────┐
│                   Any Page (TradeHistory, Settings, etc.)   │
│                                                             │
│   const { isRunning, progress } = useGlobalSyncState()      │
│                                                             │
│   ✅ Sync state visible di semua halaman                    │
│   ✅ Navigasi tidak mengganggu sync                         │
│   ✅ Progress indicator persistent                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 4. Implementation Plan

### Phase A: Create Global Sync Store

**File:** `src/store/sync-store.ts`

Zustand store untuk menyimpan state sync secara global:

```text
State:
- fullSyncState: 'idle' | 'running' | 'success' | 'error'
- fullSyncProgress: AggregationProgress | null
- fullSyncResult: AggregationResult | null
- fullSyncError: string | null
- fullSyncStartTime: number | null

Actions:
- startFullSync(): Mark sync as running
- updateProgress(progress): Update progress state
- completeFullSync(result): Mark as complete with result
- failFullSync(error): Mark as failed
- resetFullSync(): Reset to idle

Persistence:
- Partial persistence: lastResult, lastSyncTime (not running state)
```

### Phase B: Refactor useBinanceAggregatedSync

**File:** `src/hooks/use-binance-aggregated-sync.ts`

Modifikasi untuk menggunakan global store:

1. **Replace useState dengan store selectors:**
   - `progress` → `useGlobalSyncStore(s => s.fullSyncProgress)`
   - `result` → `useGlobalSyncStore(s => s.fullSyncResult)`

2. **Update mutation callbacks:**
   - `onMutate` → `startFullSync()`
   - Progress updates → `updateProgress()`
   - `onSuccess` → `completeFullSync()`
   - `onError` → `failFullSync()`

3. **Prevent duplicate runs:**
   - Cek `fullSyncState === 'running'` sebelum mulai
   - Return early jika sudah jalan

### Phase C: Update UI Components

**Files:**
- `src/components/trading/BinanceFullSyncPanel.tsx`
- `src/pages/TradeHistory.tsx`

Perubahan:
1. Consume state dari store, bukan dari hook instance
2. Disable button jika sync sudah running di tempat lain
3. Show global progress indicator

### Phase D: Add Global Progress Indicator

**File:** `src/components/layout/GlobalSyncIndicator.tsx`

Komponen kecil di header/footer untuk menunjukkan sync sedang berjalan:

```text
┌────────────────────────────────────────────────┐
│ 🔄 Full Sync: Fetching trades (32/45)... 71%   │
└────────────────────────────────────────────────┘
```

Mount di `DashboardLayout.tsx` agar visible di semua halaman.

## 5. Technical Details

### Store Schema

```typescript
interface GlobalSyncState {
  // Full Sync
  fullSyncStatus: 'idle' | 'running' | 'success' | 'error';
  fullSyncProgress: AggregationProgress | null;
  fullSyncResult: AggregationResult | null;
  fullSyncError: string | null;
  fullSyncStartTime: number | null;
  
  // Actions
  startFullSync: () => void;
  updateProgress: (progress: AggregationProgress) => void;
  completeFullSync: (result: AggregationResult) => void;
  failFullSync: (error: string) => void;
  resetFullSync: () => void;
}
```

### Singleton Pattern untuk Actual Sync

Karena hook bisa di-mount di multiple places, perlu guard:

```typescript
// In hook
const { fullSyncStatus, startFullSync } = useGlobalSyncStore();

const sync = useCallback(() => {
  // Guard: prevent multiple concurrent syncs
  if (fullSyncStatus === 'running') {
    toast.info('Sync already in progress');
    return;
  }
  
  startFullSync();
  syncMutation.mutate(options);
}, [fullSyncStatus]);
```

## 6. Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/store/sync-store.ts` | **CREATE** | Global Zustand store for sync state |
| `src/hooks/use-binance-aggregated-sync.ts` | **MODIFY** | Use global store instead of local state |
| `src/components/trading/BinanceFullSyncPanel.tsx` | **MODIFY** | Read from global store |
| `src/pages/TradeHistory.tsx` | **MODIFY** | Remove duplicate hook call, use store |
| `src/components/layout/GlobalSyncIndicator.tsx` | **CREATE** | Persistent progress indicator |
| `src/components/layout/DashboardLayout.tsx` | **MODIFY** | Add GlobalSyncIndicator |

## 7. Benefits

1. **Sync tetap jalan saat navigasi** - State di Zustand tidak hilang
2. **Single source of truth** - Semua halaman baca dari satu store
3. **Consistent UX** - Progress visible di mana saja
4. **No duplicate syncs** - Guard mencegah double-trigger
5. **Aligned with Settings** - Auto-sync dan Full Sync menggunakan arsitektur serupa

## 8. Testing Checklist

1. Mulai Full Sync di Trade History
2. Navigasi ke halaman lain (Dashboard, Settings)
3. Verify progress indicator tetap muncul
4. Navigasi kembali ke Trade History
5. Verify sync masih running (bukan restart)
6. Tunggu sync selesai, verify result muncul
7. Test cancel/error scenarios
