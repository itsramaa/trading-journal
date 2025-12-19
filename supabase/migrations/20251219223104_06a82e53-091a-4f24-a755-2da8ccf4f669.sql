-- Add API identifier columns to assets table
ALTER TABLE public.assets
ADD COLUMN IF NOT EXISTS coingecko_id TEXT,
ADD COLUMN IF NOT EXISTS finnhub_symbol TEXT,
ADD COLUMN IF NOT EXISTS fcs_symbol TEXT,
ADD COLUMN IF NOT EXISTS alpha_symbol TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_assets_coingecko_id ON public.assets(coingecko_id) WHERE coingecko_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_finnhub_symbol ON public.assets(finnhub_symbol) WHERE finnhub_symbol IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_fcs_symbol ON public.assets(fcs_symbol) WHERE fcs_symbol IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_alpha_symbol ON public.assets(alpha_symbol) WHERE alpha_symbol IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.assets.coingecko_id IS 'CoinGecko API identifier for crypto assets';
COMMENT ON COLUMN public.assets.finnhub_symbol IS 'Finnhub symbol for US stocks';
COMMENT ON COLUMN public.assets.fcs_symbol IS 'FCS API symbol for Indonesian stocks';
COMMENT ON COLUMN public.assets.alpha_symbol IS 'Alpha Vantage symbol for stock history';