-- Phase 3: Add default trading account preference to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS default_trading_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.user_settings.default_trading_account_id IS 'Default trading account for Trade Entry Wizard';

-- Phase 5: Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;