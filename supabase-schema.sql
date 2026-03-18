-- ============================================================
-- InkStory — Ana Veritabanı Şeması (supabase-schema.sql)
-- Supabase Dashboard → SQL Editor → New Query → Yapıştır → Run
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username      text UNIQUE NOT NULL,
  display_name  text,
  bio           text,
  avatar_url    text,
  website       text,
  is_admin      boolean DEFAULT false,
  is_banned     boolean DEFAULT false,
  ban_reason    text,
  banned_at     timestamptz,
  shadow_banned boolean DEFAULT false,
  created_at    timestamptz DEFAULT now() NOT NULL,
  updated_at    timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_public"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"     ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"     ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_trigger" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all"      ON public.profiles;

CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own"    ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own"    ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- KATEGORİLER
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kategoriler (
  id       serial PRIMARY KEY,
  ad       text UNIQUE NOT NULL,
  slug     text UNIQUE NOT NULL,
  renk     text DEFAULT '#d4840f',
  ikon     text DEFAULT '📖',
  aciklama text
);

ALTER TABLE public.kategoriler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kategoriler_select_all"  ON public.kategoriler;
DROP POLICY IF EXISTS "kategoriler_admin_write" ON public.kategoriler;

CREATE POLICY "kategoriler_select_all" ON public.kategoriler FOR SELECT USING (true);

INSERT INTO public.kategoriler (ad, slug, renk, ikon, aciklama) VALUES
  ('Romantik',    'romantik',    '#e11d48', '💕', 'Love and romance'),
  ('Fantastik',   'fantastik',   '#7c3aed', '🧙', 'Fantasy worlds'),
  ('Korku',       'korku',       '#1e293b', '👻', 'Horror and thriller'),
  ('Gizem',       'gizem',       '#0d9488', '🔍', 'Mystery and detective'),
  ('Bilim Kurgu', 'bilim-kurgu', '#0369a1', '🚀', 'Science fiction'),
  ('Macera',      'macera',      '#d97706', '⚔️',  'Action and adventure'),
  ('Şiir',        'siir',        '#9333ea', '✍️',  'Poetry and prose'),
  ('Tarihi',      'tarihi',      '#92400e', '🏛️', 'Historical fiction')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- HİKAYELER
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hikayeler (
  id                 uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  yazar_id           uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  kategori_id        integer REFERENCES public.kategoriler(id),
  baslik             text NOT NULL,
  slug               text UNIQUE NOT NULL,
  aciklama           text,
  kapak_url          text,
  etiketler          text[] DEFAULT '{}',
  durum              text DEFAULT 'taslak' CHECK (durum IN ('taslak','yayinda','tamamlandi')),
  dil                text DEFAULT 'tr',
  yetiskin_ici       boolean DEFAULT false,
  goruntuleme        integer DEFAULT 0,
  is_featured        boolean DEFAULT false,
  is_locked          boolean DEFAULT false,
  moderation_status  text DEFAULT 'ok' CHECK (moderation_status IN ('ok','flagged','removed')),
  created_at         timestamptz DEFAULT now() NOT NULL,
  updated_at         timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.hikayeler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hikayeler_select_published" ON public.hikayeler;
DROP POLICY IF EXISTS "hikayeler_select_own"       ON public.hikayeler;
DROP POLICY IF EXISTS "hikayeler_insert_auth"      ON public.hikayeler;
DROP POLICY IF EXISTS "hikayeler_update_own"       ON public.hikayeler;
DROP POLICY IF EXISTS "hikayeler_delete_own"       ON public.hikayeler;
DROP POLICY IF EXISTS "hikayeler_admin_all"        ON public.hikayeler;

CREATE POLICY "hikayeler_select_published" ON public.hikayeler FOR SELECT USING (durum IN ('yayinda','tamamlandi'));
CREATE POLICY "hikayeler_select_own"       ON public.hikayeler FOR SELECT USING (auth.uid() = yazar_id);
CREATE POLICY "hikayeler_insert_auth"      ON public.hikayeler FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = yazar_id);
CREATE POLICY "hikayeler_update_own"       ON public.hikayeler FOR UPDATE USING (auth.uid() = yazar_id) WITH CHECK (auth.uid() = yazar_id);
CREATE POLICY "hikayeler_delete_own"       ON public.hikayeler FOR DELETE USING (auth.uid() = yazar_id);

