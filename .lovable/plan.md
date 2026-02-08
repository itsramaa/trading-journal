
# Plan: Background-Persistent Full Sync

## ✅ COMPLETED

### Summary
Implemented global Zustand store untuk menyimpan state Full Sync secara persistent saat navigasi antar halaman.

### Changes Made

| File | Action | Description |
|------|--------|-------------|
| `src/store/sync-store.ts` | **CREATED** | Zustand store dengan state `fullSyncStatus`, `progress`, `result`, dan actions |
| `src/hooks/use-binance-aggregated-sync.ts` | **MODIFIED** | Menggunakan global store, bukan `useState` lokal |
| `src/components/trading/BinanceFullSyncPanel.tsx` | **MODIFIED** | Consume state dari store, bukan hook instance |
| `src/pages/TradeHistory.tsx` | **MODIFIED** | Menggunakan store selectors, bukan hook |
| `src/components/layout/GlobalSyncIndicator.tsx` | **CREATED** | Persistent progress indicator di header |
| `src/components/layout/DashboardLayout.tsx` | **MODIFIED** | Added GlobalSyncIndicator ke header |

### Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    DashboardLayout (App Level)              │
│                                                             │
│   <GlobalSyncIndicator />  ← Shows sync progress globally   │
│                                                             │
│   useBinanceBackgroundSync()  ← For incremental auto-sync   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ Zustand Store (sync-store.ts)
                           
┌─────────────────────────────────────────────────────────────┐
│                   useSyncStore (Global)                     │
│                                                             │
│   fullSyncStatus: 'idle' | 'running' | 'success' | 'error'  │
│   fullSyncProgress: AggregationProgress | null              │
│   fullSyncResult: AggregationResult | null                  │
│   actions: startFullSync(), updateProgress(), etc.          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ Consumed By
                           
┌─────────────────────────────────────────────────────────────┐
│                   Any Page                                  │
│                                                             │
│   const isRunning = useSyncStore(selectIsFullSyncRunning)   │
│   const progress = useSyncStore(selectFullSyncProgress)     │
│                                                             │
│   ✅ Sync state visible di semua halaman                    │
│   ✅ Navigasi tidak mengganggu sync                         │
│   ✅ Progress indicator persistent                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Testing Checklist

1. ✅ Mulai Full Sync di Trade History
2. ✅ Navigasi ke halaman lain → progress tetap muncul di header
3. ✅ Kembali ke Trade History → sync masih running
4. ✅ Tunggu sync selesai → result muncul
5. ✅ Test error scenarios → error state persists
