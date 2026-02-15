

# Deep-Dive Analysis: Market Bias Page

---

## 1. Page Structure (`MarketInsight.tsx`)

### A. Comprehensiveness

| Feature | Status | Notes |
|---------|--------|-------|
| PageHeader with icon/description | Done | TrendingUp icon, "Regime classification engine" |
| Refresh button with spinner | Done | Disabled while loading, aria-label present |
| ErrorBoundary with retry | Done | Wraps all content |
| BiasExpiryIndicator | Done | Style-aware TTL with auto-refresh on expiry |
| RegimeCard (decisional core) | Done | Composite score, regime, direction, range, risk mode, size |
| SignalsGrid (key signals) | Done | Per-asset direction + 24h change |
| MacroGrid (macro indicators) | Done | Correlations with change % and impact text |
| Market alerts (toasts) | Done | Fear/Greed, conflict, OI spike, divergence |
| Trading style integration | Done | Style-aware weights, range scaling, bias validity |

**Gaps:**

1. **No `role="region"` on root container**: Unlike the 11+ analytics components that are standardized with ARIA region roles, this page lacks `role="region"` and `aria-label`.

2. **`calendarLoading` destructured but never used** (line 54): Dead code -- only `calendarData` is passed to RegimeCard.

3. **SignalsGrid and MacroGrid return `null` via conditional rendering** (lines 124-131): When data is absent or loading, these sections disappear entirely, causing layout shifts. Should show empty-state cards instead.

4. **Hardcoded `$` in SignalsGrid** (line 163): `${signal.price.toLocaleString(...)}` bypasses the global `format()` currency conversion utility. Users with non-USD currencies see inconsistent formatting.

---

## 2. RegimeCard (`RegimeCard.tsx`)

### A. Comprehensiveness

| Feature | Status |
|---------|--------|
| Loading skeleton | Done |
| Error fallback | Done |
| No-data empty state | Done |
| ErrorBoundary wrapper | Done |
| Regime badge with semantic colors | Done |
| Direction probability with progress bar | Done |
| Expected range (style-scaled) | Done |
| Risk mode badge | Done |
| Unified position size | Done |
| Score breakdown footer | Done |
| Orchestrator multiplier footer | Done |
| Alignment + dominant factor + mode badge | Done |
| Style context label | Done |

### B. Accuracy

| Check | Result |
|-------|--------|
| Composite score: weighted sum with divergence penalty | Correct -- capped at 5pts, direction-aware |
| Fear/Greed non-linear transform | Correct -- contrarian: extreme fear maps 35-50, extreme greed maps 50-65 |
| Regime priority: RISK_OFF > HIGH_VOL > TRENDING > RANGING | Correct |
| Regime style sensitivity (scalping ignores HIGH event risk) | Correct |
| Direction probability: 30 + (score/100)*40 = [30-70] range | Correct |
| Expected range: base ATR x regime multiplier x style sqrt-time multiplier | Correct |
| Unified orchestrator: defensive min-floor vs adaptive blend | Correct |
| Orchestrator hard floor at 0.25 | Correct |
| Event decay weight: exponential with 6h half-life | Correct |
| Volatility multiplier thresholds (40/80/120) | Correct |

### C. Clarity -- Missing Tooltips (13 items)

5. **"Market Regime" card title** -- No tooltip. Should say: "The classified market state based on a composite of technical, on-chain, macro, and sentiment signals. Determines risk mode and position sizing."

6. **Regime badge** (e.g., "Trending Bullish") -- No tooltip explaining what each regime means. Should say: "Trending Bullish: Score >65, positive momentum, crypto/macro aligned. Trending Bearish: Score <35, negative momentum. Ranging: Score 35-65 or no clear momentum. High Volatility: Elevated vol override. Risk Off: Extreme event risk override."

7. **"Direction (Xh)" label** -- No tooltip. Should say: "Estimated probability of upward price movement over the style-specific horizon. Derived from the composite score. 50% = neutral."

8. **"Expected Range (Xh)" label** -- No tooltip. Should say: "Estimated price movement range based on ATR, volatility regime, and momentum skew. Scaled to the selected trading style horizon using sqrt-time."

9. **"Risk Mode" label** -- No tooltip. Should say: "Aggressive: Trend + alignment confirmed, normal sizing. Neutral: No strong conviction, reduce 30%. Defensive: Conflict, high vol, or event risk -- reduce 50-75%."

10. **"Position Size" label** -- No tooltip. Should say: "Unified position size recommendation from the Risk Orchestrator. Blends calendar, regime, and volatility signals. Style-weighted with a hard floor at 25%."

11. **"Score X" in footer** -- No tooltip. Should say: "Composite market score (0-100). Weighted: Tech 35%, On-Chain 20%, Macro 25%, Fear/Greed 20%. A divergence penalty (max 5pts) applies when factors conflict."

12. **"Tech X" in footer** -- No tooltip. Should say: "Technical analysis score (0-100) from price action, trend indicators, and momentum signals."