CREATE OR REPLACE FUNCTION public.increment_goruntuleme(hikaye_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.hikayeler SET goruntuleme = goruntuleme + 1 WHERE id = hikaye_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE public.hikayeler
  ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('turkish', coalesce(baslik, '')), 'A') ||
    setweight(to_tsvector('turkish', coalesce(aciklama, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS hikayeler_fts_idx ON public.hikayeler USING gin(fts);

-- ============================================================
-- BÖLÜMLER
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bolumler (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  hikaye_id     uuid REFERENCES public.hikayeler(id) ON DELETE CASCADE NOT NULL,
  yazar_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  baslik        text NOT NULL,
  icerik        text NOT NULL DEFAULT '',
  bolum_no      integer NOT NULL,
  kelime_sayisi integer DEFAULT 0,
  yayinda       boolean DEFAULT false,
  created_at    timestamptz DEFAULT now() NOT NULL,
  updated_at    timestamptz DEFAULT now() NOT NULL,
  UNIQUE(hikaye_id, bolum_no)
);

ALTER TABLE public.bolumler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bolumler_select_published" ON public.bolumler;
DROP POLICY IF EXISTS "bolumler_select_own"       ON public.bolumler;
DROP POLICY IF EXISTS "bolumler_insert_own"       ON public.bolumler;
DROP POLICY IF EXISTS "bolumler_update_own"       ON public.bolumler;
DROP POLICY IF EXISTS "bolumler_delete_own"       ON public.bolumler;

CREATE POLICY "bolumler_select_published" ON public.bolumler FOR SELECT
  USING (yayinda = true AND EXISTS (SELECT 1 FROM public.hikayeler h WHERE h.id = hikaye_id AND h.durum IN ('yayinda','tamamlandi')));
CREATE POLICY "bolumler_select_own"  ON public.bolumler FOR SELECT  USING (auth.uid() = yazar_id);
CREATE POLICY "bolumler_insert_own"  ON public.bolumler FOR INSERT  WITH CHECK (auth.uid() = yazar_id AND EXISTS (SELECT 1 FROM public.hikayeler h WHERE h.id = hikaye_id AND h.yazar_id = auth.uid()));
CREATE POLICY "bolumler_update_own"  ON public.bolumler FOR UPDATE  USING (auth.uid() = yazar_id) WITH CHECK (auth.uid() = yazar_id);
CREATE POLICY "bolumler_delete_own"  ON public.bolumler FOR DELETE  USING (auth.uid() = yazar_id);

-- ============================================================
-- YORUMLAR
-- ============================================================
CREATE TABLE IF NOT EXISTS public.yorumlar (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  hikaye_id       uuid REFERENCES public.hikayeler(id) ON DELETE CASCADE NOT NULL,
  bolum_id        uuid REFERENCES public.bolumler(id) ON DELETE CASCADE,
  yazar_id        uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  icerik          text NOT NULL,
  ust_yorum_id    uuid REFERENCES public.yorumlar(id) ON DELETE CASCADE,
  is_deleted      boolean DEFAULT false,
  moderation_flag boolean DEFAULT false,
  created_at      timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.yorumlar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "yorumlar_select_public" ON public.yorumlar;
DROP POLICY IF EXISTS "yorumlar_insert_auth"   ON public.yorumlar;
DROP POLICY IF EXISTS "yorumlar_delete_own"    ON public.yorumlar;
DROP POLICY IF EXISTS "yorumlar_admin_all"     ON public.yorumlar;

CREATE POLICY "yorumlar_select_public" ON public.yorumlar FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.hikayeler h WHERE h.id = hikaye_id AND h.durum IN ('yayinda','tamamlandi')));
CREATE POLICY "yorumlar_insert_auth" ON public.yorumlar FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = yazar_id AND EXISTS (SELECT 1 FROM public.hikayeler h WHERE h.id = hikaye_id AND h.durum IN ('yayinda','tamamlandi')));
CREATE POLICY "yorumlar_delete_own" ON public.yorumlar FOR DELETE USING (auth.uid() = yazar_id);

-- ============================================================
-- BEĞENİLER
-- ============================================================
CREATE TABLE IF NOT EXISTS public.begeniler (
  id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  kullanici_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  hikaye_id    uuid REFERENCES public.hikayeler(id) ON DELETE CASCADE,
  bolum_id     uuid REFERENCES public.bolumler(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now() NOT NULL,
  UNIQUE(kullanici_id, hikaye_id)
);

ALTER TABLE public.begeniler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "begeniler_select_public" ON public.begeniler;
DROP POLICY IF EXISTS "begeniler_insert_auth"   ON public.begeniler;
DROP POLICY IF EXISTS "begeniler_delete_own"    ON public.begeniler;

CREATE POLICY "begeniler_select_public" ON public.begeniler FOR SELECT USING (true);
CREATE POLICY "begeniler_insert_auth"   ON public.begeniler FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = kullanici_id);
CREATE POLICY "begeniler_delete_own"    ON public.begeniler FOR DELETE USING (auth.uid() = kullanici_id);

-- ============================================================
-- TAKİP
-- ============================================================
CREATE TABLE IF NOT EXISTS public.takip (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  takipci_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  takip_edilen_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at      timestamptz DEFAULT now() NOT NULL,
  UNIQUE(takipci_id, takip_edilen_id),
  CHECK (takipci_id != takip_edilen_id)
);

ALTER TABLE public.takip ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "takip_select_public" ON public.takip;
DROP POLICY IF EXISTS "takip_insert_auth"   ON public.takip;
DROP POLICY IF EXISTS "takip_delete_own"    ON public.takip;

CREATE POLICY "takip_select_public" ON public.takip FOR SELECT USING (true);
CREATE POLICY "takip_insert_auth"   ON public.takip FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = takipci_id AND takipci_id != takip_edilen_id);
CREATE POLICY "takip_delete_own"    ON public.takip FOR DELETE USING (auth.uid() = takipci_id);

