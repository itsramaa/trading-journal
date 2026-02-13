DROP INDEX IF EXISTS idx_notifications_welcome_unique;
CREATE UNIQUE INDEX idx_notifications_welcome_unique 
ON public.notifications (user_id) 
WHERE type = 'system' AND title = 'Welcome to Deriverse!';