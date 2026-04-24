-- ============================================================
-- InkStory — Okuma Listesi Klasörleri + Hikaye Abonelikleri
-- ============================================================

-- ── 1. Okuma listesi klasörleri ───────────────────────────
CREATE TABLE IF NOT EXISTS public.okuma_klasorleri (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kullanici_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ad           text NOT NULL CHECK (char_length(ad) BETWEEN 1 AND 50),
  renk         text DEFAULT '#d4840f',
  ikon         text DEFAULT '📚',
  sira         integer DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(kullanici_id, ad)
);
ALTER TABLE public.okuma_klasorleri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Kendi klasörlerini gör"    ON public.okuma_klasorleri;
DROP POLICY IF EXISTS "Kendi klasörünü yönet"     ON public.okuma_klasorleri;
CREATE POLICY "Kendi klasörlerini gör"  ON public.okuma_klasorleri FOR SELECT USING (auth.uid() = kullanici_id);
CREATE POLICY "Kendi klasörünü yönet"   ON public.okuma_klasorleri FOR ALL    USING (auth.uid() = kullanici_id) WITH CHECK (auth.uid() = kullanici_id);

-- ── 2. okuma_listesi tablosuna klasör sütunu ekle ─────────
ALTER TABLE public.okuma_listesi ADD COLUMN IF NOT EXISTS klasor_id uuid REFERENCES public.okuma_klasorleri(id) ON DELETE SET NULL;

-- ── 3. Hikaye abonelikleri tablosu ────────────────────────
CREATE TABLE IF NOT EXISTS public.hikaye_abonelikleri (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hikaye_id  uuid NOT NULL REFERENCES public.hikayeler(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, hikaye_id)
);
ALTER TABLE public.hikaye_abonelikleri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Kendi aboneliklerini gör"    ON public.hikaye_abonelikleri;
DROP POLICY IF EXISTS "Abone ol"                    ON public.hikaye_abonelikleri;
DROP POLICY IF EXISTS "Aboneliği iptal et"          ON public.hikaye_abonelikleri;
CREATE POLICY "Kendi aboneliklerini gör" ON public.hikaye_abonelikleri FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Abone ol"                 ON public.hikaye_abonelikleri FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Aboneliği iptal et"       ON public.hikaye_abonelikleri FOR DELETE USING (auth.uid() = user_id);

-- ── 4. Aboneleri abone sayısını gösteren view ─────────────
CREATE OR REPLACE VIEW public.hikaye_abone_sayilari AS
  SELECT hikaye_id, COUNT(*) as abone_sayisi
  FROM public.hikaye_abonelikleri
  GROUP BY hikaye_id;

-- ── 5. Index'ler ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_okuma_klasorleri_user  ON public.okuma_klasorleri(kullanici_id);
CREATE INDEX IF NOT EXISTS idx_okuma_listesi_klasor   ON public.okuma_listesi(klasor_id) WHERE klasor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hikaye_abonelik_user   ON public.hikaye_abonelikleri(user_id);
CREATE INDEX IF NOT EXISTS idx_hikaye_abonelik_hikaye ON public.hikaye_abonelikleri(hikaye_id);
