

# Deep-Dive Analysis: Flow & Liquidity Page

---

## 1. Page Structure (`MarketData.tsx`)

### A. Comprehensiveness

| Feature | Status | Notes |
|---------|--------|-------|
| Page header with icon/description | Done | PageHeader + Refresh button |
| ARIA region role | Done | `role="region" aria-label` present |
| Funding & OI Dashboard | Done | Top section, derivatives data |
| Volatility Meter Widget | Done | Per-symbol annualized vol + percentiles |
| Volume Anomaly Detector | Done | Collapsible items with method transparency |
| Portfolio Impact Calculator | Done | What-if scenario slider with correlations |
| Data quality/last updated footer | Done | Quality % + timestamp + sources |
| Refresh with spinner | Done | Disabled while loading |
| Error normalization | Done | `normalizeError()` utility |
| Symbol context integration | Done | MarketContext + dynamic watchlist |

**Gaps:**

1. **PortfolioImpactCard returns `null` when no positions**: Line 64-66 returns `null` if loading or no positions, violating the layout stability UX standard. Should show an empty-state card instead ("Open positions to see impact analysis").

2. **`setSelectedSymbol` is destructured but never used**: Line 23 destructures `setSelectedSymbol` from `useMarketContext()` but it is never referenced anywhere on the page -- dead code.

3. **No tooltip on "Data quality" footer**: The footer shows `Data quality: X%` but no tooltip explains what this percentage means or how it is calculated.

---

## 2. FundingOIDashboard

### A. Comprehensiveness

| Feature | Status |
|---------|--------|
| Loading skeleton | Done |
| Empty state | Done |
| Divergence alerts (bullish/bearish) | Done |
| Per-symbol funding rate | Done |
| OI 24h change | Done |
| Trend icons (>5%, <-5%) | Done |
| Error boundary wrapper | Done |
| Semantic colors (text-profit/loss) | Done |

### B. Accuracy

| Check | Result |
|-------|--------|
| Funding rate sign display | Correct -- conditional `+` prefix |
| Funding rate precision `.toFixed(4)` | Correct for funding rates (typically 0.01%) |
| OI change precision `.toFixed(2)` | Correct |
| Divergence color mapping | Correct -- bullish=profit, bearish=loss |
| Combined data join (funding + OI + divergence) | Correct -- matched by `symbol` |

### C. Clarity -- Missing Tooltips

4. **"Funding & OI" card title** -- No tooltip. Should say: "Real-time derivatives data showing funding rates, open interest changes, and funding/price divergence alerts for watchlist symbols."

5. **"Derivatives" badge** -- No tooltip. Should say: "Data sourced from Binance Futures perpetual contracts."

6. **"Funding:" label** -- No tooltip. Should say: "The periodic fee paid between longs and shorts. Positive = longs pay shorts (bullish crowding). Negative = shorts pay longs (bearish crowding)."

7. **"P{percentile}" badge** -- No tooltip. Should say: "Current funding rate percentile over the last 90 days. P90+ indicates extreme crowding."

8. **"OI 24h:" label** -- No tooltip. Should say: "24-hour change in open interest (total outstanding derivative contracts). Rising OI with rising price = new money entering; falling OI = positions closing."

9. **Divergence alert description** -- No tooltip on "Funding/Price Divergence" label. Should say: "When funding rate direction contradicts price direction, it signals potential mean-reversion. Bullish divergence = negative funding while price rises. Bearish = positive funding while price falls."

10. **Trend icons (TrendingUp/Down/Activity)** -- No tooltip. The >5%/<-5% OI threshold that triggers these icons is invisible to users.

### D. Code Quality

11. **No `React.memo` or memoization on `combinedData`**: `combinedData` is recomputed on every render. Should use `useMemo` since it depends only on `fundingRates`, `oiChanges`, and `divergences`.

---

## 3. VolatilityMeterWidget

### A. Comprehensiveness

| Feature | Status |
|---------|--------|
| Loading skeleton | Done |
| Error state | Done |
| Error boundary with retry | Done |
| Market average with bar | Done |
| Per-symbol volatility | Done |
| Volatility level badges | Done |
| Percentile badges (180d) | Done |
| ATR fallback when no percentile | Done |
| Legend with icons | Done |
| CryptoIcon with fallback | Done |

### B. Accuracy

| Check | Result |
|-------|--------|
| Average volatility calculation | Correct -- simple mean of annualized values |
| Market condition thresholds | Correct -- from centralized config |
| Percentile guard (min 7 data points) | Correct |
| Bar percentage capped at 100% | Correct |
| Level classification thresholds | Correct -- <30, <60, <100, >=100 |

