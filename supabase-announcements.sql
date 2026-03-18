-- ============================================================
-- InkStory — Announcements Table
-- Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS public.announcements (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title      text NOT NULL,
  message    text NOT NULL,
  active     boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_select_public" ON public.announcements;
DROP POLICY IF EXISTS "announcements_admin_all"     ON public.announcements;

-- Anyone can read active announcements
CREATE POLICY "announcements_select_public"
  ON public.announcements FOR SELECT
  USING (active = true);

-- Admins have full access (read all, write all)
CREATE POLICY "announcements_admin_all"
  ON public.announcements FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Verify
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'announcements';
