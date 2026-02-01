
# Fix Plan: Complete Trade History with Binance Full Sync

## Problem Analysis

### What's Actually Happening

```text
Network Log Analysis:
GET /trade_entries?...&trade_date=gte.2025-02-01

✅ startDate filter IS working correctly
✅ Pagination is working
✅ 12 trades returned (all that exist in database)

Root Cause: Not a filter bug - LIMITED BINANCE SYNC
```

### The Real Issues

| Issue | Current State | Desired State |
|-------|---------------|---------------|
| Binance Sync Range | Default 7 days (`daysToSync = 7`) | Full history support (up to 1 year+) |
| Full History Toggle | Only queries local DB | Should also trigger Binance sync for older data |
| Sync Visibility | No UI indication of sync range | Show user what date range is synced |

### Data Timeline

```text
Binance Account Trading History (hypothetical):
├── 2025-02-01: 50 trades (NOT synced - outside 7-day window)
├── 2025-06-15: 30 trades (NOT synced - outside 7-day window)  
├── 2026-01-20: 15 trades (NOT synced - outside 7-day window)
└── 2026-01-26-30: 12 trades (SYNCED - within 7-day window)

Local Database:
└── Only 12 trades from Jan 26-30, 2026
```

---

## Solution Architecture

### Phased Approach

```text
Phase A: Fix Binance Sync to Support Full History
Phase B: Connect Full History Toggle to Extended Sync
Phase C: Add Sync Status & Progress UI
```

---

## Phase A: Extended Binance Income History Fetching

### A.1 - Update `useBinanceAllIncome` Hook

**File**: `src/features/binance/useBinanceFutures.ts`

Current limitation:
```typescript
export function useBinanceAllIncome(daysBack = 7, limit = 1000) {
  const startTime = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
  // Only fetches last 7 days by default
}
```

**Problem**: Binance `/fapi/v1/income` API has a **3-month window limit** per request. To get 1 year of data, we need **chunked fetching**.

**Solution**: Create new hook `useBinanceFullIncomeHistory`:

```typescript
/**
 * Fetch complete income history with chunked requests
 * Binance limit: 3 months per request, so we chunk by quarters
 */
export function useBinanceFullIncomeHistory(options: {
  enabled?: boolean;
  monthsBack?: number; // default 12 (1 year)
  onProgress?: (progress: number) => void;
}) {
  // Implementation:
  // 1. Calculate date chunks (3-month intervals)
  // 2. Fetch each chunk sequentially (rate limit aware)
  // 3. Merge and deduplicate results
  // 4. Return combined income records
}
```

### A.2 - Create Chunked Fetch Utility

**File**: `src/features/binance/useBinanceExtendedData.ts` (modify existing)

Add function to fetch income in chunks:

```typescript
/**
 * Fetch income history in 3-month chunks to work around Binance API limits
 */
export async function fetchChunkedIncomeHistory(
  monthsBack: number = 12,
  onProgress?: (progress: number) => void
): Promise<BinanceIncome[]> {
  const chunks = [];
  const now = Date.now();
  const threeMonthsMs = 90 * 24 * 60 * 60 * 1000;
  
  // Build chunk ranges
  for (let i = 0; i < Math.ceil(monthsBack / 3); i++) {
    const endTime = now - (i * threeMonthsMs);
    const startTime = endTime - threeMonthsMs;
    chunks.push({ startTime, endTime });
  }
  
  // Fetch each chunk
  const allIncome: BinanceIncome[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const result = await callBinanceApi('income', {
      startTime: chunk.startTime,
      endTime: chunk.endTime,
      limit: 1000,
    });
    
    if (result.success && result.data) {
      allIncome.push(...result.data);
    }
    
    onProgress?.((i + 1) / chunks.length * 100);
    
    // Rate limit delay
    await new Promise(r => setTimeout(r, 200));
  }
  
  // Deduplicate by tranId
  const unique = new Map<number, BinanceIncome>();
  allIncome.forEach(r => unique.set(r.tranId, r));
  
  return Array.from(unique.values()).sort((a, b) => b.time - a.time);
}
```

---

## Phase B: Connect Full History Toggle to Extended Sync

### B.1 - Add Sync Full History Button to TradeHistory Page

**File**: `src/pages/TradeHistory.tsx`

