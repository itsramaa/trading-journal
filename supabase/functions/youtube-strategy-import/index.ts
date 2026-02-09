import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  fetchYouTubeTranscript, 
  extractVideoId, 
  validateTranscriptQuality 
} from "./transcript.ts";
import { 
  buildMethodologyPrompt, 
  buildExtractionPrompt 
} from "./prompts.ts";
import {
  validateActionability,
  calculateFinalConfidence,
  determineImportStatus,
  generateStatusReason,
  normalizeRules,
  type ExtractedStrategy,
  type ImportStatus,
  type ExtractionConfidence,
} from "./validation.ts";
import {
  transcribeWithGemini,
  transcribeWithGeminiGrounding,
} from "./gemini-transcribe.ts";
import {
  unifiedGeminiExtraction,
  type UnifiedExtractionResult,
} from "./gemini-unified-extract.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface YouTubeImportRequest {
  url?: string;
  transcript?: string;
}

interface MethodologyDetectionResult {
  methodology: string;
  confidence: number;
  evidence: string[];
  reasoning?: string; // New field from enhanced prompt
}

// Debug step interface for tracking processing
interface DebugStep {
  step: string;
  status: 'success' | 'warning' | 'failed' | 'skipped';
  details: string;
  timestamp?: string;
}

// Debug info interface for transparency
interface DebugInfo {
  transcriptSource: 'gemini' | 'youtube_captions' | 'manual' | 'unknown';
  transcriptLength: number;
  transcriptPreview: string;
  methodologyRaw?: {
    methodology: string;
    confidence: number;
    evidence: string[];
    reasoning?: string;
    secondaryElements?: string[];
    terminologyScore?: {
      indicator_based: number;
      price_action: number;
      smc: number;
      ict: number;
      wyckoff: number;
      elliott_wave: number;
    };
  };
  extractionQuality?: {
    overall: number;
    entryClarity: number;
    exitClarity: number;
    riskClarity: number;
    reproducibility?: number;
  };
  informationGaps?: string[];
  ambiguities?: string[];
  processingSteps: DebugStep[];
}

/**
 * Create error response with proper status and debug info
 */
function errorResponse(
  status: ImportStatus, 
  reason: string, 
  videoTitle?: string,
  debugInfo?: DebugInfo
) {
  return new Response(
    JSON.stringify({
      status,
      reason,
      strategy: null,
      validation: null,
      videoTitle,
      debug: debugInfo || null,
    }),
    { 
      status: status === 'failed' ? 400 : 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
}

/**
 * Call AI for methodology detection
 */
async function detectMethodology(
  transcript: string, 
  apiKey: string
): Promise<MethodologyDetectionResult | null> {
  const prompt = buildMethodologyPrompt(transcript);
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "user", content: prompt },
      ],
      temperature: 0.3, // Lower for more consistent classification
    }),
  });

  if (!response.ok) {
    console.error("Methodology detection failed:", response.status);
    return null;
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices?.[0]?.message?.content || "";
  
  try {
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanContent) as MethodologyDetectionResult;
  } catch {
    console.error("Failed to parse methodology response:", content);
    return null;
  }
}

/**
 * Call AI for strategy extraction
 */
