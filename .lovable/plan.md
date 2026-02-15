

# Deep-Dive Analysis: Top Movers Page

---

## 1. Page Structure (`src/pages/TopMovers.tsx`)

### A. Comprehensiveness

| Feature | Status | Notes |
|---------|--------|-------|
| Page header with icon/description | Done | PageHeader component |
| Sort by selector (%, price, volume) | Done | 3 sort modes |
| Min volume filter | Done | 4 tiers: All, 100K, 1M, 10M |
| Show 10/20 toggle | Done | Limit toggle |
| Refresh button with spinner | Done | Manual + auto-refetch (15s) |
| Last updated timestamp | Done | Local time |
| 3 summary cards (Gainer, Loser, Volume) | Done | Top #1 spotlight |
| Tabbed lists (Gainers, Losers, Volume) | Done | 3 tabs |
| Loading skeletons | Done | 10 skeleton rows |
| Empty state | Done | EmptyState component |
| Low liquidity badge | Done | Flags quoteVolume < $100K |
| Crypto icon with fallback | Done | Multi-source fallback |

**Gaps:**

1. **No tab URL persistence**: The Tabs component uses `defaultValue="gainers"` instead of controlled state via `useSearchParams`. This violates the UX Consistency Standard -- refreshing the page always resets to the Gainers tab.

2. **No detail page or click-through**: Clicking a MoverCard does nothing. There is no detail view for a specific coin (e.g., mini chart, order book depth, recent trades). This limits actionability.

3. **No ARIA region role**: The page lacks `role="region"` and `aria-label` on the main container, unlike the 11+ analytics components that already have this standardized.

### B. Accuracy

| Check | Result |
|-------|--------|
| USDT pair filtering | Correct -- `isUsdtPair()` |
| Stale pair exclusion | Correct -- `closeTime > 25h ago` |
| Top gainers sort | Correct -- desc by `priceChangePercent` |
| Top losers sort | Correct -- asc by `priceChangePercent` |
| Top volume sort | Correct -- desc by `quoteVolume` |
| Volume filter threshold | Correct -- mapped from select value |
| 15s auto-refetch | Correct -- `refetchInterval` + background |

**Bugs:**

4. **Hardcoded `$` in price change display**: Line 84 shows `${Math.abs(ticker.priceChange).toFixed(4)}` with a literal dollar sign, bypassing the currency conversion system (`format()`). Users who set a non-USD currency (e.g., IDR, EUR) will see dollar signs alongside converted values elsewhere on the page -- inconsistent.

5. **`.toFixed(4)` truncates high-value coins**: Line 84 and 99 use `.toFixed(4)` for price change. For BTC (price change of e.g., +$2,150.00), this displays `+$2150.0000` -- four unnecessary decimals. For low-cap coins (change of $0.0000001), it displays `+$0.0000` -- truncated. Should use dynamic precision or `format()`.

6. **Losers volume sort is inverted**: Line 193 sorts losers by `a.quoteVolume - b.quoteVolume` (ascending) when `sortBy === 'volume'`. This returns the LOWEST volume coins, not the highest-volume losers. The intent should be to show the biggest losers that also have the highest volume (most significant declines). Should sort descending, then filter to negative-change coins.

7. **`filteredTickers` fallback logic includes all directions**: Lines 180 and 191 use `filteredTickers` (which is ALL USDT pairs filtered by volume) as the source for both gainers and losers. When `minVolume` is not "all", `sortedGainers` correctly sorts desc and gets top positive movers. But `sortedLosers` sorts asc and gets the bottom movers from the SAME pool -- this works functionally but is fragile. If `filteredTickers` is empty (all coins below threshold), the fallback is `topGainers` for gainers and `topLosers` for losers, which don't respect the volume filter. This creates an inconsistency: the volume filter appears to work, but when it filters out ALL coins, it silently falls back to unfiltered data.

8. **Summary cards ignore volume filter**: The 3 summary cards (lines 255-328) always use `topGainers[0]`, `topLosers[0]`, `topVolume[0]` from the raw hook data, not the filtered/sorted data. If a user sets "Min Volume > $10M", the summary card might show a coin that doesn't pass the filter -- misleading.

### C. Clarity and Readability

**Missing tooltips:**

9. **"Top Gainer" summary card** -- No tooltip. Should say: "The coin with the largest percentage price increase in the last 24 hours across all USDT pairs on Binance."

10. **"Top Loser" summary card** -- No tooltip. Should say: "The coin with the largest percentage price decrease in the last 24 hours."

11. **"Highest Volume" summary card** -- No tooltip. Should say: "The coin with the highest 24-hour USDT trading volume on Binance."

12. **"Low Liq" badge** -- No tooltip explaining the threshold or why it matters. Should say: "24h trading volume below $100,000. Low liquidity means wider spreads and higher slippage risk."

13. **Sort selector** -- No label or tooltip. Should have a tooltip: "Sort coins by percentage change, absolute price change, or trading volume."

