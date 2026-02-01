-- Auto-cleanup trigger for api_rate_limits table
-- Cleans up old rate limit records when table grows beyond threshold

CREATE OR REPLACE FUNCTION public.auto_cleanup_rate_limits()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
  v_deleted INTEGER;
BEGIN
  -- Check row count (using estimate for performance)
  SELECT reltuples::INTEGER INTO v_count
  FROM pg_class
  WHERE relname = 'api_rate_limits';
  
  -- Cleanup if more than 10000 rows
  IF v_count > 10000 THEN
    DELETE FROM public.api_rate_limits 
    WHERE window_end < now() - interval '1 hour';
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    
    -- Log cleanup for debugging (optional)
    IF v_deleted > 0 THEN
      RAISE NOTICE 'auto_cleanup_rate_limits: deleted % rows', v_deleted;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger (fires after INSERT on statement level for efficiency)
DROP TRIGGER IF EXISTS tr_auto_cleanup_rate_limits ON public.api_rate_limits;

CREATE TRIGGER tr_auto_cleanup_rate_limits
AFTER INSERT ON public.api_rate_limits
FOR EACH STATEMENT
EXECUTE FUNCTION public.auto_cleanup_rate_limits();

-- Add comment for documentation
COMMENT ON FUNCTION public.auto_cleanup_rate_limits() IS 
'Automatically cleans up old rate limit records when table exceeds 10000 rows.
Deletes records with window_end older than 1 hour.
Triggered after INSERT statements on api_rate_limits table.';