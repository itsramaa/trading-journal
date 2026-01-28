/**
 * AI Integration Types - Per Trading Journey Markdown spec
 */

export interface AIConfluenceResult {
  confluences_detected: number;
  confluences_required: number;
  details: ConfluenceDetail[];
  overall_confidence: number;
  verdict: 'pass' | 'fail' | 'warning';
  recommendation: string;
}

export interface ConfluenceDetail {
  id: string;
  type: string;
  name: string;
  detected: boolean;
  description: string;
  confidence: number;
  is_mandatory: boolean;
}

export interface AITradeQualityScore {
  score: number; // 1-10
  confidence: number; // 0-100
  factors: QualityFactor[];
  recommendation: 'execute' | 'wait' | 'skip';
  reasoning: string;
}

export interface QualityFactor {
  name: string;
  score: number;
  weight: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

export interface AIPatternInsight {
  pattern_name: string;
  win_rate: number;
  avg_win: number;
  avg_loss: number;
  trade_count: number;
  recommendation: string;
  confidence: number;
}

export interface AIInsight {
  id: string;
  type: 'pattern' | 'warning' | 'optimization' | 'recommendation';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  action_label?: string;
  action_url?: string;
}

export interface AIAnalysisRequest {
  trade_data?: unknown;
  strategy_id?: string;
  pair?: string;
  timeframe?: string;
  analysis_type: 'confluence' | 'quality' | 'pattern' | 'recommendation';
}

export interface AIAnalysisResponse {
  success: boolean;
  data: AIConfluenceResult | AITradeQualityScore | AIPatternInsight[] | AIInsight[];
  error?: string;
  processing_time_ms: number;
}

export interface PreTradeValidation {
  timestamp: string;
  daily_loss_check: boolean;
  position_size_check: boolean;
  correlation_check: boolean;
  confluence_score: number;
  ai_quality_score: number;
  ai_confidence: number;
  emotional_state: string;
  notes: string;
}

export interface PostTradeAnalysis {
  timestamp: string;
  ai_review: string;
  what_worked: string[];
  what_to_improve: string[];
  pattern_identified: string | null;
  follow_up_actions: string[];
}