When user toggles "Full History" ON and Binance is connected:
1. Show info: "Syncing full Binance history (up to 1 year)..."
2. Trigger chunked income fetch
3. Sync new records to database
4. Refresh trade list

```typescript
// Add state for full sync
const [isFullSyncing, setIsFullSyncing] = useState(false);
const [syncProgress, setSyncProgress] = useState(0);

// Handler for full history toggle
const handleShowFullHistoryChange = async (show: boolean) => {
  setShowFullHistory(show);
  
  // If enabling full history AND Binance connected, trigger extended sync
  if (show && isBinanceConnected && !isFullSyncing) {
    setIsFullSyncing(true);
    try {
      await syncFullBinanceHistory({
        monthsBack: 12,
        onProgress: setSyncProgress,
      });
      
      // Refresh trade entries after sync
      queryClient.invalidateQueries({ queryKey: ['trade-entries-paginated'] });
      toast.success('Full Binance history synced!');
    } catch (error) {
      toast.error('Failed to sync full history');
    } finally {
      setIsFullSyncing(false);
      setSyncProgress(0);
    }
  }
};
```

### B.2 - Create Full Sync Hook

**File**: `src/hooks/use-binance-full-sync.ts` (NEW)

```typescript
/**
 * Hook for syncing complete Binance history to local database
 */
export function useBinanceFullSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const syncFullHistory = useMutation({
    mutationFn: async (options: { 
      monthsBack?: number;
      onProgress?: (progress: number) => void;
    }) => {
      const { monthsBack = 12, onProgress } = options;
      
      // Step 1: Fetch all income from Binance (chunked)
      const allIncome = await fetchChunkedIncomeHistory(monthsBack, onProgress);
      
      // Step 2: Filter to REALIZED_PNL only
      const pnlRecords = allIncome.filter(r => 
        r.incomeType === 'REALIZED_PNL' && r.income !== 0
      );
      
      // Step 3: Check for duplicates
      const incomeIds = pnlRecords.map(r => `income_${r.tranId}`);
      const { data: existing } = await supabase
        .from('trade_entries')
        .select('binance_trade_id')
        .in('binance_trade_id', incomeIds);
      
      const existingSet = new Set(existing?.map(t => t.binance_trade_id) || []);
      const newRecords = pnlRecords.filter(r => !existingSet.has(`income_${r.tranId}`));
      
      if (newRecords.length === 0) {
        return { synced: 0, skipped: pnlRecords.length };
      }
      
      // Step 4: Insert new trades
      const entries = newRecords.map(r => incomeToTradeEntry(r, user.id));
      
      // Batch insert in chunks of 100
      let synced = 0;
      for (let i = 0; i < entries.length; i += 100) {
        const batch = entries.slice(i, i + 100);
        const { data } = await supabase.from('trade_entries').insert(batch).select();
        synced += data?.length || 0;
      }
      
      return { synced, skipped: pnlRecords.length - newRecords.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade-entries'] });
      queryClient.invalidateQueries({ queryKey: ['trade-entries-paginated'] });
    },
  });
  
  return syncFullHistory;
}
```

---

## Phase C: Enhanced Sync Status UI

### C.1 - Add Sync Progress Indicator

**File**: `src/pages/TradeHistory.tsx`

```tsx
{/* Full History Toggle with Sync Status */}
<div className="flex items-center gap-3">
  <Calendar className="h-4 w-4 text-muted-foreground" />
  
  {isFullSyncing ? (
    <div className="flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">
        Syncing Binance history... {syncProgress.toFixed(0)}%
      </span>
      <Progress value={syncProgress} className="w-24 h-2" />
    </div>
  ) : (
    <>
      <Label htmlFor="full-history" className="text-sm text-muted-foreground cursor-pointer">
        {showFullHistory ? "Showing full history" : "Last 12 months"}
      </Label>
      <Switch
        id="full-history"
        checked={showFullHistory}
        onCheckedChange={handleShowFullHistoryChange}
        disabled={isFullSyncing}
      />
      {isBinanceConnected && showFullHistory && (
        <Badge variant="outline" className="text-xs">
          Includes Binance
        </Badge>
      )}
    </>
  )}
</div>
```

### C.2 - Add First-Time Sync Prompt

When user first toggles "Full History" with Binance connected:

