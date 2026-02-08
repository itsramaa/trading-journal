-- First cleanup existing duplicate Welcome notifications (keep oldest per user)
WITH duplicates AS (
  SELECT id, user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as rn
  FROM notifications 
  WHERE type = 'system' AND title = 'Welcome to Portfolio Manager!'
)
DELETE FROM notifications 
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Now add unique partial index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_welcome_unique 
ON notifications (user_id) 
WHERE type = 'system' AND title = 'Welcome to Portfolio Manager!';