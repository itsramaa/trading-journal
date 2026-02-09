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
 */
function buildUnifiedPrompt(youtubeUrl: string, videoId: string): string {
  return `You are an expert trading strategy analyst. Your task is to analyze a YouTube video and extract a complete, actionable trading strategy.

## VIDEO TO ANALYZE
YouTube URL: ${youtubeUrl}
Video ID: ${videoId}

## STEP 1: VIDEO CONTENT ACCESS (CRITICAL)

You MUST access and analyze the actual video content. This is a YouTube trading education video.
Listen to the complete audio and identify all trading-related information spoken in the video.

If you cannot access the video content, respond with ONLY this JSON:
{"error": "CANNOT_ACCESS_VIDEO"}

Do NOT:
- Return generic trading advice
- Make up content
- Summarize without actual video content
- Search the web for unrelated content

## STEP 2: METHODOLOGY CLASSIFICATION

${METHODOLOGY_DETECTION_PROMPT}

## STEP 3: STRATEGY EXTRACTION

${STRATEGY_EXTRACTION_PROMPT}

## UNIFIED OUTPUT FORMAT

Return a single JSON object (no markdown code blocks):
{
  "canAccessVideo": true,
  "transcriptPreview": "<first 500 characters of what you heard in the video>",
  "transcriptWordCount": <estimated word count>,
  "methodology": {
    "methodology": "<exactly one of: indicator_based|price_action|smc|ict|wyckoff|elliott_wave|hybrid>",
    "confidence": <integer 0-100>,
    "evidence": ["quote1", "quote2", "quote3"],
    "reasoning": "explanation"
  },
  "strategy": {
    "strategyName": "<name or null>",
    "description": "<brief description>",
    "conceptsUsed": [],
    "indicatorsUsed": [],
    "patternsUsed": [],
    "entryRules": [
      {
        "type": "smc|ict|indicator|price_action|liquidity|structure|time|confluence",
        "concept": "<specific concept>",
        "condition": "<testable condition>",
        "parameters": {},
        "sourceQuote": "<exact quote>"
      }
    ],
    "exitRules": [
      {
        "type": "fixed_target|risk_reward|structure|indicator|trailing",
        "description": "<exit condition>",
        "parameters": {},
        "sourceQuote": "<exact quote>"
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
    "suitablePairs": [],
    "difficultyLevel": "beginner|intermediate|advanced",
    "riskLevel": "low|medium|high",
    "additionalFilters": [],
    "notes": [],
    "extractionConfidence": {
      "overall": <0-100>,
      "entryClarity": <0-100>,
      "exitClarity": <0-100>,
      "riskClarity": <0-100>
    }
  }
}

## CRITICAL REQUIREMENTS

1. transcriptPreview MUST contain actual words spoken in the video, NOT a summary
2. All sourceQuote fields must be exact phrases from the video
3. Do NOT invent rules or conditions not mentioned in the video
4. If information is missing, use null or empty arrays
5. methodology.evidence must be direct quotes from the video
6. If the video is not about trading, set methodology.confidence to 0

Now analyze the YouTube video and extract the trading strategy.`;
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
