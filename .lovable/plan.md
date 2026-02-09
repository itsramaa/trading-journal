

# Plan: YouTube Strategy Import — Accuracy-First Overhaul

## Executive Summary

Implementasi ulang sistem YouTube Strategy Import dengan prinsip **"Better to FAIL than to be WRONG"**. Sistem akan mengambil transcript penuh secara otomatis, melakukan validasi multi-tahap, dan mendukung berbagai metodologi trading (SMC, ICT, Price Action, Indicator-based, Hybrid).

---

## Current State Analysis

### Problems Identified

| Issue | Current Behavior | Impact |
|-------|------------------|--------|
| **No Transcript Acquisition** | Only fetches video title via oEmbed | AI generates placeholder strategies |
| **Hardcoded Indicator Bias** | Prompt defaults to RSI/MACD/EMA | SMC/ICT strategies get wrong indicators |
| **Unstructured Entry Rules** | `string[]` format | Cannot differentiate rule types |
| **No Methodology Detection** | Always assumes "indicator-based" | Misclassifies SMC/ICT strategies |
| **No Fail-Safe Validation** | Always returns a strategy | Dangerous for trading decisions |
| **No Confidence Gating** | Saves regardless of confidence | Low-quality strategies enter library |

### Current Data Flow

```text
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ YouTube URL │────►│ oEmbed Title │────►│ AI Guesses  │
└─────────────┘     └──────────────┘     │ Strategy    │
                          │               └─────────────┘
                          ▼                     │
                    NO TRANSCRIPT          ▼──────────▼
                    ACQUISITION        Placeholder Data
```

---

## Proposed Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    ACCURACY-FIRST PIPELINE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐                                                       │
│  │ YouTube URL  │                                                       │
│  └──────┬───────┘                                                       │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ STEP 0: Transcript Acquisition (MANDATORY)           │              │
│  │                                                       │              │
│  │  1. Try Innertube API (no key needed)                │              │
│  │  2. Extract from video page HTML                      │              │
│  │  3. If FAIL → Return error, STOP                     │              │
│  └──────────────────────────┬───────────────────────────┘              │
│                             │                                           │
│                             ▼                                           │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ STEP 1: Transcript Quality Validation                │              │
│  │                                                       │              │
│  │  Check for:                                           │              │
│  │  - Entry/Setup explanation                            │              │
│  │  - Exit/TP/SL explanation                             │              │
│  │  - Timeframe/Context                                  │              │
│  │                                                       │              │
│  │  If NOT actionable → Return error, STOP              │              │
│  └──────────────────────────┬───────────────────────────┘              │
│                             │                                           │
│                             ▼                                           │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ STEP 2: Methodology Detection                        │              │
│  │                                                       │              │
│  │  Detect: indicator_based | price_action | smc |      │              │
│  │          ict | wyckoff | elliott_wave | hybrid       │              │
│  │                                                       │              │
│  │  If confidence < 70% → Return error, STOP            │              │
│  └──────────────────────────┬───────────────────────────┘              │
│                             │                                           │
│                             ▼                                           │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ STEP 3: Structured Rule Extraction                   │              │
│  │                                                       │              │
│  │  Entry Rules: { type, concept, condition }           │              │
│  │  Exit Rules: { type, value, unit, concept }          │              │
│  │  Risk Management: { rr, position_sizing, sl_logic }  │              │
│  └──────────────────────────┬───────────────────────────┘              │
│                             │                                           │
│                             ▼                                           │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ STEP 4: Actionability Gate                           │              │
│  │                                                       │              │
│  │  Minimum Requirements:                                │              │
│  │  ✓ ≥1 valid entry rule                               │              │
│  │  ✓ ≥1 valid exit rule                                │              │
│  │  ✓ Risk management defined                           │              │
│  │                                                       │              │
│  │  If NOT met → Return "blocked" status                │              │
│  └──────────────────────────┬───────────────────────────┘              │
│                             │                                           │
│                             ▼                                           │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ STEP 5: Confidence Scoring & User Warning            │              │
│  │                                                       │              │
│  │  High (≥80%): Auto-save allowed                      │              │
│  │  Medium (60-79%): Save with warning                  │              │
│  │  Low (<60%): Manual review required, no auto-save    │              │
│  └──────────────────────────┬───────────────────────────┘              │
│                             │                                           │
│                             ▼                                           │
│                   ┌─────────────────┐                                  │
│                   │ Strategy Output │                                  │
│                   └─────────────────┘                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Enhanced Type System

**File**: `src/types/backtest.ts`

Add new types for multi-methodology support:

