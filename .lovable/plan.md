

# Deep-Dive Analysis: Risk Calculator Page

---

## 1. Page Structure (`PositionCalculator.tsx`)

### A. Comprehensiveness

| Feature | Status |
|---------|--------|
| PageHeader with icon/description | Done |
| URL-driven tab state (calculator/volatility) | Done |
| Symbol selector via MarketContext | Done |
| MarketScoreWidget (compact) | Done |
| ContextWarnings (events, volatility, correlation) | Done |
| CalculatorInputs (6 fields with tooltips) | Done |
| CalculatorResults (4 metrics with tooltips) | Done |
| Commission rate display (Binance Phase 2) | Done |
| Max leverage bracket info | Done |
| QuickReferenceR (1R/2R/3R badges with tooltips) | Done |
| RiskAdjustmentBreakdown (context-aware multipliers) | Done |
| VolatilityStopLoss tab (ATR-based suggestions) | Done |
| Loading skeleton | Done |
| Balance auto-sync (Binance or Paper) | Done |
| Risk profile auto-sync | Done |
| Analytics tracking (debounced) | Done |

**Gaps:**

1. **No `role="region"` on root container** -- inconsistent with ARIA standard applied to 11+ other pages.

2. **Hardcoded `$` in Max Leverage info** (line 254): `~${Math.round(estimatedNotional).toLocaleString()} notional` bypasses the global currency conversion utility.

3. **No `ErrorBoundary` wrapping the page content**: Other complex pages (TradingJournal, MarketInsight) wrap their content in an ErrorBoundary with retry. This page only has ErrorBoundary on the MarketScoreWidget child, but not on the page itself. If `useRiskProfile` or `useBestAvailableBalance` throws, the page crashes entirely.

### B. Accuracy

| Check | Result |
|-------|--------|
| `calculatePositionSize` formula: riskAmount / stopDistance | Correct |
| Stop distance: abs(entry - stopLoss) / entry * 100 | Correct |
| Position value: positionSize * entryPrice | Correct |
| Capital deployment: positionValue / (balance * leverage) * 100 | Correct |
| Potential outcomes: 1R/2R/3R multiples of riskAmount | Correct |
| Commission estimate: positionValue * commissionRate | Correct |
| Max leverage: bracket lookup by estimated notional | Correct |
| Estimated notional formula (line 63) | Correct -- derived from risk amount / stop% * entry |
| Balance fallback: combined > 0 ? combined : 10000 | Correct |
| Risk profile sync via useEffect | Correct |

4. **Leverage is NOT clamped to `maxAllowedLeverage`**: The slider allows up to `LEVERAGE_SLIDER_CONFIG.MAX` (20x) regardless of the bracket limit. If `maxAllowedLeverage` is 10x for a large notional, the user can still set 20x without any warning. The `maxAllowedLeverage` info is displayed but not enforced.

### C. Clarity -- Missing Tooltips

5. **"Trading Pair" label** (line 148) -- No tooltip. Should say: "Select the asset pair for position sizing. Changes are synchronized with the Market Data page."

6. **"Position Size Calculator" tab trigger** -- No tooltip. Should say: "Calculate how many units to trade based on your account size, risk percent, and stop loss distance."

7. **"Volatility-Based Stop Loss" tab trigger** -- No tooltip. Should say: "ATR-based stop loss suggestions that adapt to current market volatility for the selected pair."

8. **"Commission Rates" section header** (line 221) -- No tooltip. Should say: "Real-time fee rates from Binance. Maker fees apply to limit orders, taker fees to market orders."

9. **"Max Leverage" badge** (line 253) -- No tooltip. Should say: "Maximum leverage allowed by the exchange for the estimated position notional value. Based on Binance tier brackets."

10. **"Calculation Results" header** (CalculatorResults.tsx line 28) -- No tooltip. Should say: "Derived from your inputs above. Position size ensures your stop loss equals your risk amount."

11. **"% of capital" sub-label** (CalculatorResults.tsx line 49) -- No tooltip. Should say: "Percentage of your total account balance deployed in this position. Keep below 40% for safety."

12. **"stop distance" sub-label** (CalculatorResults.tsx line 66) -- No tooltip. Should say: "Price distance between entry and stop loss as a percentage. Wider stops require smaller position sizes."

---

## 2. ContextWarnings

### A. Comprehensiveness & Accuracy

| Feature | Status |
|---------|--------|
| High-impact event detection (today) | Done |
| Volatility level warnings (low/high/extreme) | Done |
| Correlated open position detection | Done |
| All-clear state with green check | Done |
| Loading state | Done |
| Centralized correlation utils | Done |
| Semantic warning colors | Done |
| Quick volatility stats footer | Done |

**No accuracy issues found.**

### C. Clarity -- Missing Tooltips

13. **"Context Warnings" card title** -- No tooltip. Should say: "Real-time market conditions that affect position sizing: upcoming events, volatility level, and correlated open positions."

