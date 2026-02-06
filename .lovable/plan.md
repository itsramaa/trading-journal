

# Fix Plan: AI Chatbot History Persistence, Post-Trade Integration & Top Movers Update

## Identified Issues

### Issue 1: AI Chat History Lost When Switching Tabs
**Location**: `src/components/chat/AIChatbot.tsx` lines 326-338

**Problem**: When user switches AI modes (trading → market → setup → posttrade), the chat history is cleared:

```typescript
const handleQuickAction = (prompt: string, mode?: AIMode) => {
  if (mode && mode !== aiMode) {
    setAiMode(mode);
    setMessages([]); // ❌ Clears all history
  }
  // ...
};

const handleModeChange = (mode: AIMode) => {
  setAiMode(mode);
  setMessages([]); // ❌ Clears all history
};
```

**Solution**: Store messages per-mode using a `Record<AIMode, Message[]>` structure instead of single array.

---

### Issue 2: Post-Trade Not Integrated with Full Trade System
**Location**: `supabase/functions/post-trade-chat/index.ts`

**Problem**: The edge function only fetches basic trade data, missing:
- Strategy associations
- AI analysis results
- Screenshot metadata
- Emotional state correlation

**Solution**: Enhance the edge function to fetch related data and provide richer context to AI.

---

### Issue 3: Top Movers Not Updating
**Location**: Network & Hook analysis

**Observations**:
- The `refetchInterval: 30 * 1000` is set correctly in hook
- The API returns status 200 (successful)
- The `staleTime: 30 * 1000` means data is considered "fresh" for 30s

**Likely Issue**: The `refetchInterval` only triggers refetch when the component is mounted and focused. If user switches tabs or the window loses focus, refetch pauses.

**Solution**: 
1. Set `refetchIntervalInBackground: true` to continue refetching even when tab is not active
2. Add visual "Last updated" indicator
3. Force refetch on component mount/remount

---

## Solution Architecture

### Fix 1: Per-Mode Chat History with Reset Button

**Changes to `AIChatbot.tsx`**:

```typescript
// Replace single messages state with per-mode history
const [messageHistory, setMessageHistory] = useState<Record<AIMode, Message[]>>({
  trading: [],
  market: [],
  setup: [],
  posttrade: [],
});

// Get current mode's messages
const messages = messageHistory[aiMode];

// Update messages for current mode only
const setMessages = (updater: Message[] | ((prev: Message[]) => Message[])) => {
  setMessageHistory(prev => ({
    ...prev,
    [aiMode]: typeof updater === 'function' ? updater(prev[aiMode]) : updater,
  }));
};

// Mode change no longer clears history
const handleModeChange = (mode: AIMode) => {
  setAiMode(mode);
  // History preserved - no clearing
};

// Reset button clears ALL history
const clearAllHistory = () => {
  setMessageHistory({
    trading: [],
    market: [],
    setup: [],
    posttrade: [],
  });
};
```

**UI Changes**:
- Add "Reset All" button that clears all mode histories
- Add badge showing message count per mode in tab

---

### Fix 2: Enhanced Post-Trade Integration

**Enhance `post-trade-chat/index.ts`**:

```typescript
// Fetch trade with related data
const { data: trades, error: tradesError } = await supabase
  .from('trade_entries')
  .select(`
    *,
    strategies:trade_strategy_links(
      strategy:trading_strategies(id, name, description)
    ),
    ai_analysis_result,
    screenshots,
    emotional_state
  `)
  .eq('status', 'closed')
  .order('trade_date', { ascending: false })
  .limit(20);

// Add richer context
const targetTradeContext = `
TRADE DETAILS:
- Pair: ${targetTrade.pair}
- Direction: ${targetTrade.direction}
- Entry: ${targetTrade.entry_price}
- Exit: ${targetTrade.exit_price}
- P&L: $${pnl.toFixed(2)}
- Strategy Used: ${strategyNames || 'None tagged'}
- Market Condition: ${targetTrade.market_condition}
- Emotional State: ${targetTrade.emotional_state}
- Has Screenshots: ${(targetTrade.screenshots?.length || 0) > 0 ? 'Yes' : 'No'}
- AI Analysis Available: ${targetTrade.ai_analysis_result ? 'Yes' : 'No'}
`;
```