```typescript
// Methodology taxonomy
export type TradingMethodology = 
  | 'indicator_based'
  | 'price_action' 
  | 'smc'           // Smart Money Concepts
  | 'ict'           // Inner Circle Trader
  | 'wyckoff'
  | 'elliott_wave'
  | 'hybrid';

// Concept types (SMC/ICT specific)
export type SMCConcept = 
  | 'order_block'      // OB
  | 'fair_value_gap'   // FVG
  | 'break_of_structure' // BOS
  | 'change_of_character' // ChoCH
  | 'liquidity_sweep'
  | 'mitigation_block'
  | 'premium_discount'
  | 'equilibrium'
  | 'inducement';

// Structured entry rule
export interface StructuredEntryRule {
  id: string;
  type: 'smc' | 'ict' | 'indicator' | 'price_action' | 'liquidity' | 'structure';
  concept: string;       // e.g., "order_block", "rsi_divergence"
  condition: string;     // Observable & testable
  timeframe?: string;
  is_mandatory: boolean;
}

// Enhanced import result
export interface YouTubeStrategyImportV2 {
  status: 'success' | 'warning' | 'failed' | 'blocked';
  reason?: string;
  
  // Strategy data (only if status != 'failed')
  strategy?: {
    strategyName: string;
    description: string;
    methodology: TradingMethodology;
    methodologyConfidence: number;
    
    conceptsUsed: string[];    // SMC: OB, FVG, BOS | ICT: Killzones, OTE
    indicatorsUsed: string[];  // RSI, MACD (empty for pure SMC)
    patternsUsed: string[];    // Double top, H&S, Wyckoff accumulation
    
    entryRules: StructuredEntryRule[];
    exitRules: StructuredExitRule[];
    
    riskManagement: {
      riskRewardRatio?: number;
      stopLossLogic?: string;
      positionSizing?: string;
    };
    
    timeframeContext: {
      primary: string;
      higherTF?: string;
      lowerTF?: string;
    };
    
    // Scores
    confidence: number;      // 0-100
    automationScore: number; // 0-100
    
    // Source
    sourceUrl: string;
    sourceTitle: string;
    transcriptLength?: number;
  };
  
  // Validation
  validation?: {
    isActionable: boolean;
    hasEntry: boolean;
    hasExit: boolean;
    hasRiskManagement: boolean;
    warnings: string[];
    missingElements: string[];
  };
}
```

### Phase 2: Transcript Acquisition Engine

**File**: `supabase/functions/youtube-strategy-import/transcript.ts`

Implement Innertube API method for transcript fetching:

```typescript
// Core transcript fetching logic
interface TranscriptSegment {
  text: string;
  start: number;  // seconds
  duration: number;
}

interface TranscriptResult {
  success: boolean;
  transcript?: string;
  segments?: TranscriptSegment[];
  language?: string;
  error?: string;
}

async function fetchYouTubeTranscript(videoId: string): Promise<TranscriptResult>
```

**Steps**:
1. Fetch video page HTML
2. Extract `INNERTUBE_API_KEY` from page source
3. Call YouTube's internal player API
4. Parse caption track URL from response
5. Fetch and parse caption XML
6. Convert to full transcript text

### Phase 3: AI Prompt Overhaul

**File**: `supabase/functions/youtube-strategy-import/prompts.ts`

Create comprehensive prompts for each step:

```typescript
const METHODOLOGY_DETECTION_PROMPT = `
You are a trading methodology classifier. Analyze the transcript and determine the PRIMARY methodology.

ALLOWED VALUES (pick exactly ONE):
- indicator_based: RSI, MACD, EMA crossovers, Bollinger Bands
- price_action: Candlestick patterns, support/resistance, trendlines
- smc: Smart Money Concepts (Order Blocks, FVG, BOS, ChoCH, Liquidity)
- ict: ICT methodology (Killzones, OTE, Fair Value, Market Structure)
- wyckoff: Wyckoff phases, accumulation/distribution
- elliott_wave: Wave counts, Fibonacci extensions
- hybrid: Clear combination of 2+ methodologies

RULES:
- If transcript mentions "Order Block", "Fair Value Gap", "Break of Structure" → likely SMC
- If transcript mentions "Killzone", "Optimal Trade Entry", "ICT" → likely ICT
- If only indicators like RSI, MACD mentioned → indicator_based
- If only candlestick patterns, S/R levels → price_action

Return JSON:
{
  "methodology": "<value>",
  "confidence": <0-100>,
  "evidence": ["quote1", "quote2"]
}
`;

const STRATEGY_EXTRACTION_PROMPT = `
You are a trading strategy extractor. Extract ONLY what is EXPLICITLY stated in the transcript.

STRICT RULES:
1. DO NOT invent conditions not mentioned
2. DO NOT assume indicators if not stated
3. DO NOT fill fields with generic values
4. If information is missing, leave field empty or null

For SMC/ICT strategies:
- conceptsUsed: ["order_block", "fvg", "bos", "choch", "liquidity_sweep"]
- indicatorsUsed: [] (empty if pure SMC)

For Indicator strategies:
- conceptsUsed: []
- indicatorsUsed: ["RSI", "MACD", etc.]

Entry rules MUST be structured:
{
  "type": "smc|ict|indicator|price_action|liquidity|structure",
  "concept": "specific concept name",
  "condition": "observable, testable condition"
}
`;
```

### Phase 4: Edge Function Rewrite

**File**: `supabase/functions/youtube-strategy-import/index.ts`

Complete rewrite with multi-step validation:

```typescript
serve(async (req) => {
  // Step 0: Transcript Acquisition
  const transcriptResult = await fetchYouTubeTranscript(videoId);
  if (!transcriptResult.success) {
    return errorResponse('failed', 'Unable to retrieve video transcript');
  }
  
  // Step 1: Transcript Quality Validation
  const qualityCheck = await validateTranscriptQuality(transcriptResult.transcript);
  if (!qualityCheck.hasActionableContent) {
    return errorResponse('failed', 'Transcript does not contain actionable trading rules');
  }
  
  // Step 2: Methodology Detection
  const methodology = await detectMethodology(transcriptResult.transcript);
  if (methodology.confidence < 70) {
    return errorResponse('failed', 'Unable to confidently determine trading methodology');
  }
  
  // Step 3: Strategy Extraction (methodology-aware)
  const strategy = await extractStrategy(transcriptResult.transcript, methodology);
  
  // Step 4: Actionability Gate
  const validation = validateActionability(strategy);
  if (!validation.isActionable) {
    return errorResponse('blocked', 'Strategy is not actionable or incomplete');
  }
  
  // Step 5: Confidence Scoring
  const finalStatus = strategy.confidence >= 80 ? 'success' 
                    : strategy.confidence >= 60 ? 'warning' 
                    : 'blocked';
  
  return successResponse(finalStatus, strategy, validation);
});
```

### Phase 5: Frontend Updates

**File**: `src/hooks/use-youtube-strategy-import.ts`

Handle new status types and multi-stage progress:

```typescript
export interface YouTubeImportProgress {
  stage: 'idle' | 'fetching' | 'transcribing' | 'detecting' | 'extracting' | 'validating' | 'complete' | 'error' | 'blocked' | 'warning';
  progress: number;
  message: string;
  details?: string;
}
```

**File**: `src/components/strategy/YouTubeStrategyImporter.tsx`

Updates:
1. Remove URL-only mode fallback warning
2. Add methodology badge display
3. Show confidence gates clearly
4. Display concepts vs indicators based on methodology
5. Block save button for low confidence strategies
6. Add "Manual Review Required" UI state

### Phase 6: UI Enhancements

**New Display Logic**:

```text
┌────────────────────────────────────────────────────────────────────┐
│  📺 Extracted Strategy                                              │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  [SMC]  "ICT Killzone Order Block Strategy"                  │  │
│  │         Methodology: SMC (92% confidence)                    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Concepts Used (SMC):                                              │
│  ┌────────┐ ┌─────────────┐ ┌─────┐ ┌───────────────┐            │
│  │ OB     │ │ FVG         │ │ BOS │ │ Liquidity     │            │
│  └────────┘ └─────────────┘ └─────┘ └───────────────┘            │
│                                                                     │
│  Entry Rules:                                                       │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  [SMC] Order Block                                           │  │
│  │  "Wait for price to return to bullish OB in premium zone"   │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │  [Structure] Break of Structure                              │  │
│  │  "Confirm BOS on M15 before entry"                           │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ⚠️ Indicators Used: (none - pure SMC strategy)                   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/youtube-strategy-import/transcript.ts` | Transcript acquisition via Innertube API |
| `supabase/functions/youtube-strategy-import/prompts.ts` | AI prompts for each validation step |
| `supabase/functions/youtube-strategy-import/validation.ts` | Multi-step validation logic |

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/backtest.ts` | Add new types (methodology, structured rules, v2 import) |
| `supabase/functions/youtube-strategy-import/index.ts` | Complete rewrite with pipeline |
| `src/hooks/use-youtube-strategy-import.ts` | Handle new status types, progress stages |
| `src/components/strategy/YouTubeStrategyImporter.tsx` | New UI for methodology display, confidence gates |

---

## Validation Rules Summary

| Status | Condition | User Action |
|--------|-----------|-------------|
| `failed` | No transcript / No actionable content / Low methodology confidence | Cannot proceed |
| `blocked` | Missing entry/exit/risk management | Cannot save |
| `warning` | 60-79% confidence | Can save with explicit warning |
| `success` | ≥80% confidence, all requirements met | Can save normally |

---

## Success Criteria Alignment

| Requirement | Implementation |
|-------------|----------------|
| SMC strategy never has RSI/MACD | Methodology-aware extraction; `indicatorsUsed: []` for pure SMC |
| Strategy only appears if transcript supports | Multi-step validation; fail fast on insufficient data |
| System frequently FAILs with clear reason | 5-step pipeline with explicit failure messages |
| No "looks complete but fake" strategies | No placeholder generation; strict actionability gate |

---

## Edge Cases Handled

1. **No captions available**: Return `failed` with clear message
2. **Auto-generated captions only**: Proceed but flag as lower confidence
3. **Non-English video**: Attempt translation or return unsupported
4. **Very short video (<5 min)**: Warn about potential incomplete strategy
5. **Multiple strategies in one video**: Extract primary only, note others in warnings

---

## Complexity Assessment

**High** - This is a significant rewrite involving:
- External API integration (Innertube)
- Multi-step AI pipeline
- New type system
- UI overhaul

Estimated implementation: 3-4 phases

