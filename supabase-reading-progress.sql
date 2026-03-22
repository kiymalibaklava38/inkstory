-- ============================================================
-- InkStory — Reading Progress System
-- Supabase SQL Editor → New Query → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reading_progress (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        REFERENCES auth.users(id)  ON DELETE CASCADE NOT NULL,
  hikaye_id     uuid        REFERENCES public.hikayeler(id) ON DELETE CASCADE NOT NULL,
  bolum_no      integer     NOT NULL DEFAULT 1,
  total_bolum   integer     NOT NULL DEFAULT 1,
  updated_at    timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, hikaye_id)
);

ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rp_select_own" ON public.reading_progress;
DROP POLICY IF EXISTS "rp_upsert_own" ON public.reading_progress;
DROP POLICY IF EXISTS "rp_delete_own" ON public.reading_progress;

CREATE POLICY "rp_select_own" ON public.reading_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rp_upsert_own" ON public.reading_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rp_update_own" ON public.reading_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rp_delete_own" ON public.reading_progress FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS rp_user_idx  ON public.reading_progress(user_id);
CREATE INDEX IF NOT EXISTS rp_story_idx ON public.reading_progress(hikaye_id);

-- Verify
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'reading_progress';
