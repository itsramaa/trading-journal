-- Create storage bucket for user avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 
  'avatars', 
  true, 
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add missing columns to users_profile if they don't exist
ALTER TABLE public.users_profile 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add subscription/plan tracking columns to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP WITH TIME ZONE;

-- Add notification preferences columns to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS notify_price_alerts BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_portfolio_updates BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_weekly_report BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS notify_market_news BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_email_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_push_enabled BOOLEAN NOT NULL DEFAULT false;