/**
 * Unified Gemini YouTube Strategy Extraction
 * Single-pass extraction combining:
 * 1. Video content access (via grounding)
 * 2. Methodology detection
 * 3. Strategy extraction
 * 
 * Uses enhanced prompts from prompts.ts for accuracy
 */

import {
  METHODOLOGY_DETECTION_PROMPT,
  STRATEGY_EXTRACTION_PROMPT,
} from "./prompts.ts";

export interface UnifiedExtractionResult {
  success: boolean;
  canAccessVideo: boolean;
  transcriptPreview?: string;
  transcriptWordCount?: number;
  methodology?: {
    methodology: string;
    confidence: number;
    evidence: string[];
    reasoning: string;
  };
  strategy?: ExtractedStrategyFromUnified;
  error?: string;
  rawResponse?: string; // For debugging
}

// Subset of ExtractedStrategy for unified extraction
interface ExtractedStrategyFromUnified {
  strategyName: string | null;
  description: string | null;
  conceptsUsed: string[];
  indicatorsUsed: string[];
  patternsUsed: string[];
  entryRules: Array<{
    type: string;
    concept?: string;
    condition: string;
    parameters?: Record<string, unknown>;
    sourceQuote?: string;
  }>;
  exitRules: Array<{
    type: string;
    description: string;
    parameters?: Record<string, unknown>;
    sourceQuote?: string;
  }>;
  riskManagement: {
    stopLoss?: {
      type?: string;
      value?: string;
      placement?: string;
      sourceQuote?: string;
    } | null;
    positionSizing?: {
      method?: string;
      value?: string;
      sourceQuote?: string;
    } | null;
    riskRewardRatio?: string | null;
  };
  timeframeContext: {
    primary: string | null;
    higherTF?: string | null;
    lowerTF?: string | null;
  };
  suitablePairs: string[];
  difficultyLevel: string;
  riskLevel: string;
  additionalFilters: string[];
  notes: string[];
  extractionConfidence?: {
    overall: number;
    entryClarity: number;
    exitClarity: number;
    riskClarity: number;
  };
}

/**
 * Build the unified prompt that combines all extraction steps
 * Enhanced v2.0 with comprehensive methodology classification and zero-hallucination extraction
 */
