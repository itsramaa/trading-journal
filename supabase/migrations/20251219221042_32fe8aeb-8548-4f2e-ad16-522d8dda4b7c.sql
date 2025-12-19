-- Create emergency_funds table for tracking emergency fund goals
CREATE TABLE public.emergency_funds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Emergency Fund',
  current_balance DECIMAL(24,8) NOT NULL DEFAULT 0,
  monthly_expenses DECIMAL(24,8) NOT NULL DEFAULT 0,
  monthly_contribution DECIMAL(24,8) NOT NULL DEFAULT 0,
  target_months INTEGER NOT NULL DEFAULT 6,
  currency TEXT NOT NULL DEFAULT 'IDR',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create emergency_fund_transactions table
CREATE TABLE public.emergency_fund_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  emergency_fund_id UUID NOT NULL REFERENCES public.emergency_funds(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'interest')),
  amount DECIMAL(24,8) NOT NULL,
  description TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on emergency_funds
ALTER TABLE public.emergency_funds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own emergency funds"
ON public.emergency_funds FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own emergency funds"
ON public.emergency_funds FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emergency funds"
ON public.emergency_funds FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emergency funds"
ON public.emergency_funds FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on emergency_fund_transactions
ALTER TABLE public.emergency_fund_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own emergency fund transactions"
ON public.emergency_fund_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own emergency fund transactions"
ON public.emergency_fund_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emergency fund transactions"
ON public.emergency_fund_transactions FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update emergency_fund balance on transaction
CREATE OR REPLACE FUNCTION public.update_emergency_fund_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.transaction_type IN ('deposit', 'interest') THEN
      UPDATE public.emergency_funds 
      SET current_balance = current_balance + NEW.amount, updated_at = now() 
      WHERE id = NEW.emergency_fund_id;
    ELSIF NEW.transaction_type = 'withdrawal' THEN
      UPDATE public.emergency_funds 
      SET current_balance = current_balance - NEW.amount, updated_at = now() 
      WHERE id = NEW.emergency_fund_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.transaction_type IN ('deposit', 'interest') THEN
      UPDATE public.emergency_funds 
      SET current_balance = current_balance - OLD.amount, updated_at = now() 
      WHERE id = OLD.emergency_fund_id;
    ELSIF OLD.transaction_type = 'withdrawal' THEN
      UPDATE public.emergency_funds 
      SET current_balance = current_balance + OLD.amount, updated_at = now() 
      WHERE id = OLD.emergency_fund_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_emergency_fund_balance
AFTER INSERT OR DELETE ON public.emergency_fund_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_emergency_fund_balance();

-- Create trigger for emergency_funds updated_at
CREATE TRIGGER update_emergency_funds_updated_at
BEFORE UPDATE ON public.emergency_funds
FOR EACH ROW EXECUTE FUNCTION public.update_accounts_updated_at();