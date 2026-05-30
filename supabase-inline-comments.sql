-- ============================================================
-- InkStory — Wattpad-Style Inline Comments Schema Updates
-- Supabase SQL Editor → New Query → Run
-- ============================================================

-- 1. Add paragraph_index column to comments table
ALTER TABLE public.yorumlar
  ADD COLUMN IF NOT EXISTS paragraph_index integer DEFAULT null;

-- 2. Add composite index for fast paragraph comment counts and list queries
CREATE INDEX IF NOT EXISTS idx_yorumlar_paragraph
  ON public.yorumlar(bolum_id, paragraph_index)
  WHERE paragraph_index IS NOT NULL;
