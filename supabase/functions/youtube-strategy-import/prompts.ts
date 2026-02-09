/**
 * AI Prompts for YouTube Strategy Import
 * Multi-step validation pipeline prompts
 */

export const METHODOLOGY_DETECTION_PROMPT = `You are a trading methodology classifier. Analyze the video transcript and determine the PRIMARY trading methodology being taught.

ALLOWED VALUES (pick exactly ONE):
- indicator_based: Strategies using RSI, MACD, EMA crossovers, Bollinger Bands, Stochastic, etc.
- price_action: Candlestick patterns, support/resistance, trendlines, naked charts
- smc: Smart Money Concepts (Order Blocks, FVG, BOS, ChoCH, Liquidity, Mitigation)
- ict: ICT methodology (Killzones, Optimal Trade Entry, Fair Value Gap, Market Structure Shift)
- wyckoff: Wyckoff phases, accumulation/distribution, spring, upthrust
- elliott_wave: Wave counts, impulse waves, corrective patterns, Fibonacci extensions
- hybrid: Clear combination of 2+ distinct methodologies

DETECTION RULES:
- If transcript mentions "Order Block", "OB", "Fair Value Gap", "FVG", "Break of Structure", "BOS", "Change of Character", "ChoCH", "Liquidity", "Smart Money" → likely SMC
- If transcript mentions "Killzone", "London Open", "New York Open", "Optimal Trade Entry", "OTE", "ICT", "Inner Circle Trader" → likely ICT
- If ONLY indicators like RSI, MACD, EMA, VWAP are mentioned without SMC concepts → indicator_based
- If ONLY candlestick patterns, support/resistance, trendlines without indicators or SMC → price_action
- If explicit mention of "accumulation", "distribution", "spring", "upthrust", "Wyckoff" → wyckoff
- If explicit mention of "wave 1-5", "ABC correction", "impulse wave", "Elliott" → elliott_wave

IMPORTANT:
- Do NOT default to indicator_based
- If you cannot determine with high confidence, return confidence < 70
- Look for explicit methodology keywords, not assumptions

Return ONLY valid JSON (no markdown):
{
  "methodology": "<one of the allowed values>",
  "confidence": <0-100>,
  "evidence": ["direct quote 1", "direct quote 2", "direct quote 3"]
}`;

export const STRATEGY_EXTRACTION_PROMPT = `You are a trading strategy extractor. Your job is to extract ONLY what is EXPLICITLY stated in the video transcript. This is for a financial trading system - accuracy is critical.

STRICT RULES:
1. DO NOT invent conditions that are not mentioned
2. DO NOT assume indicators if they are not stated
3. DO NOT fill fields with generic placeholder values
4. If information is missing, leave the field empty or null
5. Only extract what the speaker explicitly says

METHODOLOGY-SPECIFIC GUIDANCE:

For SMC (Smart Money Concepts) strategies:
- conceptsUsed should include: ["order_block", "fair_value_gap", "break_of_structure", "change_of_character", "liquidity_sweep", "mitigation_block", "premium_discount", "equilibrium", "inducement"]
- indicatorsUsed should be [] (empty) unless indicators are explicitly mentioned
- Patterns might include: ["bullish_ob", "bearish_ob", "bullish_fvg", "bearish_fvg"]

For ICT strategies:
- conceptsUsed should include: ["killzone", "optimal_trade_entry", "market_structure_shift", "liquidity_pool", "fair_value", "displacement", "judas_swing"]
- indicatorsUsed should be [] (empty) unless indicators are explicitly mentioned

For Indicator-based strategies:
- conceptsUsed should be []
- indicatorsUsed should list actual indicators: ["RSI", "MACD", "EMA", "SMA", "Bollinger Bands", etc.]

ENTRY RULES FORMAT (each rule must be structured):
{
  "type": "smc" | "ict" | "indicator" | "price_action" | "liquidity" | "structure",
  "concept": "specific concept name (e.g., order_block, rsi_divergence, support_resistance)",
  "condition": "Observable, testable condition from the transcript",
  "is_mandatory": true/false
}

EXIT RULES FORMAT:
{
  "type": "take_profit" | "stop_loss" | "trailing_stop" | "time_based",
  "value": <number or null if not specified>,
  "unit": "percent" | "atr" | "rr" | "pips" | null,
  "concept": "Description of exit logic"
}

TIMEFRAME CONTEXT:
- primary: The main execution timeframe
- higherTF: Higher timeframe for bias (if mentioned)
- lowerTF: Lower timeframe for entry (if mentioned)

Return ONLY valid JSON (no markdown):
{
  "strategyName": "Name derived from content",
  "description": "Brief description of the strategy",
  "methodology": "<the detected methodology>",
  
  "conceptsUsed": [],
  "indicatorsUsed": [],
  "patternsUsed": [],
  
  "entryRules": [],
  "exitRules": [],
  
  "riskManagement": {
    "riskRewardRatio": <number or null>,
    "stopLossLogic": "Description or null",
    "positionSizing": "Description or null"
  },
  
  "timeframeContext": {
    "primary": "e.g., 1h, 15m, 4h",
    "higherTF": "e.g., 4h, D1 or null",
    "lowerTF": "e.g., 5m, 1m or null"
  },
  
  "suitablePairs": [],
  "difficultyLevel": "beginner" | "intermediate" | "advanced",
  "riskLevel": "low" | "medium" | "high"
}`;

export function buildExtractionPrompt(transcript: string, methodology: string, confidence: number): string {
  return `${STRATEGY_EXTRACTION_PROMPT}

DETECTED METHODOLOGY: ${methodology} (${confidence}% confidence)

VIDEO TRANSCRIPT:
---
${transcript}
---

Extract the trading strategy following the rules above. Remember: accuracy over completeness.`;
}

export function buildMethodologyPrompt(transcript: string): string {
  return `${METHODOLOGY_DETECTION_PROMPT}

VIDEO TRANSCRIPT:
---
${transcript.slice(0, 8000)}
---

Analyze and classify the trading methodology.`;
}