```tsx
<AlertDialog open={showSyncConfirm} onOpenChange={setShowSyncConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Sync Full Binance History?</AlertDialogTitle>
      <AlertDialogDescription>
        This will fetch your complete trading history from Binance (up to 1 year). 
        This may take a few minutes depending on your trading volume.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Just Local Data</AlertDialogCancel>
      <AlertDialogAction onClick={confirmFullSync}>
        <Download className="h-4 w-4 mr-2" />
        Sync from Binance
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Phase D: Update Auto-Sync Default

### D.1 - Increase Default Sync Window

**File**: `src/hooks/use-binance-auto-sync.ts`

Current:
```typescript
const {
  daysToSync = 7,  // Only 7 days
} = options;
```

Change to:
```typescript
const {
  daysToSync = 30,  // Last 30 days for auto-sync
} = options;
```

---

## Files Summary

| Phase | File | Action |
|-------|------|--------|
| A | `src/features/binance/useBinanceFutures.ts` | MODIFY - Add chunked fetch capability |
| A | `src/features/binance/useBinanceExtendedData.ts` | MODIFY - Add `fetchChunkedIncomeHistory` |
| B | `src/hooks/use-binance-full-sync.ts` | CREATE - Full history sync hook |
| B | `src/pages/TradeHistory.tsx` | MODIFY - Connect toggle to sync |
| C | `src/pages/TradeHistory.tsx` | MODIFY - Add progress UI |
| D | `src/hooks/use-binance-auto-sync.ts` | MODIFY - Increase default to 30 days |

---

## Data Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│ TradeHistory.tsx                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User toggles "Full History" ON                                 │
│                 │                                               │
│                 ▼                                               │
│  ┌────────────────────────────────────────────┐                │
│  │ Is Binance Connected?                       │                │
│  └────────────────────────────────────────────┘                │
│           │                      │                              │
│          YES                    NO                              │
│           │                      │                              │
│           ▼                      ▼                              │
│  ┌─────────────────┐   ┌─────────────────────┐                 │
│  │ Show Sync Dialog │   │ Query local DB only │                 │
│  │ "Sync from      │   │ (no startDate)      │                 │
│  │  Binance?"      │   └─────────────────────┘                 │
│  └─────────────────┘                                           │
│           │                                                     │
│    User confirms                                                │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────────────────────────┐                   │
│  │ useBinanceFullSync()                    │                   │
│  │  1. Fetch income (12 months, chunked)   │                   │
│  │  2. Deduplicate against existing        │                   │
│  │  3. Insert new trades to DB             │                   │
│  │  4. Invalidate trade-entries queries    │                   │
│  └─────────────────────────────────────────┘                   │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────────────────────────┐                   │
│  │ useTradeEntriesPaginated (no startDate) │                   │
│  │ → Now includes all synced trades        │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Binance API Considerations

### Rate Limits

The `/fapi/v1/income` endpoint has:
- Weight: 30 per request
- Account category limit: 1200/minute

For 1-year history (4 chunks):
- Total weight: 4 × 30 = 120
- With 200ms delay between chunks: Safe

### Response Size

Each chunk returns max 1000 records. For active traders:
- 1000 records/3 months × 4 = ~4000 records max
- This is manageable for client-side processing

---

## Behavior Matrix After Fix

| Scenario | Binance Status | Toggle State | Result |
|----------|---------------|--------------|--------|
| Initial load | Connected | OFF | Last 12 months from local DB |
| Initial load | Connected | ON | Prompt to sync, then all history |
| Initial load | Disconnected | ON | All local DB (no Binance) |
| Returning user | Connected | ON | All synced history (no re-fetch) |
| Manual sync | Connected | ON | "Sync Now" button available |

---

## Edge Cases Handled

1. **User has never synced**: First "Full History" toggle triggers full sync
2. **User already synced**: Deduplication prevents duplicate trades
3. **Rate limit hit**: 200ms delay between chunks, graceful error handling
4. **Binance disconnected mid-sync**: Partial data saved, can resume later
5. **Very active trader (>4000 trades/year)**: Pagination handles overflow

---

## Testing Checklist

- [ ] Toggle "Full History" with Binance connected → Shows sync dialog
- [ ] Confirm sync → Progress indicator shows, trades appear after completion
- [ ] Toggle off then on again → No re-sync (data already exists)
- [ ] Binance disconnected → "Full History" only queries local DB
- [ ] Default 30-day auto-sync captures recent trades automatically