### C. Clarity -- Missing Tooltips

12. **"Volatility Meter" card title** -- No tooltip. Should say: "Annualized volatility calculated from recent price returns. Higher values indicate larger expected price swings."

13. **"Market Average" label** -- No tooltip. Should say: "Simple average of annualized volatility across all watchlist symbols."

14. **"{X} Market" badge** (Calm/Normal/Volatile/Extreme) -- No tooltip. Should explain each regime: "Calm (<30%): Low activity, range-bound. Normal (30-60%): Standard conditions. Volatile (60-100%): Elevated risk, wider stops needed. Extreme (>100%): Crisis-level, reduce exposure."

15. **Volatility level badge** (low/medium/high/extreme) per symbol -- No tooltip. Should say: "Volatility regime for this specific asset based on its annualized return volatility."

16. **"P{percentile}" percentile badge** -- No tooltip. Should say: "Current volatility percentile over the past 180 days. P90+ means volatility is higher than 90% of the last 6 months -- historically elevated."

17. **"Top X% (180d)" sub-label** -- No tooltip. Should say: "This asset's current volatility ranks in the top X% of the last 180 days of observations."

18. **"ATR: X%" fallback sub-label** -- No tooltip. Should say: "Average True Range as a percentage of price. Measures average bar-to-bar price movement."

19. **Legend items** -- No tooltips on the icon+range labels.

### D. Code Quality