14. **"14-day ATR" footer stat** -- No tooltip. Should say: "Average True Range over 14 days, expressed as a percentage of price. Measures typical daily price movement."

15. **"Annual Vol" footer stat** -- No tooltip. Should say: "Annualized volatility extrapolated from daily returns. Higher values indicate greater expected price swings over a year."

16. **"All Clear" state** -- No tooltip. Should say: "No high-impact events, no elevated volatility, and no correlated open positions detected for this pair."

---

## 3. VolatilityStopLoss

### A. Comprehensiveness

| Feature | Status |
|---------|--------|
| ATR-based stop loss suggestions (4 tiers) | Done |
| Direction-aware calculation | Done |
| Volatility stats grid (4 metrics) | Done |
| Risk level badge with semantic icon | Done |
| Recommendation message | Done |
| Apply button to transfer SL to calculator | Done |
| Loading skeleton | Done |
| Empty state when data unavailable | Done |
| Volatility adjustment info | Done |
| Centralized ATR config | Done |

### B. Accuracy

| Check | Result |
|-------|--------|
| SL price for long: entry * (1 - percent/100) | Correct |
| SL price for short: entry * (1 + percent/100) | Correct |
| ATR multiplier tiers from centralized config | Correct |
| Adjusted risk display | Correct |

17. **Hardcoded `$` in ATR Value display** (line 161): `${volatility.atr.toFixed(2)}` bypasses global currency conversion. ATR is a price-denominated value.

18. **Hardcoded `$` in stop loss suggestion prices** (line 204): `${suggestion.price.toFixed(2)}` bypasses currency formatting. For low-cap assets, `.toFixed(2)` may also show `0.00`.

19. **Stop loss price uses `.toFixed(2)`** (line 204): Same precision issue as AllPositionsTable -- low-cap assets (e.g., PEPEUSDT) will display as `$0.00`. Should use dynamic precision or `.toFixed(4)`.

### C. Clarity -- Missing Tooltips

20. **"Volatility-Based Stop Loss" card title** -- No tooltip. Should say: "ATR-derived stop loss levels that respect current market volatility. Wider stops in volatile markets, tighter in calm markets."

21. **"Daily Volatility" stat** -- No tooltip. Should say: "Standard deviation of daily returns. A 2% daily volatility means the price typically moves +/-2% per day."

22. **"ATR (14d)" stat** -- No tooltip. Should say: "Average True Range over 14 periods, as a percentage of price. Captures typical price range including gaps."

23. **"Annualized" stat** -- No tooltip. Should say: "Daily volatility scaled to annual using sqrt(365). Comparable to traditional finance volatility metrics."

24. **"ATR Value" stat** -- No tooltip. Should say: "Absolute ATR value in the quote currency. Represents the average daily price range in dollar terms."

25. **Stop loss tier labels** ("Tight", "Standard", "Recommended", "Wide") -- No tooltips explaining the ATR multiplier for each. Should say, e.g.: "Tight: 0.75x ATR. Aggressive stop with higher chance of being hit. Standard: 1.0x ATR. Wide: 2.0x ATR. More room for price fluctuation."

26. **"Best" badge on recommended tier** -- No tooltip. Should say: "Recommended based on your risk profile and current volatility conditions."

27. **Apply button (ArrowRight)** -- No tooltip. Should say: "Apply this stop loss price to the Position Size Calculator tab."

---

## 4. RiskAdjustmentBreakdown

### A. Comprehensiveness

| Feature | Status |
|---------|--------|
| Base risk display (from profile) | Done |
| 5 adjustment factors with multipliers | Done |
| Level-based styling (positive/warning/danger/neutral) | Done |
| Calculation formula visualization | Done |
| Final adjusted risk with prominent display | Done |
| Recommendation badge | Done |
| Visual progress bar (0-5% scale) | Done |
| Loading state | Done |
| InfoTooltip on card title | Done |

### B. Accuracy

All calculation logic is delegated to `useContextAwareRisk` hook -- the component is purely presentational. Display logic is correct.

### C. Clarity -- Missing Tooltips

28. **"Base Risk (from profile)" label** -- No tooltip. Should say: "Your configured risk per trade from Risk Profile Settings. This is the starting point before market adjustments."

29. **Individual factor multiplier values** (e.g., "x0.85") -- No tooltip on the multiplier number. Should say: "Multiplier applied to base risk. Values below 1.0 reduce risk, above 1.0 increase it."

30. **"Adjusted Risk Per Trade" final label** -- No tooltip. Should say: "Final risk percentage after all market condition adjustments are applied. Use this value for your next position sizing."

31. **"Recommendation" label** -- No tooltip. Should say: "Action guidance based on the total adjustment. E.g., 'Proceed with caution' when multiplier is 0.5-0.7, 'Avoid trading' below 0.5."

