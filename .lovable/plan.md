
# Fix: AI Insights Data Gating and Accuracy

## Problems Found

### 1. "Market regime is currently loading" leaks into AI narrative
- `useUnifiedMarketScore` returns `scoreLabel: 'Loading...'` when context is null (line 78 of `use-unified-market-score.ts`)
- The edge function injects this directly: `The current market regime is: Loading...` (line 106 of edge function)
- The AI then narrates around a loading state as if it were a real regime
- **Fix**: Don't send market label to AI until it's ready. If still loading, omit market context entirely from the prompt.

### 2. Strategy win rates are always 0%
- In `AIInsightsWidget.tsx` lines 158-163, strategies are mapped with hardcoded `trades: 0, winRate: 0`
- The actual per-strategy performance from trade history is never calculated
- The AI sees every strategy at 0% win rate and recommends "review your strategy" every time
- **Fix**: Calculate actual per-strategy win rate from `trades` data using `trade_entry_strategies` relation, or omit strategy section if no per-strategy stats are available.

### 3. Capital deployment needs formal categories
- The edge function (lines 91-98) already defines `accountSizeCategory` thresholds -- this is good
- But `deploymentPercent` (line 121-123) has no equivalent category mapping
- The AI gets a raw percentage and invents its own phrasing ("small portion")
- **Fix**: Add a `deploymentCategory` mapping (`none`, `light`, `moderate`, `heavy`) and inject the category label instead of (or alongside) the raw percentage.

---

## File Changes

### 1. `src/components/dashboard/AIInsightsWidget.tsx`

**a) Gate market label before sending to AI (around line 168)**
- Before calling `getInsights()`, check if `marketLoading` is true
- If loading, pass `marketScoreLabel: 'Unavailable'` instead of `'Loading...'`
- Also add `positionsReady` to the `useEffect` dependency array (currently missing, causing stale closure)

**b) Calculate per-strategy win rates (lines 158-163)**
- Replace hardcoded `trades: 0, winRate: 0` with actual calculation
- Group closed trades by their strategy tags (using `trade_entry_strategies` if available, or strategy name match)
- If no strategy-trade linkage data exists, send `trades: 0` so the AI knows there's no data (rather than implying 0% win rate)

**c) Add deployment category (in `portfolioData` memo)**
- Map `deploymentPercent` to a category: `none` (0%), `light` (<10%), `moderate` (10-40%), `heavy` (>40%)
- Pass this category to the edge function

### 2. `supabase/functions/dashboard-insights/index.ts`

**a) Handle market label gracefully (line 106)**
- If `marketScoreLabel` is `'Unavailable'` or `'Loading...'` or `'Unknown'`:
  - Omit market regime from the system prompt entirely
  - Remove the "authoritative" instruction
  - Add: "Market regime data is not available. Do not mention market conditions."

**b) Add deployment category to prompt (line 133)**
- Accept `deploymentCategory` from body
- Replace raw `deploymentPercent` display with the category label
- Example: `Capital deployment: moderate (deploying 10-40% of capital)`

**c) Fix strategy prompt to avoid misleading 0% (lines 147-150)**
- If a strategy has `trades: 0`, display as `No trade data` instead of `0 trades, 0.0% win rate`
- This prevents the AI from saying "your strategy has 0% win rate" when there's simply no data

### 3. `src/features/ai/useDashboardInsights.ts`

**a) Accept and pass `marketScoreLabel` override**
- Already passes `marketScoreLabel` from caller -- no change needed here, the gating happens in the widget

---

## Technical Details

```text
Market Label Gating:
  marketLoading=true  --> marketScoreLabel="Unavailable"
  marketLoading=false --> marketScoreLabel=scoreLabel (actual value)

Deployment Categories:
  0%        --> "none"
  >0 - <10% --> "light"  
  10 - 40%  --> "moderate"
  >40%      --> "heavy"

Strategy Display in Prompt:
  trades=0  --> "- StrategyName: No trade data"
  trades>0  --> "- StrategyName: 15 trades, 60.0% win rate"
```

## Summary

| Issue | Root Cause | Fix Location |
|-------|-----------|--------------|
| "Market regime loading" in AI text | `scoreLabel` defaults to `'Loading...'` and is injected raw | Widget + Edge Function |
| Strategy always "0% win rate" | Hardcoded `trades: 0, winRate: 0` | Widget (calculate real stats) |
| Subjective capital deployment | Raw % sent, AI invents phrasing | Widget + Edge Function (use categories) |
| Auto-fire before data ready | `positionsReady` missing from useEffect deps | Widget |
