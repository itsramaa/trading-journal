
# Plan: Strategy Schema Enhancement & Multi-Timeframe Support

**Status: ✅ COMPLETED**

### 1. Timeframe Single Select → Multiple Select Issue
**Current State:**
- Database: `timeframe TEXT` (single value)
- Form: Single `<Select>` component
- YouTube Import: Sudah punya `timeframeContext` dengan `primary`, `higherTF`, `lowerTF`

**Professional Standard:**
- Trader profesional menggunakan **Multi-Timeframe Analysis (MTFA)**
- HTF (Higher Timeframe): Untuk bias direction
- LTF (Lower Timeframe): Untuk entry precision
- Primary TF: Untuk trade management

### 2. Strategy Fields Missing vs YouTube Import

| Field | YouTube Import | Strategy DB | Strategy Form |
|-------|---------------|-------------|---------------|
| `methodology` | smc/ict/price_action/etc | Missing | Missing |
| `difficultyLevel` | beginner/intermediate/advanced | Exists (column) | Missing |
| `tradingStyle` | scalping/day_trading/swing/position | Missing | Missing |
| `sessionPreference` | london/ny/asian/all | Missing | Missing |
| `conceptsUsed` | OB/FVG/RSI divergence/etc | Missing (in entry_rules) | Partial |
| `timeframeContext` | {primary, higherTF, lowerTF} | Single `timeframe` | Single |
| `validation_score` | 0-100 | Exists (column) | Missing |
| `automation_score` | 0-100 | Exists (column) | Missing |

---

## Solution Design

### Phase 1: Database Schema Update

Tambah kolom baru ke `trading_strategies`:

```sql
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS 
  methodology TEXT DEFAULT 'price_action';

ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS 
  trading_style TEXT DEFAULT 'day_trading';

ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS 
  session_preference TEXT[] DEFAULT ARRAY['all']::TEXT[];

ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS 
  higher_timeframe TEXT;

ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS 
  lower_timeframe TEXT;

-- Rename existing timeframe to primary_timeframe for clarity (optional)
-- Or keep as primary and add higher/lower
```

**New Columns:**
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `methodology` | `TEXT` | `'price_action'` | Trading methodology (smc, ict, indicator_based, etc.) |
| `trading_style` | `TEXT` | `'day_trading'` | Trading style (scalping, day_trading, swing, position) |
| `session_preference` | `TEXT[]` | `['all']` | Preferred sessions (london, ny, asian, all) |
| `higher_timeframe` | `TEXT` | `NULL` | HTF for directional bias |
| `lower_timeframe` | `TEXT` | `NULL` | LTF for entry precision |

---

### Phase 2: Type Updates

**File: `src/types/strategy.ts`**

```typescript
// New types
export type TradingMethodology = 
  | 'indicator_based'
  | 'price_action' 
  | 'smc'
  | 'ict'
  | 'wyckoff'
  | 'elliott_wave'
  | 'hybrid';

export type TradingStyle = 
  | 'scalping' 
  | 'day_trading' 
  | 'swing' 
  | 'position';

export type TradingSession = 
  | 'all' 
  | 'asian' 
  | 'london' 
  | 'ny';

export type DifficultyLevel = 
  | 'beginner' 
  | 'intermediate' 
  | 'advanced';

// Enhanced interface
export interface TradingStrategyEnhanced {
  // ... existing fields
  
  // NEW fields
  methodology: TradingMethodology;
  trading_style: TradingStyle;
  session_preference: TradingSession[];
  higher_timeframe: TimeframeType | null;
  lower_timeframe: TimeframeType | null;
  difficulty_level: DifficultyLevel | null;
}
```

---

### Phase 3: Strategy Form Update

**File: `src/components/strategy/StrategyFormDialog.tsx`**

Tambah fields baru ke form:

1. **Methodology Select** (single)
   - Options: Indicator-Based, Price Action, SMC, ICT, Wyckoff, Elliott Wave, Hybrid

2. **Trading Style Select** (single)
   - Options: Scalping, Day Trading, Swing, Position

3. **Session Preference** (multi-select badges)
   - Options: All Sessions, Asian, London, New York
   - Allow multiple selection

4. **Timeframe Section Redesign:**
   ```
   ┌─────────────────────────────────────────┐
   │ Multi-Timeframe Analysis                │
   ├─────────────────────────────────────────┤
   │ Higher TF (Bias)    │ [4H ▼]           │
   │ Primary TF (Trade)  │ [15m ▼]          │
   │ Lower TF (Entry)    │ [5m ▼]           │
   └─────────────────────────────────────────┘
   ```

5. **Difficulty Level** (optional)
   - Beginner / Intermediate / Advanced

---

### Phase 4: Hook Updates