---

### Fix 3: Force Top Movers Refresh

**Changes to `useBinanceAdvancedAnalytics.ts`**:

```typescript
export function useBinanceTopMovers(limit = 10) {
  return useQuery({
    queryKey: ['binance', 'top-movers', limit],
    queryFn: async () => {
      const tickers = await callMarketDataFunction<Ticker24h[]>('ticker-24h', {});
      // ... existing logic
    },
    staleTime: 15 * 1000, // Reduce to 15 seconds
    refetchInterval: 15 * 1000, // Reduce to 15 seconds
    refetchIntervalInBackground: true, // ✅ Continue even when tab inactive
    refetchOnMount: 'always', // ✅ Always refetch on mount
    refetchOnWindowFocus: true, // ✅ Refetch when user returns to tab
  });
}
```

**Changes to `TopMovers.tsx`**:
- Add "Last updated" timestamp display
- Add visual indicator when data is fetching

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/chat/AIChatbot.tsx` | Per-mode history, reset button, preserve history on tab switch |
| `supabase/functions/post-trade-chat/index.ts` | Fetch strategies, enhanced context |
| `src/features/binance/useBinanceAdvancedAnalytics.ts` | Add refetchIntervalInBackground, refetchOnMount |
| `src/pages/TopMovers.tsx` | Add last updated indicator |

---

## Technical Details

### Chat History Data Structure

```typescript
// Before (single array)
const [messages, setMessages] = useState<Message[]>([]);

// After (per-mode map)
const [messageHistory, setMessageHistory] = useState<Record<AIMode, Message[]>>({
  trading: [],
  market: [],
  setup: [],
  posttrade: [],
});
```

### Reset Button UI

In expanded mode, show "Reset All" button in header:

```tsx
{isExpanded && Object.values(messageHistory).some(m => m.length > 0) && (
  <Button
    variant="outline"
    size="sm"
    onClick={clearAllHistory}
    className="text-xs gap-1"
  >
    <Trash2 className="h-3 w-3" />
    Reset All
  </Button>
)}
```

### Mode Tab with Message Count Badge

```tsx
<TabsTrigger key={mode} value={mode}>
  <Icon className="h-3 w-3" />
  <span>{config.label.split(' ')[0]}</span>
  {messageHistory[mode].length > 0 && (
    <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
      {messageHistory[mode].length}
    </Badge>
  )}
</TabsTrigger>
```

### Last Updated Indicator for Top Movers

```tsx
const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useBinanceTopMovers(limit);

// In header
<span className="text-xs text-muted-foreground">
  Updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
</span>
```

---

## Behavior After Fix

| Feature | Before | After |
|---------|--------|-------|
| Mode switching | Clears all chat history | Preserves history per mode |
| Reset functionality | Clears current mode only | Reset All button clears everything |
| Post-Trade context | Basic trade data | Includes strategies, emotions, AI analysis |
| Top Movers refresh | Pauses when tab inactive | Continues in background |
| Refresh indicator | None | Shows last updated time |

---

## Console Warnings to Address

The console shows `Function components cannot be given refs` warning for:
1. `AIChatbot` → `ChatMessage`
2. `ChatMessage` → `Markdown`

**Root Cause**: React-markdown's `Markdown` component doesn't forward refs, and neither does `ChatMessage`.

**Fix**: Since we're not actually using refs on these components, this is just a warning. The scroll ref is on `ScrollArea`, not these components. No action needed for functionality, but we could wrap `ChatMessage` in `forwardRef` to silence the warning.

---

## Implementation Order

1. **AIChatbot.tsx** - Per-mode history storage (critical UX fix)
2. **useBinanceAdvancedAnalytics.ts** - Add background refresh
3. **TopMovers.tsx** - Add last updated indicator
4. **post-trade-chat/index.ts** - Enhanced trade context

