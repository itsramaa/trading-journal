

# Import & Sync Page: Deep UX Analysis & Fixes

## Issues Found

### 1. Paper Mode Blocks Entire Binance Tab — Inconsistent with Mode-as-Context Principle

Currently, when in Paper Mode, the entire Binance tab shows an `EmptyState` saying "Switch to Live mode." This violates the principle that **mode is context, not feature type**. The layout should be identical; only data/business rules differ.

**Fix**: In Paper Mode, the Binance tab should still render the same layout structure but with contextual restrictions:
- Show the Full Sync panel and Quick Actions in a **read-only / disabled state** with a subtle banner: "Binance sync is available in Live mode"
- This keeps the UX consistent — users see the same page structure regardless of mode, and understand what's available when they switch

**However**, this is a deliberate architectural decision per `mode-based-visibility-rules` memory: Binance-specific features (Full Sync, Fee/Funding) are hidden in Paper mode. The current `EmptyState` approach is functionally correct but **visually jarring** — it's a full empty card instead of a disabled preview.

**Compromise Fix**: Replace the large `EmptyState` card with a compact inline `Alert` banner at the top of the Binance tab, then show the UI components in a disabled/greyed-out state below it. This way users can still see the feature structure.

### 2. Solana Tab Has No Mode Awareness

The Solana Import tab works identically in both Paper and Live mode with no distinction. Imported Solana trades are always saved with `trade_mode: 'live'` (hardcoded in `use-solana-trade-import.ts` → `mapToTradeEntry`). This means:
- In Paper Mode, importing Solana trades creates **Live mode entries**, which won't be visible in Paper mode
- No warning or indication to the user

**Fix**: 
- In `mapToTradeEntry`, use the current `tradeMode` from context instead of hardcoding `'live'`
- Pass `tradeMode` into the hook or read it inside
- Show a small badge/indicator in the Solana tab indicating which mode trades will be imported into

### 3. Feature Highlight Cards Are Static and Mode-Unaware

The three feature highlight cards (Auto Incremental Sync, Duplicate Protection, Multi-Source Support) are always visible regardless of mode. "Auto Incremental Sync" is a Binance-only feature that doesn't apply in Paper mode.

**Fix**: Make the highlight cards contextually relevant:
- In Paper Mode, replace "Auto Incremental Sync" with "Manual Entry" or show it greyed out
- Or simply hide the highlights in Paper Mode since they're primarily about exchange sync

**Simpler Fix**: Keep all three cards but add a subtle opacity reduction + "(Live only)" suffix on exchange-specific cards when in Paper mode.

### 4. `defaultTab` Logic Creates Confusing UX

```typescript
const defaultTab = isPaperMode ? "solana" : "binance";
```

This auto-switches the default tab based on mode. While logical, it's **uncontrolled** — `Tabs` uses `defaultValue` so switching modes doesn't update the active tab (React won't re-render the default). The user could be in Live mode viewing Solana, switch to Paper, and still see Solana with no change.

**Fix**: Use controlled `Tabs` with `value` + `onValueChange` (same pattern as TradingJournal). Store tab state in URL via `useSearchParams` so it's shareable and consistent.

### 5. Incremental Sync Button Only Shows When `lastSyncTime` Exists

```typescript
{lastSyncTime && !isFullSyncing && !isIncrementalSyncing && (
```

First-time users who haven't synced yet won't see the Incremental Sync button at all. They only see the Full Sync panel. This is technically correct but there should be a visible "Sync Now" button for first-time users as well.

**Fix**: When `!lastSyncTime`, show a primary "Start First Sync" button or label on the incremental sync button instead of hiding it entirely.

### 6. Enrichment Hooks Called Even When Binance Not Connected

Lines 52-54 call `useTradeEnrichmentBinance()` and `useTradesNeedingEnrichmentCount()` unconditionally, even when `isPaperMode` or `!isBinanceConnected`. These hooks fire queries that will either fail or return irrelevant data.

**Fix**: Guard these hooks or pass `enabled: false` when not in Live mode with active Binance connection. Since hooks can't be conditional, use the `enabled` option pattern already used elsewhere.

---

## Implementation Plan

### File: `src/pages/ImportTrades.tsx`

1. **Controlled Tabs**: Replace `defaultValue={defaultTab}` with controlled `value` + `onValueChange` using `useSearchParams`
2. **Paper Mode Binance Tab**: Replace the full `EmptyState` card with a compact `Alert` banner + disabled UI preview
3. **First Sync UX**: Show an "Initial Sync" button when `!lastSyncTime` instead of hiding the incremental sync section
4. **Feature Cards Mode Awareness**: Add "(Live only)" text and reduced opacity on exchange-specific cards in Paper mode

### File: `src/hooks/use-solana-trade-import.ts`

1. Accept `tradeMode` parameter or read from context
2. Pass `tradeMode` to `mapToTradeEntry` instead of hardcoding `'live'`
3. Update `mapToTradeEntry` to use dynamic `trade_mode`

### File: `src/components/wallet/SolanaTradeImport.tsx`

1. Show a small mode indicator badge near the import button (e.g., "Importing as Paper trades" / "Importing as Live trades")

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/pages/ImportTrades.tsx` | Controlled tabs via useSearchParams; Paper mode Binance tab shows disabled preview instead of EmptyState; first-sync UX; mode-aware feature cards |
| `src/hooks/use-solana-trade-import.ts` | Accept tradeMode param; pass to mapToTradeEntry; dynamic trade_mode field |
| `src/components/wallet/SolanaTradeImport.tsx` | Show mode indicator badge on import action |