function buildUnifiedPrompt(youtubeUrl: string, videoId: string): string {
  return `You are an expert trading strategy analyst specializing in extracting actionable trading methodologies from YouTube educational content.

## OBJECTIVE

Perform a complete analysis of a YouTube trading video: access content, classify methodology, extract strategy components, and validate completeness.

## INPUT

YouTube URL: ${youtubeUrl}
Video ID: ${videoId}

## EXECUTION WORKFLOW

### PHASE 1: VIDEO ACCESS & VALIDATION

**Step 1.1: Attempt Content Retrieval**
- Fetch video transcript/captions using available tools
- If transcript unavailable, attempt to extract from video description
- Verify content contains trading-related information

**Step 1.2: Content Quality Assessment**
Evaluate retrieved content:
- ✓ **Sufficient**: 500+ words of trading strategy discussion
- ⚠ **Limited**: 100-500 words, partial strategy mentioned
- ✗ **Insufficient**: <100 words or no strategy details

**Step 1.3: Error Handling**
If content cannot be accessed, return:
{"canAccessVideo": false, "error": "CANNOT_ACCESS_VIDEO", "errorDetails": "<specific reason>", "fallbackSuggestion": "<suggest manual transcript or alternative>"}

---

### PHASE 2: METHODOLOGY CLASSIFICATION

Apply the following framework to identify the PRIMARY trading methodology:

#### Classification Matrix

**1. indicator_based**
- **Triggers**: RSI, MACD, Stochastic, Moving Averages, Bollinger Bands, ATR, CCI, ADX
- **Signals**: Mathematical calculations, crossovers, divergences, overbought/oversold
- **Language**: "indicator shows", "crossover signal", "divergence confirms"
- **Confidence Boosters**: Specific parameters mentioned (e.g., "RSI 14", "50 EMA")

**2. price_action**
- **Triggers**: Candlestick patterns, support/resistance, trendlines, chart patterns, naked charts
- **Signals**: Pin bars, engulfing, doji, hammers, head & shoulders, triangles
- **Language**: "price action", "candle formation", "rejection", "wick", "body"
- **Confidence Boosters**: Multiple pattern types, rejection levels, no indicator mentions

**3. smc** (Smart Money Concepts)
- **Triggers**: Order Block (OB), Fair Value Gap (FVG), Imbalance, Break of Structure (BOS), Change of Character (ChoCH)
- **Signals**: Liquidity sweeps, premium/discount zones, displacement, mitigation
- **Language**: "order block", "fair value gap", "imbalance", "liquidity grab", "institutional"
- **Confidence Boosters**: SMC-specific terminology, structure shift analysis

**4. ict** (Inner Circle Trader)
- **Triggers**: Killzone, Optimal Trade Entry (OTE), PD Arrays, IPDA, Silver Bullet, Judas Swing
- **Signals**: Time-based entries, algorithmic delivery, session-specific setups
- **Language**: "killzone", "New York session", "London open", "OTE 0.62-0.79", "fair value"
- **Confidence Boosters**: ICT creator mention, time-specific strategies, algorithmic concepts

**5. wyckoff**
- **Triggers**: Accumulation, Distribution, Spring, Upthrust, Phases (A-E)
- **Signals**: Volume analysis, cause & effect, composite operator, buying/selling climax
- **Language**: "accumulation phase", "spring", "markup", "composite man", "effort vs result"
- **Confidence Boosters**: Phase identification, volume correlation, Wyckoff terminology

**6. elliott_wave**
- **Triggers**: Wave counts (1-2-3-4-5), Impulse/Corrective, A-B-C corrections
- **Signals**: Fibonacci extensions (1.618, 2.618), wave relationships, fractals
- **Language**: "wave 3", "impulse wave", "corrective pattern", "fibonacci extension"
- **Confidence Boosters**: Specific wave counts, fibonacci ratios, fractal analysis

**7. hybrid**
- **Triggers**: Explicit combination of 2+ distinct methodologies
- **Signals**: "I use SMC with RSI confirmation", "ICT killzones + EMA filter"
- **Language**: "combine", "together with", "also use", "in addition to"
- **Criteria**: Equal weighting of multiple frameworks (not just confirmation filters)

#### Decision Tree
1. Scan for ICT/SMC-specific terms (highest priority - most distinctive)
2. If found → Classify as ICT or SMC
3. If not → Count methodology mentions across transcript
4. If multiple tied → Choose most specialized (order: ICT > SMC > Elliott > Wyckoff > Price Action > Indicators)
5. If 2+ methodologies equally weighted → Hybrid

#### Confidence Calibration
- **95-100**: Methodology explicitly named + 5+ specific terms + clear examples
- **85-94**: 3-4 specific terms + methodology clearly dominant
- **70-84**: 2-3 terms + consistent approach, minor ambiguity
- **50-69**: 1-2 terms + some conflicting signals
- **Below 50**: Insufficient or highly mixed signals

---

### PHASE 3: COMPREHENSIVE STRATEGY EXTRACTION

Extract trading strategy using ZERO-HALLUCINATION principles:

#### Extraction Guidelines
**CORE RULE**: If information is not explicitly stated in the video, use null, [], or "not_specified"
**Evidence Requirement**: Every extracted element MUST link to a source quote from the transcript

#### Entry Rules Structure
Each entry rule:
{
  "ruleNumber": 1,
  "type": "smc|ict|indicator|price_action|liquidity|structure|time|confluence",
  "concept": "<specific concept name>",
  "condition": "<testable, observable condition>",
  "parameters": {},
  "priority": "required|preferred|optional",
  "sourceQuote": "<exact transcript text>",
  "timestamp": "<video timestamp if available>"
}

#### Exit Rules Structure
{
  "exitNumber": 1,
  "type": "fixed_target|risk_reward|structure|indicator|trailing|time_based",
  "description": "<clear exit condition>",
  "parameters": {},
  "partialExit": true|false,
  "percentageOfPosition": <0-100 if partial>,
  "sourceQuote": "<exact text>",
  "timestamp": "<if available>"
}

#### Risk Management Structure
{
  "stopLoss": {
    "type": "fixed_points|atr_multiple|structure|percentage|not_specified",
    "placement": "<description>",
    "value": "<specific value if given>",
    "sourceQuote": "<exact text>"
  },
  "positionSizing": {
    "method": "fixed_percentage|fixed_lots|risk_amount|not_specified",
    "value": "<specific value>",
    "sourceQuote": "<exact text>"
  },
  "riskRewardRatio": {
    "minimum": "<e.g., 1:2>",
    "target": "<e.g., 1:5>",
    "sourceQuote": "<exact text>"
  }
}

---

### PHASE 4: VALIDATION & QUALITY ASSURANCE

#### Completeness Check
- Every extracted field has a sourceQuote (except metadata)
- No "typical" or "standard" values filled in without evidence
- All arrays contain only explicitly mentioned items
- Contradictions noted in notes field

#### Confidence Scoring
{
  "extractionQuality": {
    "overallConfidence": <0-100>,
    "entryRulesClarity": <0-100>,
    "exitRulesClarity": <0-100>,
    "riskManagementClarity": <0-100>,
    "reproducibility": <0-100>
  },
  "informationGaps": ["<missing info>"],
  "ambiguities": ["<unclear statements>"],
  "notes": ["<additional context>"]
}

---

## FINAL OUTPUT FORMAT

Return a single JSON object (NO markdown code blocks):

{
  "canAccessVideo": true,
  "transcriptPreview": "<first 500 chars of what you heard>",
  "transcriptWordCount": <word count>,
  
  "methodology": {
    "methodology": "<indicator_based|price_action|smc|ict|wyckoff|elliott_wave|hybrid>",
    "confidence": <0-100>,
    "evidence": ["<quote 1>", "<quote 2>", "<quote 3>"],
    "reasoning": "<explanation>",
    "secondaryElements": ["<supporting methodologies>"],
    "terminologyScore": {
      "indicator_based": <0-10>,
      "price_action": <0-10>,
      "smc": <0-10>,
      "ict": <0-10>,
      "wyckoff": <0-10>,
      "elliott_wave": <0-10>
    }
  },
  
  "strategy": {
    "strategyName": "<name or null>",
    "description": "<brief description>",
    "tradingStyle": "scalping|day_trading|swing_trading|position|not_specified",
    "conceptsUsed": [],
    "indicatorsUsed": [],
    "patternsUsed": [],
    "confluenceFactors": [],
    
    "entryRules": [
      {
        "ruleNumber": 1,
        "type": "<type>",
        "concept": "<concept>",
        "condition": "<condition>",
        "parameters": {},
        "priority": "required|preferred|optional",
        "sourceQuote": "<quote>"
      }
    ],
    
    "exitRules": [
      {
        "exitNumber": 1,
        "type": "<type>",
        "description": "<description>",
        "parameters": {},
        "partialExit": false,
        "percentageOfPosition": 100,
        "sourceQuote": "<quote>"
      }
    ],
    
    "riskManagement": {
      "stopLoss": null,
      "positionSizing": null,
      "riskRewardRatio": null
    },
    
    "timeframeContext": {
      "primary": null,
      "higherTF": null,
      "lowerTF": null
    },
    
    "sessionPreference": null,
    "suitablePairs": [],
    "difficultyLevel": "beginner|intermediate|advanced",
    "riskLevel": "low|medium|high",
    
    "tradeFilters": [],
    "marketConditions": {
      "preferred": [],
      "avoid": []
    },
    
    "additionalFilters": [],
    "notes": []
  },
  
  "validation": {
    "extractionQuality": {
      "overall": <0-100>,
      "entryClarity": <0-100>,
      "exitClarity": <0-100>,
      "riskClarity": <0-100>,
      "reproducibility": <0-100>
    },
    "informationGaps": [],
    "ambiguities": [],
    "notes": []
  }
}

---

## ERROR HANDLING

If any phase fails, return:
{
  "canAccessVideo": false,
  "error": "CANNOT_ACCESS_VIDEO|INSUFFICIENT_CONTENT|PARSING_ERROR|NO_STRATEGY_FOUND",
  "errorDetails": "<specific description>",
  "partialData": {},
  "recommendedAction": "<suggestion for user>",
  "fallbackOptions": ["<alternative approaches>"]
}

---

## QUALITY PRINCIPLES

1. **Accuracy > Completeness**: Better to leave fields empty than fill with assumptions
2. **Evidence-Based**: Every claim must trace to transcript
3. **Preserve Ambiguity**: If creator is vague, note it - don't clarify
4. **Capture Contradictions**: If multiple conflicting statements, document both
5. **Conservative Classification**: When uncertain between methodologies, choose broader category
6. **User-Centric**: Output should enable someone to recreate the strategy from JSON alone

---

Begin analysis now.`;
}

