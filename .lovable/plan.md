

# Deep-Dive Analysis: Risk Analytics Page

---

## 1. Page Orchestrator (`RiskManagement.tsx`)

### A. Comprehensiveness

| Feature | Status |
|---------|--------|
| PageHeader with icon/description | Done |
| URL-driven tab state (overview/history) | Done |
| ErrorBoundary with retryKey | Done |
| Loading skeleton | Done |
| QuickTip onboarding | Done |
| DailyLossTracker (overview) | Done |
| RiskProfileSummaryCard (overview) | Done |
| Risk Alerts card (overview) | Done |
| CorrelationMatrix (overview) | Done |
| RiskEventLog (history tab) | Done |

**Gaps:**

1. **No `role="region"` on root container** -- inconsistent with the ARIA standard applied to 11+ other pages.

2. **No tooltips on tab triggers** -- "Overview" and "History" tabs have no contextual guidance explaining what each tab contains.

3. **No tooltip on "Risk Alerts" card title** -- Should say: "Recent threshold breaches and warnings from your daily loss tracker and correlation checks."

4. **No tooltip on "Risk Alerts" trigger badge** (the `%` badge on each event) -- Should say: "The loss limit percentage that triggered this alert."

5. **Risk Alerts icon uses `text-primary`** instead of semantic `text-chart-4` (warning color). The `AlertTriangle` icon in the card header should use a warning-appropriate semantic token, not the generic primary color.

---

## 2. DailyLossTracker

### A. Comprehensiveness -- Complete

Loading, no-profile, no-balance, and active states are all handled with proper CTAs. Live/Paper badge, progress bar with threshold markers, 4 stats grid, trading status badge, and upgrade CTA are all present.

### B. Accuracy -- Correct

Loss limit, P&L, remaining budget, and threshold coloring all use centralized constants and the `useCurrencyConversion` hook.

### C. Clarity

All 4 stats have `InfoTooltip` components. Well implemented.

6. **"Daily Loss Tracker" card title** -- No tooltip. Should say: "Tracks your realized losses against your configured daily loss limit. Trading is blocked when 100% is consumed."

7. **Progress bar threshold markers** (0%, 70%, 90%, 100%) -- No tooltips explaining what each threshold means. Should say: "70% = Warning level. 90% = Danger level. 100% = Trading disabled."

8. **"Trading Allowed" / "Trading Disabled" badge** -- No tooltip. Should say: "Current trading permission status based on your daily loss consumption."

9. **"Live" / "Paper" source badge** -- No tooltip. Should say: "Data source for loss tracking. Live uses real-time exchange data, Paper uses simulated account data."

---

## 3. RiskProfileSummaryCard

### A. Comprehensiveness -- Complete

4 metric cards (Risk per Trade, Max Daily Loss, Max Position Size, Max Positions) with empty state CTA.

### C. Clarity -- Missing Tooltips (All 4 metrics lack explanation)

10. **"Risk per Trade" label** -- No tooltip. Should say: "Maximum percentage of your account balance to risk on any single trade. Recommended: 1-2%."

11. **"Max Daily Loss" label** -- No tooltip. Should say: "Maximum cumulative loss allowed in a single trading day. Trading is disabled when this limit is reached."

12. **"Max Position Size" label** -- No tooltip. Should say: "Maximum percentage of your capital that can be deployed in a single position."

13. **"Max Positions" label** -- No tooltip. Should say: "Maximum number of open positions allowed simultaneously to limit concentration risk."

14. **"Risk Profile" card title** -- No tooltip. Should say: "Your configured risk management parameters. Edit these in Settings > Trading."

---

## 4. CorrelationMatrix

### A. Comprehensiveness -- Complete

Open position detection, pair correlation lookup (centralized), high-correlation warnings, collapsible UI, auto-expand on warnings, color-coded legend. Empty states for 0 and 1 positions.

### B. Accuracy -- Correct

Uses centralized `getCorrelation()` and `CORRELATION_COLOR_THRESHOLDS`.

### C. Clarity -- Missing Tooltips

15. **"Position Correlation" card title** -- No tooltip. Should say: "Measures how similarly your open positions move. High correlation (>70%) means positions amplify each other's risk."

16. **"Advanced" badge** -- No tooltip. Should say: "This is an advanced risk metric. Requires 2+ open positions for analysis."

17. **Correlation percentage value** (e.g., "85%") -- No tooltip. Should say: "Estimated correlation coefficient between these two assets. 100% = perfectly correlated, 0% = independent."

18. **Legend items** -- No tooltips explaining correlation bands. Should say, e.g.: "Very High (>=80%): Positions behave almost identically. Consider closing one."

---

## 5. RiskEventLog

### A. Comprehensiveness -- Complete

3-tab layout (Risk Events, Liquidations, Margin), disabled state for exchange tabs in Paper mode, scrollable lists, proper empty states, event type config with semantic colors.

### B. Accuracy

19. **Hardcoded `$` in liquidation Avg Price** (line 268): `${order.avgPrice.toLocaleString()}` bypasses the global currency conversion utility. Should use `useCurrencyConversion`.

### C. Clarity -- Missing Tooltips

