
# Strategy System: Structural Integrity & Completeness Upgrade

Addresses 9 issues: R:R redundancy, confluence logic, confidence transparency, position sizing, trade management rules, leaderboard empty state, timeframe labels, futures-specific fields, and validation scoring.

---

## Scope & Priority

Issues are grouped into 3 tiers:

**Tier 1 -- Logic Fixes (prevent conflicts)**
1. R:R single source of truth
2. Min Confluences vs mandatory rules decoupling
3. Confidence score transparency

**Tier 2 -- Feature Completions (strategy engine gaps)**
4. Position sizing model
5. Trade management rules
6. Futures-specific fields (leverage, margin mode)

**Tier 3 -- UX Polish**
7. Leaderboard empty state
8. Timeframe hierarchy labels
9. Validation score explainability (tooltip)

---

## 1. R:R Single Source of Truth

**Problem:** `min_rr` in Entry tab and TP/SL R values in Exit tab are independent. A user sets min_rr=1.5 but exit TP=2R/SL=1R (implied R:R=2:1). Which is authoritative?

**Solution:** Make `min_rr` a **validation gate** only. It validates that the exit rules produce an R:R >= min_rr. Remove it from the Entry tab and move it to the Exit tab as a derived/validated field.

**Files:**
- `src/components/strategy/StrategyFormDialog.tsx`: Move `min_rr` input from Entry tab to Exit tab. Add a computed R:R display derived from exit rules (TP value / SL value when both are in `rr` unit). Show a warning badge if derived R:R < min_rr.
- `src/components/strategy/ExitRulesBuilder.tsx`: Add a computed "Effective R:R" display at the top showing TP/SL ratio when both exist in the rules.

---

## 2. Decouple Min Confluences from Mandatory Count

**Problem:** 4 mandatory rules + min_confluences=4 makes the setting redundant.

**Solution:** Change the default to 2 mandatory, 2 optional (out of the 4 default rules). Update the default `min_confluences` to 3.

**Files:**
- `src/types/strategy.ts`: Update `DEFAULT_ENTRY_RULES` -- set `on_chain` and `sentiment` as `is_mandatory: false` (already done), and also set `indicator_confirmation` to `is_mandatory: false`.
- `src/lib/constants/strategy-config.ts`: Change `MIN_CONFLUENCES: 3` (from 4), `DEFAULT_ENTRY_RULES_COUNT: 4` stays.
- `src/lib/constants/strategy-rules.ts`: Change `DEFAULT_MANDATORY_THRESHOLD: 2` (from 4).
- `src/components/strategy/EntryRulesBuilder.tsx`: Update description text to reflect the new threshold.

---

## 3. Confidence Score Transparency

**Problem:** YouTube-imported strategies show "Confidence: 91%" without explaining the formula.

**Solution:** Add a tooltip/hover explanation on any confidence or validation_score display.

**Files:**
- `src/components/strategy/StrategyCard.tsx`: Where validation_score is potentially shown (via YouTube badge area), add a tooltip: "Confidence score is based on: completeness of entry/exit rules, specificity of conditions, and backtest-readiness. Not a win rate prediction."
- `src/components/strategy/StrategyDetailDrawer.tsx`: If `strategy.validation_score` exists, render it with the same tooltip.
- `src/hooks/use-youtube-strategy-import.ts`: Add a comment documenting the confidence formula for developer clarity.

---

## 4. Position Sizing Model Field

**Problem:** Strategies have no position sizing model. Backtest uses flat risk.

**Solution:** Add a `position_sizing_model` field to strategies with options: Fixed % Risk (default), Fixed USD, Kelly Fraction, Volatility-Adjusted (ATR).

**Database Migration:**
```sql
ALTER TABLE trading_strategies
  ADD COLUMN position_sizing_model text DEFAULT 'fixed_percent',
  ADD COLUMN position_sizing_value numeric DEFAULT 2;
```

**Files:**
- `src/types/strategy.ts`: Add `PositionSizingModel` type and fields to `TradingStrategyEnhanced`.
- `src/lib/constants/strategy-config.ts`: Add `POSITION_SIZING_MODELS` array with label/description/default for each model.
- `src/components/strategy/StrategyFormDialog.tsx`: Add a "Risk & Sizing" section in the Exit tab with model selector and value input.
- `src/hooks/trading/use-trading-strategies.ts`: Map the new columns.
- `src/components/strategy/StrategyDetailDrawer.tsx`: Display the sizing model in Strategy Details card.

---

## 5. Trade Management Rules

**Problem:** Only TP/SL exist. No partial TP, move SL to BE, max trades per day, or kill switch.

**Solution:** Add a `trade_management` JSONB field to store structured management rules.

**Database Migration:**
```sql
ALTER TABLE trading_strategies
  ADD COLUMN trade_management jsonb DEFAULT '{}';
```

**New type:**
```typescript
interface TradeManagement {
  partial_tp_enabled: boolean;
  partial_tp_levels: { percent: number; at_rr: number }[];  // e.g., close 50% at 1R
  move_sl_to_be: boolean;
  move_sl_to_be_at_rr: number;  // e.g., move SL to BE at 1R
  max_trades_per_day: number | null;
  max_daily_loss_percent: number | null;  // kill switch
  max_consecutive_losses: number | null;  // streak kill switch
}
```