-- ============================================================
-- OKUMA LİSTESİ
-- ============================================================
CREATE TABLE IF NOT EXISTS public.okuma_listesi (
  id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  kullanici_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  hikaye_id    uuid REFERENCES public.hikayeler(id) ON DELETE CASCADE NOT NULL,
  created_at   timestamptz DEFAULT now() NOT NULL,
  UNIQUE(kullanici_id, hikaye_id)
);

ALTER TABLE public.okuma_listesi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "okuma_listesi_select_own" ON public.okuma_listesi;
DROP POLICY IF EXISTS "okuma_listesi_insert_own" ON public.okuma_listesi;
DROP POLICY IF EXISTS "okuma_listesi_delete_own" ON public.okuma_listesi;

CREATE POLICY "okuma_listesi_select_own" ON public.okuma_listesi FOR SELECT USING (auth.uid() = kullanici_id);
CREATE POLICY "okuma_listesi_insert_own" ON public.okuma_listesi FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = kullanici_id);
CREATE POLICY "okuma_listesi_delete_own" ON public.okuma_listesi FOR DELETE USING (auth.uid() = kullanici_id);

-- ============================================================
-- REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type text NOT NULL CHECK (target_type IN ('story','comment','user')),
  target_id   text NOT NULL,
  reason      text NOT NULL,
  details     text,
  status      text DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_note  text,
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert_auth"  ON public.reports;
DROP POLICY IF EXISTS "reports_select_own"   ON public.reports;
DROP POLICY IF EXISTS "reports_admin_all"    ON public.reports;