20. **"Risk Event Log" card title** -- No tooltip. Should say: "Complete history of risk threshold breaches, trading gate events, and exchange liquidations."

21. **"Risk Events" tab trigger** -- No tooltip. Should say: "System-generated alerts when your daily loss approaches or reaches configured limits."

22. **"Liquidations" tab trigger** -- No tooltip (when enabled). Should say: "Exchange-initiated forced closures of positions due to insufficient margin."

23. **"Margin" tab trigger** -- No tooltip (when enabled). Should say: "History of margin additions and reductions for your active positions."

24. **"Trigger" / "Threshold" labels in event detail** -- No tooltips. Trigger should say: "The actual loss percentage that caused this event." Threshold should say: "The configured limit that was breached."

---

## 6. MarginHistoryTab

### A. Comprehensiveness -- Complete

Symbol selector, margin add/reduce entries with time, amount, asset, and position side. Proper empty/loading/not-configured states.

### B. Accuracy

25. **Hardcoded `$` in margin amount** (line 153): `${Math.abs(change.amount).toFixed(2)}` bypasses global currency conversion. Should use `useCurrencyConversion`.

### C. Clarity -- Missing Tooltips

26. **Symbol selector** -- No tooltip. Should say: "Select a position symbol to view its margin adjustment history."

27. **"Add Margin" / "Reduce Margin" badge** -- No tooltip. Should say: "Add Margin: You deposited additional collateral. Reduce Margin: You withdrew excess collateral from this position."

---

## 7. RiskSettingsForm

### A. Comprehensiveness -- Complete

5 sliders with ARIA labels, InfoTooltips on Risk per Trade and Max Daily Loss/Weekly Drawdown. Save button with loading state.

### C. Clarity -- Missing Tooltips

28. **"Max Position Size" label** -- No tooltip (unlike the other sliders which have InfoTooltip). Should say: "Maximum percentage of capital to deploy in a single position. Helps prevent overconcentration."

29. **"Max Concurrent Positions" label** -- No tooltip. Should say: "Maximum open positions at once. Limits concentration risk and cognitive overload."

---

## 8. Supporting Components

### RiskAlertBanner

Fully implemented with InfoTooltip, semantic colors, dismiss behavior, and link to Risk Analytics. No gaps.

### RiskSummaryCard (Dashboard widget)

Fully implemented with InfoTooltips on Daily Loss Limit and Remaining Budget. Correlation warning section included. No gaps.

---

## 9. Summary of Recommendations

### Priority 1 -- Bugs & Accuracy

| # | Issue | File | Fix |
|---|-------|------|-----|
| 19 | Hardcoded `$` in liquidation Avg Price | RiskEventLog.tsx | Use `useCurrencyConversion` hook |
| 25 | Hardcoded `$` in margin amount | MarginHistoryTab.tsx | Use `useCurrencyConversion` hook |

### Priority 2 -- Missing Tooltips (Clarity)

| # | Elements | Component |
|---|----------|-----------|
| 2 | Tab triggers (Overview, History) | RiskManagement.tsx |
| 3-4 | Risk Alerts title, trigger badge | RiskManagement.tsx |
| 6-9 | DailyLossTracker title, threshold markers, status badge, source badge | DailyLossTracker.tsx |
| 10-14 | All 4 profile metric labels, card title | RiskProfileSummaryCard.tsx |
| 15-18 | Correlation title, Advanced badge, percentage value, legend | CorrelationMatrix.tsx |
| 20-24 | Event Log title, 3 tab triggers, Trigger/Threshold labels | RiskEventLog.tsx |
| 26-27 | Symbol selector, margin type badge | MarginHistoryTab.tsx |
| 28-29 | Max Position Size slider, Max Concurrent Positions slider | RiskSettingsForm.tsx |

### Priority 3 -- Code Quality & Accessibility

| # | Issue | Fix |
|---|-------|-----|
| 1 | Missing `role="region"` on page root | RiskManagement.tsx |
| 5 | Risk Alerts icon uses `text-primary` instead of semantic `text-chart-4` | RiskManagement.tsx |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/RiskManagement.tsx` | Add `role="region"` and `aria-label` (P3), add tooltips to tab triggers (P2), add tooltip to Risk Alerts title (P2), fix icon color to `text-chart-4` (P3) |
| `src/components/risk/DailyLossTracker.tsx` | Add tooltips to card title, threshold markers, status badge, and source badge (P2) |
| `src/components/risk/RiskProfileSummaryCard.tsx` | Add tooltips to card title and all 4 metric labels (P2) |
| `src/components/risk/CorrelationMatrix.tsx` | Add tooltips to card title, Advanced badge, correlation value, and legend items (P2) |
| `src/components/risk/RiskEventLog.tsx` | Replace hardcoded `$` with `useCurrencyConversion` (P1), add tooltips to card title, tab triggers, and Trigger/Threshold labels (P2) |
| `src/components/risk/MarginHistoryTab.tsx` | Replace hardcoded `$` with `useCurrencyConversion` (P1), add tooltips to symbol selector and margin type badge (P2) |
| `src/components/risk/RiskSettingsForm.tsx` | Add tooltips to Max Position Size and Max Concurrent Positions sliders (P2) |

