-- ============================================================
-- InkStory — E-posta Bildirimleri & Bölüm Aboneliği
-- Supabase SQL Editor → New Query → Run
-- ============================================================

-- ── 1. Bölüm aboneliği tablosu ───────────────────────────
CREATE TABLE IF NOT EXISTS public.hikaye_abonelikleri (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hikaye_id    uuid NOT NULL REFERENCES public.hikayeler(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, hikaye_id)
);

ALTER TABLE public.hikaye_abonelikleri ENABLE ROW LEVEL SECURITY;

CREATE POLICY "abonelik_select_own" ON public.hikaye_abonelikleri
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "abonelik_insert_own" ON public.hikaye_abonelikleri
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "abonelik_delete_own" ON public.hikaye_abonelikleri
  FOR DELETE USING (auth.uid() = user_id);

-- ── 2. E-posta bildirim ayarları ─────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_new_chapter  boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_new_follower boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_new_comment  boolean DEFAULT true;

-- ── 3. Gönderilen e-posta logu (spam önleme) ─────────────
CREATE TABLE IF NOT EXISTS public.email_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type         text NOT NULL, -- 'new_chapter' | 'new_follower' | 'new_comment'
  ref_id       uuid,          -- hikaye_id veya comment_id
  sent_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_logs_user_type ON public.email_logs(user_id, type, sent_at);
