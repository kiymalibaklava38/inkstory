-- ============================================================
-- InkStory Schema UPDATE
-- Run this in Supabase SQL Editor → New Query
-- ============================================================

-- 1. Add is_admin column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- 2. Enable Realtime for notifications
-- Go to: Supabase Dashboard → Database → Replication
-- Enable realtime for: yorumlar, begeniler, takip tables
-- OR run:
ALTER PUBLICATION supabase_realtime ADD TABLE public.yorumlar;
ALTER PUBLICATION supabase_realtime ADD TABLE public.begeniler;
ALTER PUBLICATION supabase_realtime ADD TABLE public.takip;

-- 3. Make yourself admin (replace with YOUR username)
UPDATE public.profiles
SET is_admin = true
WHERE username = 'YOUR_USERNAME_HERE';

-- 4. Verify
SELECT id, username, display_name, is_admin, created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 20;
