-- Create risk_events table for audit trail
CREATE TABLE public.risk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  trigger_value numeric(12,2) NOT NULL,
  threshold_value numeric(12,2) NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.risk_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own risk events" 
  ON public.risk_events 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own risk events" 
  ON public.risk_events 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Add ai_settings column to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS ai_settings jsonb DEFAULT '{
  "confluence_detection": true,
  "quality_scoring": true,
  "pattern_recognition": true,
  "daily_suggestions": true,
  "risk_monitoring": true,
  "post_trade_analysis": true,
  "confidence_threshold": 75,
  "suggestion_style": "balanced",
  "learn_from_wins": true,
  "learn_from_losses": true
}'::jsonb;