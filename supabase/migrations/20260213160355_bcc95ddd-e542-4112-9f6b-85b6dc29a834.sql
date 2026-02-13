-- Drop the old UUID overload of check_sync_quota that causes ambiguity
DROP FUNCTION IF EXISTS public.check_sync_quota(uuid);

-- Drop old UUID overloads for the other functions too if they exist
DROP FUNCTION IF EXISTS public.check_rate_limit(uuid, text, text, integer);
DROP FUNCTION IF EXISTS public.increment_sync_quota(uuid);