20. **Hardcoded color classes in `MARKET_CONDITIONS`**: `text-blue-500`, `text-warning`, `text-destructive` -- these bypass the semantic token system. Should use semantic tokens (e.g., `text-profit` for calm isn't right either, but at minimum `text-chart-*` tokens for consistency).

21. **`badgeVariant` cast `as any`**: Line 162 casts `getVolatilityBadgeVariant()` result as `any` to satisfy Badge props. Should type correctly.

---

## 4. WhaleTrackingWidget (Volume Anomaly Detector)

### A. Comprehensiveness

| Feature | Status |
|---------|--------|
| Loading skeleton | Done |
| Error state with retry | Done |
| Error boundary wrapper | Done |
| Empty state | Done |
| Collapsible items with details | Done |
| Signal labels (HIGH VOL BULLISH/BEARISH) | Done |
| Volume change % display | Done |
| Percentile rank / confidence | Done |
| Method transparency (collapsible) | Done |
| Threshold transparency (collapsible) | Done |
| Badge for additional symbol | Done |

### B. Accuracy

| Check | Result |
|-------|--------|
| Volume change sign handling | Correct -- conditional `+` prefix |
| Percentile vs confidence fallback | Correct -- `percentileRank ?? confidence` |
| Signal color mapping | Correct -- ACCUMULATION=profit, DISTRIBUTION=loss |
| Data slice limit | Correct -- `DISPLAY_LIMITS.WHALE_ACTIVITY` (6) |

### C. Clarity -- Missing Tooltips

22. **"Volume Anomaly Detector" card title** -- No tooltip. Should say: "Detects statistically significant volume spikes exceeding the 95th percentile of a rolling 30-day window. Not wallet-level tracking."

23. **"Top 5" / "+{symbol}" badge** -- No tooltip. Should say: "Monitoring the top 5 watchlist symbols. Additional symbols from your selected asset are included when applicable."

24. **"HIGH VOL BULLISH" / "HIGH VOL BEARISH" signal badge** -- No tooltip. Should say: "HIGH VOL BULLISH: Volume spike with positive price action, suggesting aggressive buying. HIGH VOL BEARISH: Volume spike with negative price action, suggesting aggressive selling."

25. **Volume change percentage** -- No tooltip. Should say: "24-hour volume change compared to the rolling 30-day average volume."

26. **"P{rank}" / "conf." label** -- No tooltip. Should say: "P{rank}: Volume percentile rank in the 30-day distribution. Higher = more unusual. Conf: Statistical confidence of the anomaly detection."

27. **"Method:" / "Threshold:" in collapsible** -- No tooltip explaining why these are shown. Should have a small header: "Detection methodology transparency."

### D. Code Quality

28. **Signal dot has no accessible label**: The colored dot (line 110-113) has no `aria-label` or `title` for screen readers.

---

## 5. PortfolioImpactCard

### A. Comprehensiveness

| Feature | Status |
|---------|--------|
| BTC scenario slider (-20% to +20%) | Done |
| Total portfolio impact (absolute + %) | Done |
| Affected positions list (top 5) | Done |
| Correlation display per position | Done |
| Direct vs correlated badge | Done |
| Currency conversion via `format()` | Done |
| InfoTooltip on card title | Done |
| ARIA region role | Done |

### B. Accuracy

| Check | Result |
|-------|--------|
| Correlation lookup (bidirectional) | Correct -- `getCorrelation()` handles both directions |
| SHORT position sign inversion | Correct -- `* (pos.side === 'SHORT' ? -1 : 1)` |
| Portfolio % impact calculation | Correct -- `totalImpact / totalNotional * 100` |
| Zero-notional guard | Correct -- `totalNotional > 0` check |
| Impact sort by absolute value | Correct -- `Math.abs(b) - Math.abs(a)` |

**Bug:**

29. **Static correlation coefficients**: The `CRYPTO_CORRELATIONS` map uses hardcoded values (e.g., BTC-ETH = 0.82). These never update. During market regime shifts, real correlations can diverge significantly (crypto correlations go to 1.0 in crashes). The impact calculator may underestimate risk during high-stress periods. This is a known limitation but should be disclosed to users.

### C. Clarity -- Missing Tooltips

30. **"BTC Move Scenario" label** -- No tooltip. Should say: "Hypothetical BTC price change to simulate. The impact on your portfolio is estimated using cross-asset correlations."

31. **"Total exposure" label** -- No tooltip. Should say: "Sum of absolute notional values of all open positions."

32. **"Portfolio Impact" result label** -- No tooltip. Should say: "Estimated P&L change across all open positions if BTC moves by the selected percentage."

33. **"direct" badge** -- No tooltip. Should say: "This is a BTC position -- impact is calculated directly from the scenario move, not via correlation."

34. **"corr X.XX" label** -- No tooltip. Should say: "Historical correlation coefficient with BTC. 1.0 = moves identically, 0.5 = moves ~50% as much, 0 = independent."

35. **Slider range labels (-20%, 0%, +20%)** -- No tooltip explaining the range choice.

36. **"Affected Positions" header** -- No tooltip. Should say: "Top 5 positions most impacted by the scenario, sorted by absolute impact size. Positions with zero BTC correlation are excluded."

37. **Static correlation disclaimer missing**: No visible note that correlations are static estimates. Should add a small disclaimer: "Correlations are static historical estimates and may differ during extreme market conditions."

---

## 6. Summary of Recommendations

### Priority 1 -- Bugs / Incorrect Behavior

| # | Issue | Fix |
|---|-------|-----|
| 1 | PortfolioImpactCard returns `null` (layout shift) | Show empty-state card instead |
| 2 | `setSelectedSymbol` dead code | Remove unused destructure |
| 29 | Static correlations not disclosed | Add disclaimer tooltip |

### Priority 2 -- Missing Tooltips (Clarity)

| # | Element | Component |
|---|---------|-----------|
| 3 | "Data quality: X%" footer | MarketData.tsx |
| 4-10 | Funding & OI labels | FundingOIDashboard.tsx |
| 12-19 | Volatility Meter labels | VolatilityMeterWidget.tsx |
| 22-27 | Volume Anomaly labels | WhaleTrackingWidget.tsx |
| 30-37 | Portfolio Impact labels | PortfolioImpactCard.tsx |

### Priority 3 -- Code Quality

| # | Issue | Fix |
|---|-------|-----|
| 11 | No `useMemo` on `combinedData` in FundingOIDashboard | Wrap in `useMemo` |
| 20 | Hardcoded color classes in volatility config | Note: low-priority, config-level concern |
| 21 | `badgeVariant` cast `as any` | Type correctly or use `satisfies` |
| 28 | Signal dot missing accessible label | Add `aria-label` |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/MarketData.tsx` | Remove dead `setSelectedSymbol` (P1), add "Data quality" tooltip (P2) |
| `src/components/market/FundingOIDashboard.tsx` | Add 7 tooltips (P2), add `useMemo` on `combinedData` (P3), add tooltips for trend icons (P2) |
| `src/components/market/VolatilityMeterWidget.tsx` | Add 8 tooltips (P2), fix `as any` cast (P3) |
| `src/components/market/WhaleTrackingWidget.tsx` | Add 6 tooltips (P2), add `aria-label` on signal dot (P3) |
| `src/components/market/PortfolioImpactCard.tsx` | Replace `null` return with empty-state card (P1), add 8 tooltips (P2), add static correlation disclaimer (P1) |