async function extractStrategy(
  transcript: string,
  methodology: string,
  confidence: number,
  apiKey: string
): Promise<ExtractedStrategy | null> {
  const prompt = buildExtractionPrompt(transcript, methodology, confidence);
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    console.error("Strategy extraction failed:", response.status);
    return null;
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices?.[0]?.message?.content || "";
  
  try {
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanContent) as ExtractedStrategy;
  } catch (e) {
    console.error("Failed to parse strategy response:", content);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, transcript: manualTranscript } = await req.json() as YouTubeImportRequest;
    
    if (!url && !manualTranscript) {
      return errorResponse('failed', 'URL or transcript is required');
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // ================================================================
    // Initialize Debug Info
    // ================================================================
    const debugSteps: DebugStep[] = [];
    let transcriptSource: DebugInfo['transcriptSource'] = 'unknown';
    let transcriptPreview = '';

    // ================================================================
    // STEP 0: Transcript Acquisition (MANDATORY)
    // Priority: 1) Manual transcript, 2) Gemini direct, 3) YouTube caption API
    // ================================================================
    let transcript: string;
    let videoTitle: string | undefined;
    let isAutoGenerated = false;
    let transcriptWordCount = 0;

    if (manualTranscript) {
      // User provided transcript manually
      transcript = manualTranscript;
      transcriptWordCount = transcript.split(/\s+/).filter(w => w.length > 0).length;
      transcriptSource = 'manual';
      transcriptPreview = transcript.slice(0, 500);
      debugSteps.push({
        step: 'transcript_acquisition',
        status: 'success',
        details: `Manual input: ${transcriptWordCount} words`,
      });
      console.log(`[Transcript] Using manual transcript: ${transcriptWordCount} words`);
    } else if (url) {
      // Extract video ID
      const videoId = extractVideoId(url);
      if (!videoId) {
        debugSteps.push({
          step: 'transcript_acquisition',
          status: 'failed',
          details: 'Invalid YouTube URL format',
        });
        return errorResponse('failed', 'Invalid YouTube URL format', undefined, {
          transcriptSource: 'unknown',
          transcriptLength: 0,
          transcriptPreview: '',
          processingSteps: debugSteps,
        });
      }

      console.log(`[Import] Processing video ID: ${videoId}`);

      // ================================================================
      // PRIMARY: Try Unified Gemini Extraction (single-pass)
      // This combines transcript access + methodology + strategy in one call
      // ================================================================
      console.log('[Import] Attempting unified Gemini extraction...');
      const unifiedResult = await unifiedGeminiExtraction(url, videoId, LOVABLE_API_KEY);
      
      if (unifiedResult.success && unifiedResult.methodology && unifiedResult.strategy) {
        console.log(`[Import] Unified extraction SUCCESS - ${unifiedResult.methodology.methodology} @ ${unifiedResult.methodology.confidence}%`);
        
        // Unified extraction succeeded - use the results directly
        debugSteps.push({
          step: 'unified_extraction',
          status: 'success',
          details: `Single-pass extraction: ${unifiedResult.methodology.methodology} @ ${unifiedResult.methodology.confidence}% confidence`,
        });
        
        transcriptSource = 'gemini';
        transcriptPreview = unifiedResult.transcriptPreview || '';
        transcriptWordCount = unifiedResult.transcriptWordCount || transcriptPreview.split(/\s+/).length;
        
        // Build debug info for unified response with enhanced fields
        const unifiedDebugInfo: DebugInfo = {
          transcriptSource,
          transcriptLength: transcriptWordCount,
          transcriptPreview,
          methodologyRaw: {
            ...unifiedResult.methodology,
            secondaryElements: (unifiedResult.methodology as any).secondaryElements,
            terminologyScore: (unifiedResult.methodology as any).terminologyScore,
          },
          extractionQuality: unifiedStrategy.extractionConfidence ? {
            overall: unifiedStrategy.extractionConfidence.overall,
            entryClarity: unifiedStrategy.extractionConfidence.entryClarity,
            exitClarity: unifiedStrategy.extractionConfidence.exitClarity,
            riskClarity: unifiedStrategy.extractionConfidence.riskClarity,
            reproducibility: (unifiedStrategy.extractionConfidence as any).reproducibility,
          } : undefined,
          informationGaps: (unifiedResult.strategy as any)?.validation?.informationGaps,
          ambiguities: (unifiedResult.strategy as any)?.validation?.ambiguities,
          processingSteps: debugSteps,
        };
        
        // Check confidence threshold
        if (unifiedResult.methodology.confidence < 60) {
          debugSteps.push({
            step: 'methodology_validation',
            status: 'failed',
            details: `Confidence too low: ${unifiedResult.methodology.confidence}%`,
          });
          return errorResponse(
            'blocked',
            `Unable to confidently determine trading methodology (${unifiedResult.methodology.confidence}% confidence). The video may not describe a clear trading strategy.`,
            undefined,
            unifiedDebugInfo
          );
        }
        
        // Use extracted strategy directly
        const unifiedStrategy = unifiedResult.strategy;
        
        // Add IDs to rules if missing
        const normalizedEntryRules = (unifiedStrategy.entryRules || []).map((rule, idx) => ({
          ...rule,
          id: `entry_${idx}`,
          is_mandatory: idx < 2, // First 2 rules are mandatory
        }));
        
        const normalizedExitRules = (unifiedStrategy.exitRules || []).map((rule, idx) => ({
          ...rule,
          id: `exit_${idx}`,
        }));
        
        // Calculate actionability
        const hasEntry = normalizedEntryRules.length > 0;
        const hasExit = normalizedExitRules.length > 0;
        const hasRiskManagement = !!(
          unifiedStrategy.riskManagement?.stopLoss ||
          unifiedStrategy.riskManagement?.positionSizing ||
          unifiedStrategy.riskManagement?.riskRewardRatio
        );
        
        const actionabilityScore = (hasEntry ? 40 : 0) + (hasExit ? 30 : 0) + (hasRiskManagement ? 30 : 0);
        const isActionable = hasEntry && (hasExit || hasRiskManagement);
        
        const missingElements: string[] = [];
        if (!hasEntry) missingElements.push('entry_rules');
        if (!hasExit) missingElements.push('exit_rules');
        if (!hasRiskManagement) missingElements.push('risk_management');
        
        // Calculate final confidence
        const extractionConfidence = unifiedStrategy.extractionConfidence?.overall || 70;
        const finalConfidence = Math.round(
          (unifiedResult.methodology.confidence * 0.4) +
          (actionabilityScore * 0.3) +
          (extractionConfidence * 0.3)
        );
        
        // Determine status
        let importStatus: ImportStatus = 'success';
        if (finalConfidence < 50 || !isActionable) {
          importStatus = 'blocked';
        } else if (finalConfidence < 70 || missingElements.length > 1) {
          importStatus = 'review';
        }
        
        // Calculate automation score
        let automationScore = 50;
        if (normalizedEntryRules.length >= 2) automationScore += 10;
        if (normalizedEntryRules.length >= 3) automationScore += 5;
        if (normalizedExitRules.length > 0) automationScore += 10;
        if (unifiedResult.methodology.methodology === 'indicator_based') automationScore += 15;
        if (unifiedResult.methodology.methodology === 'smc' || unifiedResult.methodology.methodology === 'ict') automationScore -= 10;
        automationScore = Math.max(0, Math.min(100, automationScore));
        
        debugSteps.push({
          step: 'validation',
          status: isActionable ? 'success' : 'warning',
          details: `Actionability: ${actionabilityScore}%, ${missingElements.length} missing elements`,
        });
        
        // Build response
        const response = {
          status: importStatus,
          reason: importStatus === 'success' 
            ? 'Strategy extracted successfully via unified Gemini analysis'
            : importStatus === 'review'
            ? 'Strategy needs review - some elements may be incomplete'
            : 'Strategy extraction incomplete - missing key elements',
          strategy: {
            strategyName: unifiedStrategy.strategyName || 'Imported Strategy',
            description: unifiedStrategy.description || '',
            methodology: unifiedResult.methodology.methodology,
            methodologyConfidence: unifiedResult.methodology.confidence,
            methodologyReasoning: unifiedResult.methodology.reasoning || '',
            
            conceptsUsed: unifiedStrategy.conceptsUsed || [],
            indicatorsUsed: unifiedStrategy.indicatorsUsed || [],
            patternsUsed: unifiedStrategy.patternsUsed || [],
            
            entryRules: normalizedEntryRules,
            exitRules: normalizedExitRules,
            
            // Parse riskRewardRatio string "1:2" to number 2.0
            riskManagement: {
              ...unifiedStrategy.riskManagement,
              riskRewardRatio: parseRiskRewardRatio(unifiedStrategy.riskManagement?.riskRewardRatio),
            },
            timeframeContext: unifiedStrategy.timeframeContext || { primary: '1h' },
            
            suitablePairs: unifiedStrategy.suitablePairs || [],
            difficultyLevel: unifiedStrategy.difficultyLevel || 'intermediate',
            riskLevel: unifiedStrategy.riskLevel || 'medium',
            
            confidence: finalConfidence,
            automationScore,
            
            additionalFilters: unifiedStrategy.additionalFilters || [],
            notes: unifiedStrategy.notes || [],
            extractionConfidence: unifiedStrategy.extractionConfidence || null,
            
            sourceUrl: url,
            sourceTitle: '',
            transcriptLength: transcriptWordCount,
          },
          validation: {
            isActionable,
            hasEntry,
            hasExit,
            hasRiskManagement,
            warnings: [],
            missingElements,
            score: actionabilityScore,
          },
          debug: unifiedDebugInfo,
        };
        
        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // ================================================================
      // FALLBACK: Unified extraction failed - try traditional pipeline
      // ================================================================
      console.log(`[Import] Unified extraction failed: ${unifiedResult.error || 'Unknown error'}`);
      debugSteps.push({
        step: 'unified_extraction',
        status: 'failed',
        details: unifiedResult.error || 'Gemini could not access video content',
      });
      
      // Try Gemini direct transcription
      console.log('[Import] Fallback: Attempting Gemini direct transcription...');
      const geminiResult = await transcribeWithGemini(url, LOVABLE_API_KEY);
      
      if (geminiResult.success && geminiResult.transcript) {
        console.log(`[Import] Gemini transcription SUCCESS via ${geminiResult.method}`);
        transcript = geminiResult.transcript;
        transcriptWordCount = transcript.split(/\s+/).filter(w => w.length > 0).length;
        transcriptSource = 'gemini';
        transcriptPreview = transcript.slice(0, 500);
        isAutoGenerated = false;
        debugSteps.push({
          step: 'transcript_acquisition',
          status: 'success',
          details: `Gemini direct: ${transcriptWordCount} words`,
        });
      } else {
        console.log(`[Import] Gemini direct failed: ${geminiResult.error}`);
        debugSteps.push({
          step: 'gemini_direct',
          status: 'failed',
          details: geminiResult.error || 'Unable to fetch transcript',
        });
        
        // Fallback to YouTube caption API
        console.log('[Import] Fallback: Trying YouTube caption API...');
        const transcriptResult = await fetchYouTubeTranscript(videoId);
        videoTitle = transcriptResult.videoTitle;
        
        if (!transcriptResult.success || !transcriptResult.transcript) {
          debugSteps.push({
            step: 'transcript_acquisition',
            status: 'failed',
            details: transcriptResult.error || 'All transcript methods failed',
          });
          
          return errorResponse(
            'failed', 
            `Unable to retrieve video transcript. ${transcriptResult.error || ''} Please copy the transcript from YouTube manually.`,
            videoTitle,
            {
              transcriptSource: 'unknown',
              transcriptLength: 0,
              transcriptPreview: '',
              processingSteps: debugSteps,
            }
          );
        }

        transcript = transcriptResult.transcript;
        isAutoGenerated = transcriptResult.isAutoGenerated || false;
        transcriptWordCount = transcript.split(/\s+/).filter(w => w.length > 0).length;
        transcriptSource = 'youtube_captions';
        transcriptPreview = transcript.slice(0, 500);
        debugSteps.push({
          step: 'transcript_acquisition',
          status: 'success',
          details: `YouTube captions${isAutoGenerated ? ' (auto-generated)' : ''}: ${transcriptWordCount} words`,
        });
      }
    } else {
      debugSteps.push({
        step: 'transcript_acquisition',
        status: 'failed',
        details: 'No input provided',
      });
      return errorResponse('failed', 'No input provided', undefined, {
        transcriptSource: 'unknown',
        transcriptLength: 0,
        transcriptPreview: '',
        processingSteps: debugSteps,
      });
    }

    // Build current debug info helper
    const buildDebugInfo = (methodologyRaw?: DebugInfo['methodologyRaw']): DebugInfo => ({
      transcriptSource,
      transcriptLength: transcriptWordCount,
      transcriptPreview,
      methodologyRaw,
      processingSteps: debugSteps,
    });

    console.log(`[Transcript] Final source: ${transcriptSource}, words: ${transcriptWordCount}`);
    
    // ================================================================
    // STEP 1: Transcript Quality Validation
    // ================================================================
    const qualityCheck = validateTranscriptQuality(transcript);
    
    if (!qualityCheck.hasActionableContent) {
      debugSteps.push({
        step: 'quality_check',
        status: 'failed',
        details: qualityCheck.warnings.join('; ') || 'No actionable content',
      });
      return errorResponse(
        'failed',
        `Transcript does not contain actionable trading rules. ${qualityCheck.warnings.join('. ')}`,
        videoTitle,
        buildDebugInfo()
      );
    }
    
    debugSteps.push({
      step: 'quality_check',
      status: qualityCheck.warnings.length > 0 ? 'warning' : 'success',
      details: qualityCheck.warnings.length > 0 
        ? `Passed with warnings: ${qualityCheck.warnings.join('; ')}`
        : 'Actionable content detected',
    });

    // ================================================================
    // STEP 2: Methodology Detection
    // ================================================================
    const methodologyResult = await detectMethodology(transcript, LOVABLE_API_KEY);
    
    if (!methodologyResult) {
      debugSteps.push({
        step: 'methodology_detection',
        status: 'failed',
        details: 'AI failed to analyze methodology',
      });
      return errorResponse(
        'failed',
        'Failed to analyze trading methodology from transcript',
        videoTitle,
        buildDebugInfo()
      );
    }

    // Always capture methodology raw result for debugging
    const methodologyRaw = {
      methodology: methodologyResult.methodology,
      confidence: methodologyResult.confidence,
      evidence: methodologyResult.evidence || [],
      reasoning: methodologyResult.reasoning,
    };

    if (methodologyResult.confidence < 60) {
      debugSteps.push({
        step: 'methodology_detection',
        status: 'failed',
        details: `${methodologyResult.methodology} detected with only ${methodologyResult.confidence}% confidence`,
      });
      return errorResponse(
        'blocked',
        `Unable to confidently determine trading methodology (${methodologyResult.confidence}% confidence). The transcript may not describe a clear trading strategy.`,
        videoTitle,
        buildDebugInfo(methodologyRaw)
      );
    }
    
    debugSteps.push({
      step: 'methodology_detection',
      status: methodologyResult.confidence >= 75 ? 'success' : 'warning',
      details: `${methodologyResult.methodology.toUpperCase()} with ${methodologyResult.confidence}% confidence`,
    });

    // ================================================================
    // STEP 3: Strategy Extraction (Methodology-Aware)
    // ================================================================
    const extractedStrategy = await extractStrategy(
      transcript,
      methodologyResult.methodology,
      methodologyResult.confidence,
      LOVABLE_API_KEY
    );

    if (!extractedStrategy) {
      debugSteps.push({
        step: 'strategy_extraction',
        status: 'failed',
        details: 'AI failed to extract strategy rules',
      });
      return errorResponse(
        'failed',
        'Failed to extract strategy details from transcript',
        videoTitle,
        buildDebugInfo(methodologyRaw)
      );
    }
    
    debugSteps.push({
      step: 'strategy_extraction',
      status: 'success',
      details: `Extracted ${(extractedStrategy.entryRules || []).length} entry rules, ${(extractedStrategy.exitRules || []).length} exit rules`,
    });

    // Normalize rules (add IDs, set mandatory flags)
    const normalizedStrategy = normalizeRules(extractedStrategy);

    // ================================================================
    // STEP 4: Actionability Gate
    // ================================================================
    const actionability = validateActionability(normalizedStrategy);

    // ================================================================
    // STEP 5: Confidence Scoring & Status Determination
    // ================================================================
    const finalConfidence = calculateFinalConfidence(
      methodologyResult.confidence,
      actionability.score,
      transcriptWordCount,
      isAutoGenerated,
      normalizedStrategy.extractionConfidence // Pass extraction confidence if available
    );

    const importStatus = determineImportStatus(finalConfidence, actionability);
    const statusReason = generateStatusReason(importStatus, actionability, finalConfidence);

    // Calculate automation score based on rule clarity
    const automationScore = calculateAutomationScore(normalizedStrategy);

    // Add final validation step to debug
    debugSteps.push({
      step: 'validation',
      status: actionability.isActionable ? 'success' : 'warning',
      details: `Actionability score: ${actionability.score}%, ${actionability.missingElements.length} missing elements`,
    });

    // Build final debug info
    const finalDebugInfo = buildDebugInfo(methodologyRaw);

    // Build final response
    const response = {
      status: importStatus,
      reason: statusReason,
      strategy: {
        strategyName: normalizedStrategy.strategyName || videoTitle || 'Imported Strategy',
        description: normalizedStrategy.description || '',
        methodology: methodologyResult.methodology,
        methodologyConfidence: methodologyResult.confidence,
        methodologyReasoning: methodologyResult.reasoning || '', // New field
        
        conceptsUsed: normalizedStrategy.conceptsUsed || [],
        indicatorsUsed: normalizedStrategy.indicatorsUsed || [],
        patternsUsed: normalizedStrategy.patternsUsed || [],
        
        entryRules: normalizedStrategy.entryRules || [],
        exitRules: normalizedStrategy.exitRules || [],
        
        riskManagement: normalizedStrategy.riskManagement || {},
        timeframeContext: normalizedStrategy.timeframeContext || { primary: '1h' },
        
        suitablePairs: normalizedStrategy.suitablePairs || [],
        difficultyLevel: normalizedStrategy.difficultyLevel || 'intermediate',
        riskLevel: normalizedStrategy.riskLevel || 'medium',
        
        confidence: finalConfidence,
        automationScore,
        
        // New fields from enhanced extraction
        additionalFilters: normalizedStrategy.additionalFilters || [],
        notes: normalizedStrategy.notes || [],
        extractionConfidence: normalizedStrategy.extractionConfidence || null,
        
        sourceUrl: url || '',
        sourceTitle: videoTitle || '',
        transcriptLength: transcriptWordCount,
      },
      validation: {
        isActionable: actionability.isActionable,
        hasEntry: actionability.hasEntry,
        hasExit: actionability.hasExit,
        hasRiskManagement: actionability.hasRiskManagement,
        warnings: [
          ...actionability.warnings,
          ...(isAutoGenerated ? ['Transcript was auto-generated (may contain errors)'] : []),
          ...qualityCheck.warnings,
        ],
        missingElements: actionability.missingElements,
        score: actionability.score,
      },
      debug: finalDebugInfo, // Include debug info in successful responses
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("YouTube import error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    
    // Handle rate limits and payment errors
    if (message.includes('429') || message.includes('rate limit')) {
      return new Response(
        JSON.stringify({ status: 'failed', reason: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (message.includes('402') || message.includes('payment')) {
      return new Response(
        JSON.stringify({ status: 'failed', reason: 'AI credits exhausted. Please add funds.' }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ status: 'failed', reason: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Parse risk-reward ratio string "1:2" to numeric value 2.0
 * Handles formats: "1:2", "1:3", "1 to 2", "2R", etc.
 */
function parseRiskRewardRatio(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  
  // Already a number
  if (typeof value === 'number') return value;
  
  if (typeof value === 'string') {
    const str = value.trim().toLowerCase();
    
    // Handle "1:2" format
    const colonMatch = str.match(/^1:(\d+(?:\.\d+)?)$/);
    if (colonMatch) return parseFloat(colonMatch[1]);
    
    // Handle "1 to 2" format
    const toMatch = str.match(/^1\s*to\s*(\d+(?:\.\d+)?)$/);
    if (toMatch) return parseFloat(toMatch[1]);
    
    // Handle "2R" format
    const rMatch = str.match(/^(\d+(?:\.\d+)?)r$/);
    if (rMatch) return parseFloat(rMatch[1]);
    
    // Handle "2:1" reverse format (interpret as 0.5)
    const reverseMatch = str.match(/^(\d+(?:\.\d+)?):1$/);
    if (reverseMatch) return 1 / parseFloat(reverseMatch[1]);
    
    // Try direct parse
    const direct = parseFloat(str);
    if (!isNaN(direct)) return direct;
  }
  
  // Handle object with minimum/target fields
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (obj.minimum) return parseRiskRewardRatio(obj.minimum);
    if (obj.target) return parseRiskRewardRatio(obj.target);
  }
  
  return null;
}

/**
 * Calculate automation score based on how programmable the rules are
 */
function calculateAutomationScore(strategy: ExtractedStrategy): number {
  let score = 50; // Base score
  
  // Entry rules clarity
  const entryRules = strategy.entryRules || [];
  if (entryRules.length >= 2) score += 10;
  if (entryRules.length >= 3) score += 5;
  
  // Check if entry rules have clear types
  const clearTypes = entryRules.filter(r => 
    ['indicator', 'price_action', 'structure'].includes(r.type)
  );
  score += clearTypes.length * 5;
  
  // Exit rules with numeric values
  const exitRules = strategy.exitRules || [];
  const numericExits = exitRules.filter(r => r.value && r.value > 0);
  score += numericExits.length * 10;
  
  // Indicator-based strategies are more automatable
  if (strategy.methodology === 'indicator_based') {
    score += 15;
  }
  
  // SMC/ICT requires more discretion
  if (strategy.methodology === 'smc' || strategy.methodology === 'ict') {
    score -= 10;
  }
  
  return Math.max(0, Math.min(100, score));
}
