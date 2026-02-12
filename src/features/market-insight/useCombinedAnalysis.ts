/**
 * Combined Crypto + Macro Analysis Hook
 * Per INTEGRATION_GUIDE.md - alignment scoring between crypto and macro sentiment
 */
import { useMemo } from "react";
import { useMarketSentiment } from "./useMarketSentiment";
import { useMacroAnalysis } from "./useMacroAnalysis";

export type CombinedRecommendation = 
  | 'STRONG_BUY' 
  | 'STRONG_SELL' 
  | 'CAUTIOUS' 
  | 'WAIT';

export type AlignmentStatus = 'aligned' | 'conflict' | 'neutral';

export interface CombinedAnalysis {
  cryptoScore: number; // 0-1
  macroScore: number; // 0-1
  alignmentPercent: number; // 0-100
  alignmentStatus: AlignmentStatus;
  recommendation: CombinedRecommendation;
  recommendationText: string;
  positionSizeAdjustment: number; // 0.5 = reduce by 50%, 1.0 = normal, 1.25 = increase
  confidenceLevel: number; // 0-100
}

/**
 * Convert sentiment string to numeric score
 */
function sentimentToScore(sentiment: 'bullish' | 'bearish' | 'neutral' | 'cautious'): number {
  switch (sentiment) {
    case 'bullish': return 0.75;
    case 'bearish': return 0.25;
    case 'neutral':
    case 'cautious':
    default: return 0.5;
  }
}

/**
 * Calculate recommendation based on crypto and macro alignment
 * Per INTEGRATION_GUIDE.md logic
 */
function calculateRecommendation(
  cryptoScore: number,
  macroScore: number,
  alignmentStatus: AlignmentStatus
): { 
  recommendation: CombinedRecommendation; 
  text: string; 
  positionAdj: number;
} {
  const bothBullish = cryptoScore > 0.6 && macroScore > 0.6;
  const bothBearish = cryptoScore < 0.4 && macroScore < 0.4;
  
  if (alignmentStatus === 'aligned') {
    if (bothBullish) {
      return {
        recommendation: 'STRONG_BUY',
        text: 'Crypto and Macro are aligned bullish. Entry opportunity with normal or slightly larger size.',
        positionAdj: 1.0
      };
    }
    if (bothBearish) {
      return {
        recommendation: 'STRONG_SELL',
        text: 'Crypto and Macro are aligned bearish. Avoid longs, consider short or cash.',
        positionAdj: 0.5
      };
    }
    return {
      recommendation: 'WAIT',
      text: 'Market is neutral and aligned. Wait for clearer momentum.',
      positionAdj: 0.75
    };
  }
  
  if (alignmentStatus === 'conflict') {
    return {
      recommendation: 'CAUTIOUS',
      text: 'Conflict between crypto and macro sentiment. Reduce position size 50%, use tight stops.',
      positionAdj: 0.5
    };
  }
  
  // neutral
  return {
    recommendation: 'WAIT',
    text: 'Market in transition. Wait for clearer directional confirmation.',
    positionAdj: 0.75
  };
}

export function useCombinedAnalysis() {
  const { data: sentimentData, isLoading: sentimentLoading, error: sentimentError } = useMarketSentiment();
  const { data: macroData, isLoading: macroLoading, error: macroError } = useMacroAnalysis();
  
  const combinedAnalysis = useMemo<CombinedAnalysis | null>(() => {
    if (!sentimentData || !macroData) return null;
    
    // Calculate crypto score from sentiment data
    // Use technicalScore (0-100) + onChainScore + macroScore from sentiment API
    const cryptoRaw = (
      (sentimentData.sentiment.technicalScore * 0.40) +
      (sentimentData.sentiment.onChainScore * 0.30) +
      (sentimentData.sentiment.macroScore * 0.30)
    ) / 100;
    const cryptoScore = Math.max(0, Math.min(1, cryptoRaw));
    
    // Calculate macro score from macro API
    const macroSentiment = macroData.macro.overallSentiment;
    const macroScore = sentimentToScore(macroSentiment);
    
    // Calculate alignment
    const scoreDiff = Math.abs(cryptoScore - macroScore);
    const alignmentPercent = Math.round((1 - scoreDiff) * 100);
    
    let alignmentStatus: AlignmentStatus;
    if (scoreDiff < 0.15) {
      alignmentStatus = 'aligned';
    } else if (scoreDiff > 0.25) {
      alignmentStatus = 'conflict';
    } else {
      alignmentStatus = 'neutral';
    }
    
    // Get recommendation
    const { recommendation, text, positionAdj } = calculateRecommendation(
      cryptoScore, 
      macroScore, 
      alignmentStatus
    );
    
    // Calculate confidence based on alignment and data quality
    const dataQuality = sentimentData.dataQuality || 80;
    const baseConfidence = alignmentStatus === 'aligned' ? 85 : alignmentStatus === 'conflict' ? 60 : 70;
    const confidenceLevel = Math.round((baseConfidence * dataQuality) / 100);
    
    return {
      cryptoScore,
      macroScore,
      alignmentPercent,
      alignmentStatus,
      recommendation,
      recommendationText: text,
      positionSizeAdjustment: positionAdj,
      confidenceLevel
    };
  }, [sentimentData, macroData]);
  
  return {
    data: combinedAnalysis,
    isLoading: sentimentLoading || macroLoading,
    error: sentimentError || macroError,
    // Expose individual data for alert system
    sentimentData,
    macroData
  };
}
