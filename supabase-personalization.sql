-- ============================================================
-- InkStory — Sana Özel (Personalization) Schema
-- Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- ── Genişletilmiş kategori listesi ───────────────────────
-- Mevcut kategorileri sil ve yenisini ekle
TRUNCATE public.kategoriler RESTART IDENTITY CASCADE;

INSERT INTO public.kategoriler (ad, slug, renk, ikon, aciklama) VALUES
  -- Türler
  ('Romantik',        'romantik',        '#e11d48', '💕', 'Aşk ve romantizm hikayeleri'),
  ('Fantastik',       'fantastik',       '#7c3aed', '🧙', 'Büyülü dünyalar ve efsaneler'),
  ('Korku',           'korku',           '#1e293b', '👻', 'Korku ve gerilim hikayeleri'),
  ('Gizem',           'gizem',           '#0d9488', '🔍', 'Dedektif ve gizem'),
  ('Bilim Kurgu',     'bilim-kurgu',     '#0369a1', '🚀', 'Bilim kurgu ve gelecek'),
  ('Macera',          'macera',          '#d97706', '⚔️',  'Aksiyon ve macera'),
  ('Dram',            'dram',            '#9f1239', '🎭', 'Duygusal drama hikayeleri'),
  ('Polisiye',        'polisiye',        '#374151', '🕵️', 'Suç ve polisiye'),
  ('Gerilim',         'gerilim',         '#7f1d1d', '😰', 'Gerilim dolu hikayeler'),
  ('Mizah',           'mizah',           '#ca8a04', '😄', 'Komedi ve mizah'),
  ('Gençlik',         'genclik',         '#16a34a', '🌱', 'Gençlik ve büyüme hikayeleri'),
  -- Edebi / Özel
  ('Şiir',            'siir',            '#9333ea', '✍️',  'Şiir ve nazım'),
  ('Tarihi',          'tarihi',          '#92400e', '🏛️', 'Tarihi kurgu'),
  ('Klasik Romanlar', 'klasik-romanlar', '#78350f', '📜', 'Klasik roman tarzı'),
  ('Psikolojik',      'psikolojik',      '#4c1d95', '🧠', 'Psikolojik derinlikli hikayeler'),
  ('Distopya',        'distopya',        '#1f2937', '🌑', 'Distopik gelecek dünyaları'),
  ('Deneme',          'deneme',          '#065f46', '📝', 'Deneme ve düşünce yazıları'),
  ('Fanfiction',      'fanfiction',      '#be185d', '⭐', 'Fan hikayeleri'),
  ('Kısa Hikaye',     'kisa-hikaye',     '#0f766e', '📖', 'Kısa hikayeler')
ON CONFLICT (slug) DO UPDATE SET
  ad = EXCLUDED.ad,
  renk = EXCLUDED.renk,
  ikon = EXCLUDED.ikon,
  aciklama = EXCLUDED.aciklama;

-- ── User preferences table ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category    text NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, category)
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prefs_select_own"  ON public.user_preferences;
DROP POLICY IF EXISTS "prefs_insert_own"  ON public.user_preferences;
DROP POLICY IF EXISTS "prefs_delete_own"  ON public.user_preferences;
DROP POLICY IF EXISTS "prefs_admin_all"   ON public.user_preferences;

CREATE POLICY "prefs_select_own"  ON public.user_preferences FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "prefs_insert_own"  ON public.user_preferences FOR INSERT  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "prefs_delete_own"  ON public.user_preferences FOR DELETE  USING (auth.uid() = user_id);
CREATE POLICY "prefs_admin_all"   ON public.user_preferences FOR ALL     USING (public.is_admin());

-- ── Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS prefs_user_idx     ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS prefs_category_idx ON public.user_preferences(category);
CREATE INDEX IF NOT EXISTS hikayeler_cat_slug_idx ON public.hikayeler(kategori_id);

-- ── Verify ────────────────────────────────────────────────
SELECT id, ad, slug FROM public.kategoriler ORDER BY id;