14. **Min Volume filter** -- No tooltip. Should say: "Filter out low-volume coins to focus on actively traded assets. Higher thresholds reduce noise from illiquid pairs."

15. **"Show 10/20" button** -- No tooltip clarifying this controls the list length.

16. **"USDT" badge** on each card -- No tooltip explaining why only USDT pairs are shown. Should say: "Only USDT-denominated pairs are included for consistent comparison."

17. **"Vol:" label in MoverCard subtitle** -- No tooltip. Should say: "24-hour quote volume in USDT. Higher volume indicates more active trading and better liquidity."

18. **"24h Volume" label in volume view** -- No tooltip explaining this is quote volume, not base volume.

### D. Code Quality

19. **`useCurrencyConversion()` called per MoverCard**: Each MoverCard component calls the hook independently. With 10-20 cards rendered, this creates 10-20 identical hook subscriptions. The `format` function should be passed as a prop from the parent.

20. **No `useMemo` on summary card data**: Summary cards read `topGainers[0]` etc. directly. Should be memoized or derived from filtered data.

21. **MoverCard has 3 near-identical JSX branches**: Lines 74-103 have three conditional branches (showVolume, priceChange, percentage) that share ~80% identical markup. Should be refactored into a single block with variable content.

22. **No `React.memo` on MoverCard**: Since the parent re-renders on every 15s refetch, all MoverCards re-render even if their data hasn't changed. `React.memo` with a shallow equality check on `ticker` would prevent unnecessary re-renders.

23. **`format` is unused in parent**: Line 150 destructures `format` from `useCurrencyConversion()` but it's only used inside summary cards for `topVolume[0].quoteVolume`. The parent-level hook call is fine since it's needed there, but the duplicate calls in children are wasteful.

---

## 2. Summary of Recommendations

### Priority 1 -- Bugs / Incorrect Behavior

| # | Issue | File | Fix |
|---|-------|------|-----|
| 4 | Hardcoded `$` in price change | `TopMovers.tsx:84,99` | Use `format(ticker.priceChange)` or remove `$` prefix and use `format()` |
| 5 | `.toFixed(4)` on all price changes | `TopMovers.tsx:84,99` | Use dynamic precision: `format()` for currency values |
| 6 | Losers volume sort ascending | `TopMovers.tsx:193` | Sort descending (`b - a`), then filter to negative `priceChangePercent` only |
| 7 | Empty filteredTickers fallback ignores filter | `TopMovers.tsx:180,191` | Return empty array instead of falling back to unfiltered data; let EmptyState show |
| 8 | Summary cards ignore volume filter | `TopMovers.tsx:255-328` | Derive summary from filtered/sorted data |

### Priority 2 -- Missing Tooltips (Clarity)

| # | Element | Tooltip Content |
|---|---------|-----------------|
| 9 | Top Gainer card | "Largest 24h percentage increase across all USDT pairs on Binance." |
| 10 | Top Loser card | "Largest 24h percentage decrease across all USDT pairs." |
| 11 | Highest Volume card | "Highest 24-hour USDT trading volume on Binance." |
| 12 | Low Liq badge | "Volume below $100K. Low liquidity means wider spreads and higher slippage." |
| 13 | Sort selector | "Sort coins by % change, absolute price change, or 24h volume." |
| 14 | Min Volume filter | "Filter out low-volume coins. Higher thresholds focus on actively traded assets." |
| 15 | Show 10/20 button | "Toggle between showing top 10 or top 20 results." |
| 16 | USDT badge | "Only USDT-denominated trading pairs are shown for consistent comparison." |
| 17 | Vol: label | "24-hour trading volume denominated in USDT." |
| 18 | 24h Volume label | "Total quote (USDT) volume traded in the last 24 hours." |

### Priority 3 -- Comprehensiveness Gaps

| # | Gap | Fix |
|---|-----|-----|
| 1 | No tab URL persistence | Replace `defaultValue` with controlled `useSearchParams` state |
| 3 | No ARIA region | Add `role="region"` and `aria-label="Top Movers"` to root container |

### Priority 4 -- Code Quality

| # | Issue | Fix |
|---|-------|-----|
| 19 | `useCurrencyConversion()` per MoverCard | Pass `format` as prop from parent |
| 21 | 3 near-identical JSX branches in MoverCard | Refactor to single block with conditional values |
| 22 | No `React.memo` on MoverCard | Wrap with `React.memo` for 15s refetch optimization |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/TopMovers.tsx` | Fix hardcoded `$` (P1), fix `.toFixed(4)` precision (P1), fix losers volume sort (P1), fix filteredTickers fallback (P1), derive summary from filtered data (P1), add all tooltips (P2), add `useSearchParams` for tabs (P3), add ARIA role (P3), pass `format` as prop (P4), refactor MoverCard branches (P4), add `React.memo` (P4) |