/**
 * Parse the AI response with robust error handling
 */
function parseUnifiedResponse(content: string): UnifiedExtractionResult {
  // Clean markdown code blocks if present
  let cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
  
  // Try to find JSON object boundaries
  const jsonStart = cleanContent.indexOf('{');
  const jsonEnd = cleanContent.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleanContent = cleanContent.slice(jsonStart, jsonEnd + 1);
  }
  
  try {
    const parsed = JSON.parse(cleanContent);
    
    // Check for explicit error response
    if (parsed.error === "CANNOT_ACCESS_VIDEO") {
      return {
        success: false,
        canAccessVideo: false,
        error: "Gemini cannot access YouTube video content through API",
        rawResponse: content.slice(0, 500),
      };
    }
    
    // Validate required fields
    if (typeof parsed.canAccessVideo !== 'boolean') {
      return {
        success: false,
        canAccessVideo: false,
        error: "Invalid response format: missing canAccessVideo",
        rawResponse: content.slice(0, 500),
      };
    }
    
    if (!parsed.canAccessVideo) {
      return {
        success: false,
        canAccessVideo: false,
        error: "AI indicated it cannot access the video",
        rawResponse: content.slice(0, 500),
      };
    }
    
    // Validate methodology
    if (!parsed.methodology?.methodology || typeof parsed.methodology.confidence !== 'number') {
      return {
        success: false,
        canAccessVideo: true,
        transcriptPreview: parsed.transcriptPreview?.slice(0, 500),
        error: "Invalid response format: missing methodology detection",
        rawResponse: content.slice(0, 500),
      };
    }
    
    // Validate strategy
    if (!parsed.strategy) {
      return {
        success: false,
        canAccessVideo: true,
        transcriptPreview: parsed.transcriptPreview?.slice(0, 500),
        methodology: parsed.methodology,
        error: "Invalid response format: missing strategy extraction",
        rawResponse: content.slice(0, 500),
      };
    }
    
    return {
      success: true,
      canAccessVideo: true,
      transcriptPreview: parsed.transcriptPreview?.slice(0, 500) || '',
      transcriptWordCount: parsed.transcriptWordCount || 0,
      methodology: {
        methodology: parsed.methodology.methodology,
        confidence: parsed.methodology.confidence,
        evidence: parsed.methodology.evidence || [],
        reasoning: parsed.methodology.reasoning || '',
      },
      strategy: parsed.strategy,
    };
    
  } catch (parseError) {
    console.error('[Unified Extract] JSON parse failed:', parseError);
    
    // Check for common failure patterns in the raw text
    if (
      content.includes("CANNOT_ACCESS_VIDEO") ||
      content.includes("cannot access") ||
      content.includes("unable to access") ||
      content.includes("I don't have access")
    ) {
      return {
        success: false,
        canAccessVideo: false,
        error: "Gemini cannot access YouTube video content",
        rawResponse: content.slice(0, 500),
      };
    }
    
    return {
      success: false,
      canAccessVideo: false,
      error: `Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
      rawResponse: content.slice(0, 500),
    };
  }
}

/**
 * Unified Gemini extraction - single API call for full strategy extraction
 */
export async function unifiedGeminiExtraction(
  youtubeUrl: string,
  videoId: string,
  apiKey: string
): Promise<UnifiedExtractionResult> {
  try {
    console.log(`[Unified Extract] Starting unified extraction for: ${videoId}`);
    
    const prompt = buildUnifiedPrompt(youtubeUrl, videoId);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro", // Pro model for better grounding capability
        messages: [
          { role: "user", content: prompt },
        ],
        temperature: 0.2, // Low for accuracy
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Unified Extract] API error: ${response.status} - ${errorText}`);
      
      if (response.status === 429) {
        return {
          success: false,
          canAccessVideo: false,
          error: "Rate limit exceeded. Please try again later.",
        };
      }
      if (response.status === 402) {
        return {
          success: false,
          canAccessVideo: false,
          error: "AI credits exhausted. Please add funds.",
        };
      }
      
      return {
        success: false,
        canAccessVideo: false,
        error: `API error: ${response.status}`,
      };
    }
    
    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";
    
    console.log(`[Unified Extract] Response length: ${content.length} chars`);
    console.log(`[Unified Extract] First 300 chars: ${content.substring(0, 300)}`);
    
    // Check for very short responses
    if (content.length < 100) {
      return {
        success: false,
        canAccessVideo: false,
        error: "Response too short - likely grounding failed",
        rawResponse: content,
      };
    }
    
    // Parse and validate the response
    const result = parseUnifiedResponse(content);
    
    console.log(`[Unified Extract] Parse result - success: ${result.success}, canAccess: ${result.canAccessVideo}, confidence: ${result.methodology?.confidence || 0}`);
    
    return result;
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Unified Extract] Error: ${message}`);
    return {
      success: false,
      canAccessVideo: false,
      error: message,
    };
  }
}
