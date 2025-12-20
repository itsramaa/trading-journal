-- Create fire_settings table for storing configurable FIRE assumptions per user
CREATE TABLE public.fire_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  current_age INTEGER NOT NULL DEFAULT 30,
  target_retirement_age INTEGER NOT NULL DEFAULT 45,
  monthly_income NUMERIC NOT NULL DEFAULT 0,
  monthly_expenses NUMERIC NOT NULL DEFAULT 0,
  expected_annual_return NUMERIC NOT NULL DEFAULT 8,
  inflation_rate NUMERIC NOT NULL DEFAULT 3,
  safe_withdrawal_rate NUMERIC NOT NULL DEFAULT 4,
  custom_fire_number NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_fire_settings UNIQUE (user_id)
);

-- Enable Row Level Security
ALTER TABLE public.fire_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own FIRE settings" 
ON public.fire_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own FIRE settings" 
ON public.fire_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own FIRE settings" 
ON public.fire_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own FIRE settings" 
ON public.fire_settings 
FOR DELETE 
USING (auth.uid() = user_id);