CREATE POLICY "reports_insert_auth" ON public.reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = reporter_id);
CREATE POLICY "reports_select_own"  ON public.reports FOR SELECT USING (auth.uid() = reporter_id);

-- ============================================================
-- AI USAGE LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action        text NOT NULL,
  prompt_length integer DEFAULT 0,
  result_length integer DEFAULT 0,
  story_title   text,
  created_at    timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_logs_insert_auth" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "ai_logs_select_own"  ON public.ai_usage_logs;
DROP POLICY IF EXISTS "ai_logs_admin_all"   ON public.ai_usage_logs;

CREATE POLICY "ai_logs_insert_auth" ON public.ai_usage_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "ai_logs_select_own"  ON public.ai_usage_logs FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action     text NOT NULL,
  table_name text,
  record_id  text,
  metadata   jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_admin_select"  ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_system_insert" ON public.audit_log;

CREATE POLICY "audit_log_system_insert" ON public.audit_log FOR INSERT WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_audit(
  p_action     text,
  p_table_name text DEFAULT NULL,
  p_record_id  text DEFAULT NULL,
  p_metadata   jsonb DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.audit_log (user_id, action, table_name, record_id, metadata)
  VALUES (auth.uid(), p_action, p_table_name, p_record_id, p_metadata);
END;
$$;

-- ============================================================
-- IS_ADMIN HELPER
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('kapaklar',  'kapaklar',  true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatarlar', 'avatarlar', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "kapaklar_select_public"  ON storage.objects;
DROP POLICY IF EXISTS "kapaklar_insert_auth"    ON storage.objects;
DROP POLICY IF EXISTS "avatarlar_select_public" ON storage.objects;
DROP POLICY IF EXISTS "avatarlar_insert_auth"   ON storage.objects;
DROP POLICY IF EXISTS "avatarlar_update_own"    ON storage.objects;
DROP POLICY IF EXISTS "avatarlar_delete_own"    ON storage.objects;

CREATE POLICY "kapaklar_select_public"  ON storage.objects FOR SELECT USING (bucket_id = 'kapaklar');
CREATE POLICY "kapaklar_insert_auth"    ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'kapaklar' AND auth.role() = 'authenticated');
CREATE POLICY "avatarlar_select_public" ON storage.objects FOR SELECT USING (bucket_id = 'avatarlar');
CREATE POLICY "avatarlar_insert_auth"   ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatarlar' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.yorumlar;
ALTER PUBLICATION supabase_realtime ADD TABLE public.begeniler;
ALTER PUBLICATION supabase_realtime ADD TABLE public.takip;

-- ============================================================
-- VERIFY
-- ============================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

-- ============================================================
-- ANNOUNCEMENTS
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

-- Everyone can read active announcements
CREATE POLICY "announcements_select_public"
  ON public.announcements FOR SELECT USING (active = true);

-- Admins have full access
CREATE POLICY "announcements_admin_all"
  ON public.announcements FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- PREMIUM WAITLIST
-- ============================================================
CREATE TABLE IF NOT EXISTS public.premium_waitlist (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email      text NOT NULL,
  lang       text DEFAULT 'tr',
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(email)
);

ALTER TABLE public.premium_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waitlist_insert_public" ON public.premium_waitlist;
DROP POLICY IF EXISTS "waitlist_admin_all"     ON public.premium_waitlist;

-- Herkes e-posta bırakabilir
CREATE POLICY "waitlist_insert_public"
  ON public.premium_waitlist FOR INSERT
  WITH CHECK (true);

-- Sadece admin görebilir
CREATE POLICY "waitlist_admin_all"
  ON public.premium_waitlist FOR ALL
  USING (public.is_admin());
