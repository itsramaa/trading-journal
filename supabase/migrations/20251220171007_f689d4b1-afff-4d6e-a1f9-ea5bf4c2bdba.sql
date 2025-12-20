-- Add unique constraint for accounts (user_id + name + account_type combination must be unique)
CREATE UNIQUE INDEX IF NOT EXISTS accounts_user_name_type_unique 
ON public.accounts (user_id, name, account_type);

-- Add unique constraint for emergency_funds (user_id + is_system for system funds)
CREATE UNIQUE INDEX IF NOT EXISTS emergency_funds_user_system_unique 
ON public.emergency_funds (user_id) 
WHERE is_system = true;

-- Add unique constraint for user_settings (one setting per user)
CREATE UNIQUE INDEX IF NOT EXISTS user_settings_user_unique 
ON public.user_settings (user_id);

-- Add unique constraint for users_profile (one profile per user)
CREATE UNIQUE INDEX IF NOT EXISTS users_profile_user_unique 
ON public.users_profile (user_id);