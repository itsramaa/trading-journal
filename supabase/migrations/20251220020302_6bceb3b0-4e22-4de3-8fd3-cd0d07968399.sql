-- Create trading_strategies table for user-defined strategies
CREATE TABLE public.trading_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  color TEXT DEFAULT 'blue',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.trading_strategies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own strategies" 
ON public.trading_strategies 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own strategies" 
ON public.trading_strategies 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategies" 
ON public.trading_strategies 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strategies" 
ON public.trading_strategies 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trade_strategy junction table (many-to-many relationship)
CREATE TABLE public.trade_entry_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_entry_id UUID NOT NULL REFERENCES public.trade_entries(id) ON DELETE CASCADE,
  strategy_id UUID NOT NULL REFERENCES public.trading_strategies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(trade_entry_id, strategy_id)
);

-- Enable RLS for junction table
ALTER TABLE public.trade_entry_strategies ENABLE ROW LEVEL SECURITY;

-- RLS policies for junction table
CREATE POLICY "Users can view their own trade strategies" 
ON public.trade_entry_strategies 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trade strategies" 
ON public.trade_entry_strategies 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trade strategies" 
ON public.trade_entry_strategies 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add session_id column to trade_entries to link trades with sessions
ALTER TABLE public.trade_entries 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.trading_sessions(id) ON DELETE SET NULL;