13. **"Macro X" in footer** -- No tooltip. Should say: "Macroeconomic score (0-100) reflecting conditions like DXY, bond yields, and liquidity."

14. **"F&G X" in footer** -- No tooltip. Should say: "Fear & Greed Index (0-100). Non-linear transform: extreme values (<20, >80) are treated as contrarian mean-reversion signals."

15. **"Cal Xx" multiplier** -- No tooltip. Should say: "Calendar multiplier (0.25-1.0). Reduces size when high-impact economic events are imminent."

16. **"Reg Xx" multiplier** -- No tooltip. Should say: "Regime multiplier. Derived from risk mode: Aggressive=1.0, Neutral=0.7, Defensive=0.25-0.5."

17. **"Vol Xx" multiplier** -- No tooltip. Should say: "Volatility multiplier (0.5-1.0). Reduces size when annualized BTC volatility exceeds 80%."

### D. Code Quality

18. **Footer breakdown is a single inline string** (lines 189-198): The breakdown data (Score, Tech, Macro, F&G, multipliers) is rendered as a raw text string with no semantic structure. Each metric should be a discrete, tooltipped element for both accessibility and clarity.

---

## 3. BiasExpiryIndicator

### A. Comprehensiveness & Accuracy

| Feature | Status |
|---------|--------|
| Countdown timer (30s interval) | Done |
| Expired state with destructive styling | Done |
| Warning state (<5min remaining) | Done |
| Valid state with profit styling | Done |
| Auto-refresh on expiry via `onExpired` | Done |
| Hour + minute formatting | Done |

**No issues found.** This component is clean and correct.

### C. Clarity

19. **No tooltip on the badge itself**: Should say: "Time remaining before the AI bias analysis expires. After expiry, data auto-refreshes. Duration depends on trading style: Scalping=15m, Short=60m, Swing=240m."

---

## 4. SignalsGrid & MacroGrid (inline components)

### A. Accuracy

| Check | Result |
|-------|--------|
| Signal direction icon mapping | Correct |
| 24h change sign + color | Correct -- semantic text-profit/text-loss |
| Macro value formatting (>1000 vs small) | Correct |
| Macro change precision (.toFixed(2)) | Correct |

### C. Clarity -- Missing Tooltips

20. **"Key Signals" card title** -- No tooltip. Should say: "Summary of directional signals for major crypto assets, including trend description and 24h price change."

21. **"Macro Indicators" card title** -- No tooltip. Should say: "Key macroeconomic indicators and their recent changes. These feed into the regime classification composite score."

22. **Individual macro indicator names** (DXY, Gold, etc.) -- No tooltips explaining relevance to crypto. Should add per-item tooltip based on `item.impact` (already present as text, but a tooltip on the name itself would help).

---

## 5. Summary of Recommendations

### Priority 1 -- Bugs & Layout Stability

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | No `role="region"` on root | MarketInsight.tsx | Add `role="region" aria-label="Market Bias"` |
| 2 | `calendarLoading` dead code | MarketInsight.tsx | Remove from destructure |
| 3 | SignalsGrid/MacroGrid return null (layout shift) | MarketInsight.tsx | Always render cards; show empty state when no data |
| 4 | Hardcoded `$` in SignalsGrid price | MarketInsight.tsx | Use `format()` from `useCurrencyConversion` |

### Priority 2 -- Missing Tooltips (Clarity)

| # | Element | Component |
|---|---------|-----------|
| 5-6 | Market Regime title + badge | RegimeCard.tsx |
| 7-10 | Direction, Range, Risk Mode, Position Size | RegimeCard.tsx |
| 11-17 | Footer breakdown (Score, Tech, Macro, F&G, Cal, Reg, Vol) | RegimeCard.tsx |
| 18 | Footer structure (raw string to semantic elements) | RegimeCard.tsx |
| 19 | BiasExpiryIndicator badge | BiasExpiryIndicator.tsx |
| 20-21 | Key Signals + Macro Indicators titles | MarketInsight.tsx |

### Priority 3 -- Code Quality

| # | Issue | Fix |
|---|-------|-----|
| 2 | Dead `calendarLoading` destructure | Remove |
| 18 | Footer breakdown is raw string | Refactor into discrete tooltipped spans |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/MarketInsight.tsx` | Add `role="region"` (P1), remove `calendarLoading` (P1), replace conditional null renders with empty-state cards for SignalsGrid/MacroGrid (P1), fix hardcoded `$` with `format()` (P1), add tooltips to "Key Signals" and "Macro Indicators" titles (P2) |
| `src/components/market-insight/RegimeCard.tsx` | Add 13 tooltips to all labels and footer breakdown metrics (P2), refactor footer from raw string to semantic tooltipped elements (P3) |
| `src/components/market-insight/BiasExpiryIndicator.tsx` | Add tooltip explaining validity duration per trading style (P2) |