**Files:**
- `src/types/strategy.ts`: Add `TradeManagement` interface and default.
- `src/components/strategy/StrategyFormDialog.tsx`: Add a 5th tab "Manage" with toggles and inputs for partial TP, SL-to-BE, max trades, kill switch.
- `src/components/strategy/StrategyDetailDrawer.tsx`: Display management rules.
- `src/hooks/trading/use-trading-strategies.ts`: Map the new column.

---

## 6. Futures-Specific Fields

**Problem:** Futures strategies have no leverage or margin mode settings.

**Solution:** Conditionally show leverage and margin mode fields when `market_type === 'futures'`.

**Database Migration:**
```sql
ALTER TABLE trading_strategies
  ADD COLUMN default_leverage integer DEFAULT 1,
  ADD COLUMN margin_mode text DEFAULT 'cross';
```

**Files:**
- `src/types/strategy.ts`: Add fields to enhanced type.
- `src/components/strategy/StrategyFormDialog.tsx`: In Method tab, conditionally render leverage slider (1-125x) and margin mode toggle (Cross/Isolated) when market type is "futures".
- `src/components/strategy/StrategyDetailDrawer.tsx`: Show leverage and margin mode badges for futures strategies.
- `src/hooks/trading/use-trading-strategies.ts`: Map columns.

---

## 7. Leaderboard Empty State

**Problem:** Shows "Top 0 cloned strategies globally" when empty.

**Solution:** Already partially handled (lines 349-352 of StrategyLeaderboard.tsx have an empty message), but the `CardDescription` on line 238 still shows "Top 0 cloned strategies globally".

**File:** `src/components/strategy/StrategyLeaderboard.tsx`

Fix the description:
```typescript
<CardDescription>
  {allFilteredStrategies.length === 0
    ? "Be the first to share and get cloned!"
    : hasActiveFilters
    ? `Showing ${allFilteredStrategies.length} filtered strategies`
    : `Top ${allFilteredStrategies.length} cloned strategies globally`
  }
</CardDescription>
```

---

## 8. Timeframe Hierarchy Labels

**Problem:** Timeframe display shows "not_specified" and labels are unclear.

**Solution:** Update the detail drawer and card to use clear hierarchy labels.

**Files:**
- `src/components/strategy/StrategyDetailDrawer.tsx`: Change the MTFA display labels:
  - "Higher TF (Bias)" with value or "Not set"
  - "Primary TF (Trade)" with value or "Not set"
  - "Lower TF (Entry)" with value or "Not set"
  - Never show raw "not_specified" -- treat empty/null as "Not set".

- `src/components/strategy/StrategyFormDialog.tsx`: Already uses "Higher TF (Bias)", "Primary TF", "Lower TF (Entry)" labels (lines 396, 413, 429). No changes needed here.

---

## 9. Validation Score Explainability

**Problem:** validation_score (from YouTube imports) has no visible formula.

**Solution:** Covered by item #3 above. Additionally, in `StrategyValidationBadge.tsx`, add a `title` attribute showing the score breakdown basis.

**File:** `src/components/strategy/StrategyValidationBadge.tsx`: Wrap the badge in a Tooltip explaining: "Score based on: entry rule count, exit rule presence, timeframe defined, pair specificity."

---

## Technical Summary

### Database Migrations (single migration)

```sql
ALTER TABLE trading_strategies
  ADD COLUMN IF NOT EXISTS position_sizing_model text DEFAULT 'fixed_percent',
  ADD COLUMN IF NOT EXISTS position_sizing_value numeric DEFAULT 2,
  ADD COLUMN IF NOT EXISTS trade_management jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS default_leverage integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS margin_mode text DEFAULT 'cross';
```

### Files Modified

| File | Changes |
|------|---------|
| `src/types/strategy.ts` | Add PositionSizingModel, TradeManagement types; update defaults; add new fields to TradingStrategyEnhanced |
| `src/lib/constants/strategy-config.ts` | MIN_CONFLUENCES to 3; add POSITION_SIZING_MODELS array |
| `src/lib/constants/strategy-rules.ts` | DEFAULT_MANDATORY_THRESHOLD to 2 |
| `src/components/strategy/StrategyFormDialog.tsx` | Move min_rr to Exit tab; add 5th "Manage" tab; futures fields; position sizing selector; derived R:R display |
| `src/components/strategy/ExitRulesBuilder.tsx` | Add computed Effective R:R display |
| `src/components/strategy/EntryRulesBuilder.tsx` | Update description text for new threshold |
| `src/components/strategy/StrategyDetailDrawer.tsx` | Display sizing model, management rules, leverage/margin, confidence tooltip, clean MTFA labels |
| `src/components/strategy/StrategyCard.tsx` | Confidence tooltip on validation_score |
| `src/components/strategy/StrategyLeaderboard.tsx` | Fix empty state description |
| `src/components/strategy/StrategyValidationBadge.tsx` | Add explanatory tooltip |
| `src/hooks/trading/use-trading-strategies.ts` | Map new DB columns |
| `src/pages/trading-journey/StrategyManagement.tsx` | Pass new fields through form submit handler |

### What Does NOT Change

- Backtest engine logic (will consume new fields in a separate iteration)
- AI Quality Score calculation
- Strategy sharing/cloning flow
- YouTube import flow (scores remain as-is, just made transparent)
- Position calculator page (separate tool, not strategy-embedded)