32. **Visual progress bar** -- No tooltip explaining the 0-5% scale. Should say: "Visual comparison: the bar shows adjusted risk relative to a 5% maximum. The vertical line marks your base risk."

---

## 5. CalculatorInputs & CalculatorResults

### A. Comprehensiveness & Clarity

These two components are well-implemented with 10 existing tooltips covering all input fields and result metrics. No structural gaps found.

### B. Code Quality Notes

33. **Account Balance label shows hardcoded `($)`**: The label says "Account Balance ($)" regardless of user's currency setting. Should use dynamic currency symbol or remove.

34. **Entry Price and Stop Loss labels also show hardcoded `($)`**: Same issue on lines 104 and 123 of CalculatorInputs.tsx.

---

## 6. Page-Level Code Quality

35. **No `role="region"` on root container**: Add `role="region" aria-label="Risk Calculator"` for ARIA compliance.

36. **No top-level ErrorBoundary**: The page should wrap its content (below the loading check) in an ErrorBoundary with a retryKey pattern, consistent with MarketInsight and TradingJournal pages.

37. **`estimatedNotional` calculation at component body level** (line 63): This is a derived value that depends on state. It's recalculated every render without memoization. While not a performance issue (cheap math), wrapping it in `useMemo` would be consistent with `result` and `estimatedFees`.

38. **`formatCurrency` import** (line 26) is from `@/lib/formatters` but the rest of the page uses `useCurrencyConversion` (via CalculatorResults). This inconsistency means commission fees are formatted without the user's currency preference. Should use `format()` from `useCurrencyConversion` or at least be consistent.

---

## 7. Summary of Recommendations

### Priority 1 -- Bugs & Accuracy

| # | Issue | File | Fix |
|---|-------|------|-----|
| 4 | Leverage not clamped to `maxAllowedLeverage` | PositionCalculator.tsx | Add warning when `leverage > maxAllowedLeverage`, or clamp slider max dynamically |
| 17 | Hardcoded `$` in ATR Value | VolatilityStopLoss.tsx | Use `useCurrencyConversion` format |
| 18-19 | Hardcoded `$` + `.toFixed(2)` in SL prices | VolatilityStopLoss.tsx | Use currency formatter + dynamic precision |
| 2 | Hardcoded `$` in Max Leverage notional | PositionCalculator.tsx | Use currency formatter |
| 38 | `formatCurrency` inconsistent with `useCurrencyConversion` | PositionCalculator.tsx | Unify to `useCurrencyConversion` |

### Priority 2 -- Missing Tooltips (Clarity)

| # | Elements | Component |
|---|----------|-----------|
| 5-9 | Trading Pair, tab triggers, Commission header, Max Leverage | PositionCalculator.tsx |
| 10-12 | Calculation Results header, % of capital, stop distance | CalculatorResults.tsx |
| 13-16 | Context Warnings title, ATR/Vol stats, All Clear state | ContextWarnings.tsx |
| 20-27 | Vol Stop Loss title, 4 stats, tier labels, Best badge, Apply button | VolatilityStopLoss.tsx |
| 28-32 | Base Risk, multipliers, Adjusted Risk, Recommendation, progress bar | RiskAdjustmentBreakdown.tsx |

### Priority 3 -- Code Quality & Accessibility

| # | Issue | Fix |
|---|-------|-----|
| 1, 35 | Missing `role="region"` | PositionCalculator.tsx |
| 3, 36 | No top-level ErrorBoundary | PositionCalculator.tsx |
| 33-34 | Hardcoded `($)` in input labels | CalculatorInputs.tsx |
| 37 | `estimatedNotional` not memoized | PositionCalculator.tsx (minor) |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/PositionCalculator.tsx` | Add `role="region"` (P3), wrap content in ErrorBoundary (P3), replace hardcoded `$` in max leverage with currency formatter (P1), add leverage clamping warning (P1), unify currency formatting to `useCurrencyConversion` (P1), add tooltips to Trading Pair, tab triggers, Commission header, Max Leverage badge (P2) |
| `src/components/risk/calculator/CalculatorResults.tsx` | Add tooltips to "Calculation Results" header, "% of capital", and "stop distance" sub-labels (P2) |
| `src/components/risk/calculator/CalculatorInputs.tsx` | Replace hardcoded `($)` in label text with dynamic currency symbol or remove (P3) |
| `src/components/risk/calculator/ContextWarnings.tsx` | Add tooltips to card title, ATR/Vol footer stats, and All Clear state (P2) |
| `src/components/risk/calculator/VolatilityStopLoss.tsx` | Replace hardcoded `$` and `.toFixed(2)` with currency formatter + dynamic precision (P1), add tooltips to all 4 stats, tier labels, Best badge, and Apply button (P2) |
| `src/components/risk/calculator/RiskAdjustmentBreakdown.tsx` | Add tooltips to Base Risk, multiplier values, Adjusted Risk label, Recommendation label, and progress bar scale (P2) |
