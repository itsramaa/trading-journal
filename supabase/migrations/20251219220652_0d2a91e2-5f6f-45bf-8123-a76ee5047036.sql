-- Create debts table for tracking user debts
CREATE TABLE public.debts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  debt_type TEXT NOT NULL DEFAULT 'other',
  original_balance DECIMAL(24,8) NOT NULL,
  current_balance DECIMAL(24,8) NOT NULL,
  interest_rate DECIMAL(8,4) NOT NULL DEFAULT 0,
  minimum_payment DECIMAL(24,8) NOT NULL DEFAULT 0,
  monthly_payment DECIMAL(24,8) NOT NULL DEFAULT 0,
  due_date INTEGER CHECK (due_date >= 1 AND due_date <= 31),
  start_date DATE,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own debts"
ON public.debts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own debts"
ON public.debts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own debts"
ON public.debts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own debts"
ON public.debts FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_debts_updated_at
BEFORE UPDATE ON public.debts
FOR EACH ROW
EXECUTE FUNCTION public.update_accounts_updated_at();