**File: `src/hooks/use-trading-strategies.ts`**

Update interfaces:
```typescript
export interface TradingStrategy {
  // ... existing
  methodology: TradingMethodology | null;
  trading_style: TradingStyle | null;
  session_preference: TradingSession[] | null;
  higher_timeframe: TimeframeType | null;
  lower_timeframe: TimeframeType | null;
  difficulty_level: DifficultyLevel | null;
}

export interface CreateStrategyInput {
  // ... existing
  methodology?: TradingMethodology;
  trading_style?: TradingStyle;
  session_preference?: TradingSession[];
  higher_timeframe?: TimeframeType;
  lower_timeframe?: TimeframeType;
  difficulty_level?: DifficultyLevel;
}
```

---

### Phase 5: YouTube Import Alignment

**File: `src/hooks/use-youtube-strategy-import.ts`**

Update `saveToLibrary` untuk map semua fields:

```typescript
const { data, error } = await supabase
  .from("trading_strategies")
  .insert([{
    // ... existing mappings
    
    // NEW field mappings
    methodology: strategy.methodology,
    trading_style: mapTimeframeToStyle(strategy.timeframeContext.primary),
    session_preference: strategy.sessionPreference 
      ? [strategy.sessionPreference] 
      : ['all'],
    higher_timeframe: strategy.timeframeContext.higherTF,
    lower_timeframe: strategy.timeframeContext.lowerTF,
    difficulty_level: strategy.difficultyLevel,
  }]);
```

---

### Phase 6: Strategy Card & Detail Updates

**Components to update:**
1. `StrategyCard.tsx` - Show methodology badge, trading style
2. `StrategyDetailDrawer.tsx` - Show all new fields
3. `StrategyStats.tsx` - Group by methodology if useful

---

## Implementation Sequence

```text
Step 1: Database Migration
        ↓
Step 2: Type Updates (src/types/strategy.ts)
        ↓
Step 3: Hook Updates (use-trading-strategies.ts)
        ↓
Step 4: Form Dialog Updates (StrategyFormDialog.tsx)
        ↓
Step 5: YouTube Import Alignment
        ↓
Step 6: Card/Detail UI Updates
        ↓
Step 7: Documentation Update (docs/)
```

---

## New Form Layout Preview

```text
┌─────────────────────────────────────────────────────────────────┐
│ Strategy Form                                                    │
├─────────────────────────────────────────────────────────────────┤
│ [Basic Info] [Methodology] [Timeframes] [Entry Rules] [Exit]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ METHODOLOGY TAB (NEW):                                          │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Trading Methodology                                          │ │
│ │ ○ Price Action  ○ SMC  ○ ICT  ○ Indicator  ○ Hybrid         │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ Trading Style                                                │ │
│ │ [Day Trading ▼]                                              │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ Preferred Sessions                                           │ │
│ │ [London ✓] [New York ✓] [Asian] [All]                       │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ Difficulty Level                                             │ │
│ │ ○ Beginner  ○ Intermediate  ● Advanced                      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ TIMEFRAMES TAB:                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Multi-Timeframe Analysis                                     │ │
│ │ ┌─────────────────┬────────────────────────────────────────┐│ │
│ │ │ Higher TF       │ [4 Hours ▼]  (Directional bias)       ││ │
│ │ ├─────────────────┼────────────────────────────────────────┤│ │
│ │ │ Primary TF      │ [15 Minutes ▼]  (Trade management) *  ││ │
│ │ ├─────────────────┼────────────────────────────────────────┤│ │
│ │ │ Lower TF        │ [5 Minutes ▼]  (Entry precision)      ││ │
│ │ └─────────────────┴────────────────────────────────────────┘│ │
│ │ * Required                                                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Benefits

1. **Alignment**: Strategy form selaras dengan YouTube Import data
2. **Professional Standard**: Multi-timeframe analysis support
3. **Better Analytics**: Filter/group by methodology, style, session
4. **Backtest Enhancement**: Filter by session preference
5. **User Experience**: More complete strategy definition

---

## Files to Modify

| File | Changes |
|------|---------|
| `trading_strategies` table | Add 5 new columns via migration |
| `src/types/strategy.ts` | Add new types + update interface |
| `src/hooks/use-trading-strategies.ts` | Update interfaces + CRUD |
| `src/components/strategy/StrategyFormDialog.tsx` | Add new fields + tabs |
| `src/hooks/use-youtube-strategy-import.ts` | Map all new fields |
| `src/components/strategy/StrategyCard.tsx` | Show methodology badge |
| `src/components/strategy/StrategyDetailDrawer.tsx` | Show all new fields |
| `src/lib/constants/strategy-config.ts` | Add new defaults + options |
| `docs/FEATURES.md` | Update Strategy Management section |
