-- ╔══════════════════════════════════════════════════════════════╗
-- ║         InkStory — MASTER DATABASE MIGRATION SCRIPT         ║
-- ║                                                              ║
-- ║  Tüm SQL dosyaları tek bir idempotent scriptte birleşti.    ║
-- ║  Supabase Dashboard → SQL Editor → New Query → Yapıştır → Run ║
-- ║                                                              ║
-- ║  ÖNEMLI: Scripti ilk kez çalıştırmadan önce:               ║
-- ║    1. "YOUR_USERNAME_HERE" kısmını kendi kullanıcı adınla   ║
-- ║       değiştir (admin atama bölümü, en sonda).              ║
-- ║    2. Tüm CREATE OR REPLACE / ADD COLUMN IF NOT EXISTS      ║
-- ║       komutları idempotent'tir — tekrar çalıştırmak güvenli.║
-- ╚══════════════════════════════════════════════════════════════╝

-- ============================================================
-- §0. UZANTILAR (Extensions)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- §1. YARDIMCI FONKSİYONLAR (Helper Functions)
--     Tablolar oluşturulmadan önce tanımlanmalı (RLS'de kullanılıyor)
-- ============================================================

-- §1.1 Admin kontrolü
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- §1.2 Sahip kontrolü
CREATE OR REPLACE FUNCTION public.is_owner(owner_id uuid)
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT auth.uid() = owner_id;
$$;

-- ============================================================
-- §2. ANA TABLOLAR (Core Tables)
-- ============================================================

-- §2.1 Profiller (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    uuid        REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username              text        UNIQUE NOT NULL,
  display_name          text,
  bio                   text,
  avatar_url            text,
  banner_url            text,
  website               text,
  -- Admin & moderasyon
  is_admin              boolean     DEFAULT false,
  is_banned             boolean     DEFAULT false,
  ban_reason            text,
  banned_at             timestamptz,
  shadow_banned         boolean     DEFAULT false,
  -- Premium
  is_premium            boolean     DEFAULT false,
  premium_expires_at    timestamptz,
  stripe_customer_id    text,
  paddle_subscription_id text,
  -- AI günlük limit
  ai_calls_today        integer     DEFAULT 0,
  ai_calls_reset_at     date        DEFAULT CURRENT_DATE,
  -- E-posta tercihleri
  email_new_chapter     boolean     DEFAULT true,
  email_new_follower    boolean     DEFAULT true,
  email_new_comment     boolean     DEFAULT true,
  -- Doğrulanmış yazar
  is_verified           boolean     DEFAULT false,
  verified_at           timestamptz,
  verification_badge    text        DEFAULT 'author', -- 'author' | 'editor' | 'staff'
  -- Zaman damgaları
  created_at            timestamptz DEFAULT now() NOT NULL,
  updated_at            timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_public"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"     ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"     ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_trigger" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all"      ON public.profiles;

CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Trigger (handle_new_user) ile oluşturulur
CREATE POLICY "profiles_insert_trigger"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admin her profili yönetebilir (ban, verify vb.)
CREATE POLICY "profiles_admin_all"
  ON public.profiles FOR ALL
  USING (public.is_admin());

-- §2.2 Yeni kullanıcı kaydında otomatik profil oluştur
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
-- §3. KATEGORİLER (Categories)
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

CREATE POLICY "kategoriler_select_all"
  ON public.kategoriler FOR SELECT USING (true);

CREATE POLICY "kategoriler_admin_write"
  ON public.kategoriler FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Tüm kategorileri upsert et (idempotent)
INSERT INTO public.kategoriler (ad, slug, renk, ikon, aciklama) VALUES
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

-- ============================================================
-- §4. HİKAYELER (Stories)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hikayeler (
  id                 uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  yazar_id           uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  kategori_id        integer     REFERENCES public.kategoriler(id),
  baslik             text        NOT NULL,
  slug               text        UNIQUE NOT NULL,
  aciklama           text,
  kapak_url          text,
  etiketler          text[]      DEFAULT '{}',
  durum              text        DEFAULT 'taslak' CHECK (durum IN ('taslak','yayinda','tamamlandi')),
  dil                text        DEFAULT 'tr',
  yetiskin_ici       boolean     DEFAULT false,
  goruntuleme        integer     DEFAULT 0,
  -- Admin & moderasyon
  is_featured        boolean     DEFAULT false,
  is_locked          boolean     DEFAULT false,
  moderation_status  text        DEFAULT 'ok' CHECK (moderation_status IN ('ok','flagged','removed')),
  -- Discovery
  is_daily_pick      boolean     DEFAULT false,
  daily_pick_at      timestamptz,
  boost_until        timestamptz,
  momentum_score     numeric     DEFAULT 0,
  -- Zaman damgaları
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

CREATE POLICY "hikayeler_select_published"
  ON public.hikayeler FOR SELECT
  USING (durum IN ('yayinda','tamamlandi'));

CREATE POLICY "hikayeler_select_own"
  ON public.hikayeler FOR SELECT
  USING (auth.uid() = yazar_id);

CREATE POLICY "hikayeler_insert_auth"
  ON public.hikayeler FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = yazar_id);

CREATE POLICY "hikayeler_update_own"
  ON public.hikayeler FOR UPDATE
  USING (auth.uid() = yazar_id) WITH CHECK (auth.uid() = yazar_id);

CREATE POLICY "hikayeler_delete_own"
  ON public.hikayeler FOR DELETE
  USING (auth.uid() = yazar_id);

CREATE POLICY "hikayeler_admin_all"
  ON public.hikayeler FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Full-text search sütunu
ALTER TABLE public.hikayeler
  ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('turkish', coalesce(baslik, '')), 'A') ||
    setweight(to_tsvector('turkish', coalesce(aciklama, '')), 'B')
  ) STORED;

-- Görüntülenme sayacı
CREATE OR REPLACE FUNCTION public.increment_goruntuleme(hikaye_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.hikayeler SET goruntuleme = goruntuleme + 1 WHERE id = hikaye_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Yeni hikayeye 48 saatlik boost ver
CREATE OR REPLACE FUNCTION public.auto_boost_new_story()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.boost_until := now() + interval '48 hours';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS story_auto_boost ON public.hikayeler;
CREATE TRIGGER story_auto_boost
  BEFORE INSERT ON public.hikayeler
  FOR EACH ROW EXECUTE FUNCTION public.auto_boost_new_story();

-- ============================================================
-- §5. BÖLÜMLER (Chapters)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bolumler (
  id            uuid    DEFAULT uuid_generate_v4() PRIMARY KEY,
  hikaye_id     uuid    REFERENCES public.hikayeler(id) ON DELETE CASCADE NOT NULL,
  yazar_id      uuid    REFERENCES public.profiles(id)  ON DELETE CASCADE NOT NULL,
  baslik        text    NOT NULL,
  icerik        text    NOT NULL DEFAULT '',
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
DROP POLICY IF EXISTS "bolumler_admin_all"        ON public.bolumler;

CREATE POLICY "bolumler_select_published"
  ON public.bolumler FOR SELECT
  USING (
    yayinda = true AND
    EXISTS (SELECT 1 FROM public.hikayeler h WHERE h.id = hikaye_id AND h.durum IN ('yayinda','tamamlandi'))
  );

CREATE POLICY "bolumler_select_own"  ON public.bolumler FOR SELECT  USING (auth.uid() = yazar_id);
CREATE POLICY "bolumler_insert_own"  ON public.bolumler FOR INSERT
  WITH CHECK (
    auth.uid() = yazar_id AND
    EXISTS (SELECT 1 FROM public.hikayeler h WHERE h.id = hikaye_id AND h.yazar_id = auth.uid())
  );
CREATE POLICY "bolumler_update_own"  ON public.bolumler FOR UPDATE  USING (auth.uid() = yazar_id) WITH CHECK (auth.uid() = yazar_id);
CREATE POLICY "bolumler_delete_own"  ON public.bolumler FOR DELETE  USING (auth.uid() = yazar_id);
CREATE POLICY "bolumler_admin_all"   ON public.bolumler FOR ALL     USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- §5.5 BÖLÜM TASLAKLARI (Chapter Drafts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bolum_taslaklar (
  bolum_id   uuid         REFERENCES public.bolumler(id) ON DELETE CASCADE PRIMARY KEY,
  yazar_id   uuid         REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  baslik     text         NOT NULL,
  icerik     text         NOT NULL DEFAULT '',
  saved_at   timestamptz  DEFAULT now() NOT NULL
);

ALTER TABLE public.bolum_taslaklar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bolum_taslaklar_all_own" ON public.bolum_taslaklar;
CREATE POLICY "bolum_taslaklar_all_own"
  ON public.bolum_taslaklar FOR ALL
  USING (auth.uid() = yazar_id)
  WITH CHECK (auth.uid() = yazar_id);

-- ============================================================
-- §6. YORUMLAR (Comments) + Satır arası yorum (Inline) desteği
-- ============================================================
CREATE TABLE IF NOT EXISTS public.yorumlar (
  id              uuid    DEFAULT uuid_generate_v4() PRIMARY KEY,
  hikaye_id       uuid    REFERENCES public.hikayeler(id) ON DELETE CASCADE NOT NULL,
  bolum_id        uuid    REFERENCES public.bolumler(id)  ON DELETE CASCADE,
  yazar_id        uuid    REFERENCES public.profiles(id)  ON DELETE CASCADE NOT NULL,
  icerik          text    NOT NULL,
  ust_yorum_id    uuid    REFERENCES public.yorumlar(id)  ON DELETE CASCADE,
  -- Wattpad-style satır arası yorum desteği
  paragraph_index integer DEFAULT NULL,
  -- Moderasyon
  is_deleted      boolean DEFAULT false,
  moderation_flag boolean DEFAULT false,
  created_at      timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.yorumlar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "yorumlar_select_public" ON public.yorumlar;
DROP POLICY IF EXISTS "yorumlar_insert_auth"   ON public.yorumlar;
DROP POLICY IF EXISTS "yorumlar_delete_own"    ON public.yorumlar;
DROP POLICY IF EXISTS "yorumlar_admin_all"     ON public.yorumlar;

CREATE POLICY "yorumlar_select_public"
  ON public.yorumlar FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.hikayeler h WHERE h.id = hikaye_id AND h.durum IN ('yayinda','tamamlandi')));

CREATE POLICY "yorumlar_insert_auth"
  ON public.yorumlar FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND auth.uid() = yazar_id AND
    EXISTS (SELECT 1 FROM public.hikayeler h WHERE h.id = hikaye_id AND h.durum IN ('yayinda','tamamlandi'))
  );

CREATE POLICY "yorumlar_delete_own"
  ON public.yorumlar FOR DELETE USING (auth.uid() = yazar_id);

CREATE POLICY "yorumlar_admin_all"
  ON public.yorumlar FOR ALL USING (public.is_admin());

-- ============================================================
-- §7. BEĞENİLER (Likes)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.begeniler (
  id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  kullanici_id uuid REFERENCES public.profiles(id)  ON DELETE CASCADE NOT NULL,
  hikaye_id    uuid REFERENCES public.hikayeler(id) ON DELETE CASCADE,
  bolum_id     uuid REFERENCES public.bolumler(id)  ON DELETE CASCADE,
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
-- §8. TAKİP (Follow)
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
-- §9. OKUMA LİSTESİ + KLASÖRLER (Reading List + Folders)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.okuma_listesi (
  id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  kullanici_id uuid REFERENCES public.profiles(id)  ON DELETE CASCADE NOT NULL,
  hikaye_id    uuid REFERENCES public.hikayeler(id) ON DELETE CASCADE NOT NULL,
  klasor_id    uuid,  -- FK aşağıda ekleniyor
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

-- Okuma listesi klasörleri
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
DROP POLICY IF EXISTS "Kendi klasörlerini gör" ON public.okuma_klasorleri;
DROP POLICY IF EXISTS "Kendi klasörünü yönet" ON public.okuma_klasorleri;
CREATE POLICY "Kendi klasörlerini gör" ON public.okuma_klasorleri FOR SELECT USING (auth.uid() = kullanici_id);
CREATE POLICY "Kendi klasörünü yönet"  ON public.okuma_klasorleri FOR ALL    USING (auth.uid() = kullanici_id) WITH CHECK (auth.uid() = kullanici_id);

ALTER TABLE public.okuma_listesi DROP CONSTRAINT IF EXISTS okuma_listesi_klasor_fk;
ALTER TABLE public.okuma_listesi
  ADD CONSTRAINT okuma_listesi_klasor_fk FOREIGN KEY (klasor_id)
  REFERENCES public.okuma_klasorleri(id) ON DELETE SET NULL
  NOT VALID;

-- ============================================================
-- §10. OKUMA İLERLEMESİ (Reading Progress)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reading_progress (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id)       ON DELETE CASCADE NOT NULL,
  hikaye_id   uuid        REFERENCES public.hikayeler(id) ON DELETE CASCADE NOT NULL,
  bolum_no    integer     NOT NULL DEFAULT 1,
  total_bolum integer     NOT NULL DEFAULT 1,
  updated_at  timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, hikaye_id)
);

ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rp_select_own" ON public.reading_progress;
DROP POLICY IF EXISTS "rp_upsert_own" ON public.reading_progress;
DROP POLICY IF EXISTS "rp_update_own" ON public.reading_progress;
DROP POLICY IF EXISTS "rp_delete_own" ON public.reading_progress;

CREATE POLICY "rp_select_own" ON public.reading_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rp_upsert_own" ON public.reading_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rp_update_own" ON public.reading_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rp_delete_own" ON public.reading_progress FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- §11. HİKAYE ABONELİKLERİ (Story Subscriptions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hikaye_abonelikleri (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  hikaye_id  uuid NOT NULL REFERENCES public.hikayeler(id)  ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, hikaye_id)
);

ALTER TABLE public.hikaye_abonelikleri ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "abonelik_select_own" ON public.hikaye_abonelikleri;
DROP POLICY IF EXISTS "abonelik_insert_own" ON public.hikaye_abonelikleri;
DROP POLICY IF EXISTS "abonelik_delete_own" ON public.hikaye_abonelikleri;

CREATE POLICY "abonelik_select_own" ON public.hikaye_abonelikleri FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "abonelik_insert_own" ON public.hikaye_abonelikleri FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "abonelik_delete_own" ON public.hikaye_abonelikleri FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.hikaye_abone_sayilari AS
  SELECT hikaye_id, COUNT(*) as abone_sayisi
  FROM public.hikaye_abonelikleri
  GROUP BY hikaye_id;

-- ============================================================
-- §12. YORUM BEĞENİLERİ (Comment Likes)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.yorum_begeniler (
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  yorum_id   uuid REFERENCES public.yorumlar(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, yorum_id)
);

ALTER TABLE public.yorum_begeniler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Herkes görebilir" ON public.yorum_begeniler;
DROP POLICY IF EXISTS "Kendi beğenisi"   ON public.yorum_begeniler;
DROP POLICY IF EXISTS "Beğeni kaldır"    ON public.yorum_begeniler;

CREATE POLICY "Herkes görebilir" ON public.yorum_begeniler FOR SELECT USING (true);
CREATE POLICY "Kendi beğenisi"   ON public.yorum_begeniler FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Beğeni kaldır"    ON public.yorum_begeniler FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- §13. ENGELLEMELER (Blocks) + DM SİSTEMİ
-- ============================================================

-- §13.1 Engellemeler
CREATE TABLE IF NOT EXISTS public.engellemeler (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engelleyen_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  engellenen_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(engelleyen_id, engellenen_id),
  CHECK (engelleyen_id != engellenen_id)
);

ALTER TABLE public.engellemeler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kendi engellemelerini gör" ON public.engellemeler;
DROP POLICY IF EXISTS "Engelle"                   ON public.engellemeler;
DROP POLICY IF EXISTS "Engeli kaldır"             ON public.engellemeler;

CREATE POLICY "Kendi engellemelerini gör" ON public.engellemeler FOR SELECT USING (auth.uid() = engelleyen_id);
CREATE POLICY "Engelle"                   ON public.engellemeler FOR INSERT WITH CHECK (auth.uid() = engelleyen_id AND engelleyen_id != engellenen_id);
CREATE POLICY "Engeli kaldır"             ON public.engellemeler FOR DELETE USING (auth.uid() = engelleyen_id);

-- §13.2 DM Konuşmaları
CREATE TABLE IF NOT EXISTS public.konusmalar (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  katilimci_1  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  katilimci_2  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  son_mesaj_at timestamptz DEFAULT now(),
  created_at   timestamptz DEFAULT now(),
  UNIQUE(katilimci_1, katilimci_2),
  CHECK (katilimci_1 < katilimci_2)
);

ALTER TABLE public.konusmalar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kendi konuşmalarını gör" ON public.konusmalar;
DROP POLICY IF EXISTS "Konuşma başlat"          ON public.konusmalar;
DROP POLICY IF EXISTS "Konuşmayı güncelle"      ON public.konusmalar;

CREATE POLICY "Kendi konuşmalarını gör" ON public.konusmalar FOR SELECT USING (auth.uid() = katilimci_1 OR auth.uid() = katilimci_2);
CREATE POLICY "Konuşma başlat"          ON public.konusmalar FOR INSERT WITH CHECK (auth.uid() = katilimci_1 OR auth.uid() = katilimci_2);
CREATE POLICY "Konuşmayı güncelle"      ON public.konusmalar FOR UPDATE USING (auth.uid() = katilimci_1 OR auth.uid() = katilimci_2);

-- §13.3 DM Mesajları
CREATE TABLE IF NOT EXISTS public.mesajlar (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  konusma_id  uuid NOT NULL REFERENCES public.konusmalar(id) ON DELETE CASCADE,
  gonderen_id uuid NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  icerik      text NOT NULL CHECK (char_length(icerik) BETWEEN 1 AND 2000),
  okundu      boolean DEFAULT false,
  silinmis    boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.mesajlar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Konuşma üyesi mesajları görebilir" ON public.mesajlar;
DROP POLICY IF EXISTS "Mesaj gönder"                      ON public.mesajlar;
DROP POLICY IF EXISTS "Kendi mesajını güncelle (sil)"     ON public.mesajlar;

CREATE POLICY "Konuşma üyesi mesajları görebilir" ON public.mesajlar FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.konusmalar k WHERE k.id = konusma_id AND (k.katilimci_1 = auth.uid() OR k.katilimci_2 = auth.uid())));
CREATE POLICY "Mesaj gönder" ON public.mesajlar FOR INSERT
  WITH CHECK (auth.uid() = gonderen_id AND EXISTS (SELECT 1 FROM public.konusmalar k WHERE k.id = konusma_id AND (k.katilimci_1 = auth.uid() OR k.katilimci_2 = auth.uid())));
CREATE POLICY "Kendi mesajını güncelle (sil)" ON public.mesajlar FOR UPDATE USING (auth.uid() = gonderen_id);

-- ============================================================
-- §14. RAPORLAR & MODERASİYON (Reports & Moderation)
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

DROP POLICY IF EXISTS "reports_insert_auth" ON public.reports;
DROP POLICY IF EXISTS "reports_select_own"  ON public.reports;
DROP POLICY IF EXISTS "reports_admin_all"   ON public.reports;

CREATE POLICY "reports_insert_auth" ON public.reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = reporter_id);
CREATE POLICY "reports_select_own"  ON public.reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "reports_admin_all"   ON public.reports FOR ALL   USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- §15. AI KULLANIM LOGLARI (AI Usage Logs)
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
CREATE POLICY "ai_logs_admin_all"   ON public.ai_usage_logs FOR ALL   USING (public.is_admin());

-- ============================================================
-- §16. AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action     text NOT NULL,
  table_name text,
  record_id  uuid,
  metadata   jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_admin_all"     ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_admin_select"  ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_system_insert" ON public.audit_log;

CREATE POLICY "audit_admin_all"         ON public.audit_log FOR ALL    USING (public.is_admin());
CREATE POLICY "audit_log_system_insert" ON public.audit_log FOR INSERT WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_audit(
  p_action     text,
  p_table_name text DEFAULT NULL,
  p_record_id  uuid DEFAULT NULL,
  p_metadata   text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.audit_log(admin_id, action, table_name, record_id, metadata)
  VALUES (
    auth.uid(),
    p_action,
    p_table_name,
    p_record_id,
    CASE WHEN p_metadata IS NOT NULL THEN p_metadata::jsonb ELSE NULL END
  );
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- ============================================================
-- §17. DUYURULAR (Announcements)
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

CREATE POLICY "announcements_select_public"
  ON public.announcements FOR SELECT USING (active = true);

CREATE POLICY "announcements_admin_all"
  ON public.announcements FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- §18. PREMIUM — Abonelikler & Ödemeler
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id     text,
  plan                   text NOT NULL CHECK (plan IN ('monthly','yearly','lifetime')),
  status                 text NOT NULL CHECK (status IN ('active','cancelled','expired','past_due')),
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean DEFAULT false,
  created_at             timestamptz DEFAULT now() NOT NULL,
  updated_at             timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_select_own"    ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_admin_all"     ON public.subscriptions;

CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_admin_all"  ON public.subscriptions FOR ALL   USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.payments (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_id   uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  stripe_payment_id text UNIQUE,
  amount            integer NOT NULL,
  currency          text DEFAULT 'try',
  status            text NOT NULL CHECK (status IN ('succeeded','failed','pending','refunded')),
  plan              text,
  created_at        timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select_own" ON public.payments;
DROP POLICY IF EXISTS "payments_admin_all"  ON public.payments;

CREATE POLICY "payments_select_own" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payments_admin_all"  ON public.payments FOR ALL   USING (public.is_admin());

-- §18.1 AI günlük limit sıfırlama
CREATE OR REPLACE FUNCTION public.reset_ai_calls_if_needed(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles
  SET ai_calls_today = 0, ai_calls_reset_at = CURRENT_DATE
  WHERE id = p_user_id AND ai_calls_reset_at < CURRENT_DATE;
END;
$$;

-- §18.2 AI çağrı sayacı arttır
CREATE OR REPLACE FUNCTION public.increment_ai_calls(p_user_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_calls integer;
BEGIN
  PERFORM public.reset_ai_calls_if_needed(p_user_id);
  UPDATE public.profiles
  SET ai_calls_today = ai_calls_today + 1
  WHERE id = p_user_id
  RETURNING ai_calls_today INTO v_calls;
  RETURN v_calls;
END;
$$;

-- ============================================================
-- §19. KULLANICI TERCİHLERİ (User Preferences)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category   text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, category)
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prefs_select_own" ON public.user_preferences;
DROP POLICY IF EXISTS "prefs_insert_own" ON public.user_preferences;
DROP POLICY IF EXISTS "prefs_delete_own" ON public.user_preferences;
DROP POLICY IF EXISTS "prefs_admin_all"  ON public.user_preferences;

CREATE POLICY "prefs_select_own" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "prefs_insert_own" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "prefs_delete_own" ON public.user_preferences FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "prefs_admin_all"  ON public.user_preferences FOR ALL   USING (public.is_admin());

-- ============================================================
-- §20. YAZAR DOĞRULAMA (Verification Applications)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.verification_applications (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reject_reason  text,
  follower_count integer DEFAULT 0,
  read_count     integer DEFAULT 0,
  chapter_count  integer DEFAULT 0,
  reviewed_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at    timestamptz,
  created_at     timestamptz DEFAULT now() NOT NULL,
  updated_at     timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.verification_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verify_select_own" ON public.verification_applications;
DROP POLICY IF EXISTS "verify_insert_own" ON public.verification_applications;
DROP POLICY IF EXISTS "verify_admin_all"  ON public.verification_applications;

CREATE POLICY "verify_select_own" ON public.verification_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "verify_insert_own" ON public.verification_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "verify_admin_all"  ON public.verification_applications FOR ALL   USING (public.is_admin());

-- ============================================================
-- §21. ENGAGEMENT LOGS + TRENDING SİSTEMİ
-- ============================================================
CREATE TABLE IF NOT EXISTS public.engagement_logs (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hikaye_id  uuid REFERENCES public.hikayeler(id) ON DELETE CASCADE NOT NULL,
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_hash    text,
  event_type text NOT NULL CHECK (event_type IN ('read','like','comment','bookmark','view')),
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.engagement_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "engagement_insert_auth"      ON public.engagement_logs;
DROP POLICY IF EXISTS "engagement_insert_anon"      ON public.engagement_logs;
DROP POLICY IF EXISTS "engagement_admin_all"        ON public.engagement_logs;
DROP POLICY IF EXISTS "engagement_logs_public_read" ON public.engagement_logs;

CREATE POLICY "engagement_insert_auth"
  ON public.engagement_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "engagement_insert_anon"
  ON public.engagement_logs FOR INSERT WITH CHECK (user_id IS NULL);
CREATE POLICY "engagement_admin_all"
  ON public.engagement_logs FOR ALL USING (public.is_admin());
CREATE POLICY "engagement_logs_public_read"
  ON public.engagement_logs FOR SELECT USING (true);

-- Trending cache
CREATE TABLE IF NOT EXISTS public.trending_cache (
  id          serial PRIMARY KEY,
  stories     jsonb NOT NULL,
  computed_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.trending_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trending_cache_select_public" ON public.trending_cache;
DROP POLICY IF EXISTS "trending_cache_admin_all"     ON public.trending_cache;

CREATE POLICY "trending_cache_select_public" ON public.trending_cache FOR SELECT USING (true);
CREATE POLICY "trending_cache_admin_all"     ON public.trending_cache FOR ALL USING (public.is_admin());

-- §21.1 Anti-spam engagement limiter
CREATE OR REPLACE FUNCTION public.can_log_engagement(
  p_hikaye_id  uuid,
  p_user_id    uuid,
  p_ip_hash    text,
  p_event_type text
)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM public.engagement_logs
    WHERE hikaye_id = p_hikaye_id AND user_id = p_user_id AND event_type = p_event_type
      AND created_at > now() - interval '1 hour';
    RETURN v_count = 0;
  END IF;
  IF p_ip_hash IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM public.engagement_logs
    WHERE hikaye_id = p_hikaye_id AND ip_hash = p_ip_hash AND event_type = p_event_type
      AND created_at > now() - interval '1 hour';
    RETURN v_count = 0;
  END IF;
  RETURN true;
END;
$$;

-- §21.2 Trending stories RPC v2 (veritabanı seviyesinde hesaplama)
CREATE OR REPLACE FUNCTION public.get_trending_stories_v2(p_limit integer DEFAULT 10)
RETURNS TABLE (
  id            uuid,
  baslik        text,
  slug          text,
  kapak_url     text,
  goruntuleme   integer,
  created_at    timestamptz,
  yazar_id      uuid,
  kategori_id   integer,
  trending_score numeric,
  reads_24h     bigint,
  likes_24h     bigint,
  comments_24h  bigint,
  bookmarks_24h bigint,
  profiles      jsonb,
  kategoriler   jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH engagement_24h AS (
    SELECT
      hikaye_id,
      COUNT(*) FILTER (WHERE event_type = 'read')     AS reads_24h,
      COUNT(*) FILTER (WHERE event_type = 'like')     AS likes_24h,
      COUNT(*) FILTER (WHERE event_type = 'comment')  AS comments_24h,
      COUNT(*) FILTER (WHERE event_type = 'bookmark') AS bookmarks_24h
    FROM public.engagement_logs
    WHERE created_at > now() - interval '24 hours'
    GROUP BY hikaye_id
  ),
  scored AS (
    SELECT
      h.id, h.baslik, h.slug, h.kapak_url, h.goruntuleme, h.created_at,
      h.yazar_id, h.kategori_id,
      COALESCE(e.reads_24h,    0) AS reads_24h,
      COALESCE(e.likes_24h,    0) AS likes_24h,
      COALESCE(e.comments_24h, 0) AS comments_24h,
      COALESCE(e.bookmarks_24h,0) AS bookmarks_24h,
      (
        COALESCE(e.reads_24h,    0) * 1.0 +
        COALESCE(e.likes_24h,    0) * 3.0 +
        COALESCE(e.comments_24h, 0) * 4.0 +
        COALESCE(e.bookmarks_24h,0) * 2.0
      ) / NULLIF(SQRT(EXTRACT(EPOCH FROM (now() - h.created_at)) / 3600.0 + 2), 0) AS trending_score
    FROM public.hikayeler h
    LEFT JOIN engagement_24h e ON e.hikaye_id = h.id
    WHERE h.durum IN ('yayinda','tamamlandi')
  )
  SELECT
    s.id, s.baslik, s.slug, s.kapak_url, s.goruntuleme, s.created_at,
    s.yazar_id, s.kategori_id, s.trending_score,
    s.reads_24h, s.likes_24h, s.comments_24h, s.bookmarks_24h,
    jsonb_build_object(
      'id', p.id, 'username', p.username, 'display_name', p.display_name,
      'avatar_url', p.avatar_url, 'is_premium', COALESCE(p.is_premium, false),
      'is_verified', COALESCE(p.is_verified, false)
    ) AS profiles,
    CASE WHEN k.id IS NOT NULL THEN jsonb_build_object('id',k.id,'ad',k.ad,'slug',k.slug,'renk',k.renk,'ikon',k.ikon) ELSE NULL END AS kategoriler
  FROM scored s
  JOIN public.profiles p ON p.id = s.yazar_id
  LEFT JOIN public.kategoriler k ON k.id = s.kategori_id
  ORDER BY s.trending_score DESC
  LIMIT p_limit;
$$;

-- §21.3 Eski engagement logları temizle (7 günden eski)
CREATE OR REPLACE FUNCTION public.cleanup_old_engagement_logs()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM public.engagement_logs WHERE created_at < now() - interval '7 days';
$$;

-- ============================================================
-- §22. DISCOVERY SİSTEMİ (Verified Authors & Featured)
-- ============================================================

-- §22.1 Yükselen Kalemler (Rising Writers)
CREATE OR REPLACE FUNCTION public.get_rising_writers(p_limit integer DEFAULT 5)
RETURNS TABLE (
  story_id     uuid,
  story_baslik text,
  story_slug   text,
  story_kapak  text,
  yazar_id     uuid,
  username     text,
  display_name text,
  avatar_url   text,
  reads_24h    bigint,
  likes_24h    bigint,
  momentum     numeric
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH eng AS (
    SELECT
      h.id AS story_id,
      COUNT(*) FILTER (WHERE e.event_type = 'read') AS reads_24h,
      COUNT(*) FILTER (WHERE e.event_type = 'like') AS likes_24h
    FROM public.hikayeler h
    JOIN public.engagement_logs e ON e.hikaye_id = h.id
    WHERE e.created_at > now() - interval '24 hours'
      AND h.durum IN ('yayinda','tamamlandi')
    GROUP BY h.id
    HAVING COUNT(*) > 3
  ),
  scored AS (
    SELECT
      h.id, h.baslik, h.slug, h.kapak_url,
      p.id AS yazar_id, p.username, p.display_name, p.avatar_url,
      COALESCE(e.reads_24h, 0) AS reads_24h,
      COALESCE(e.likes_24h, 0) AS likes_24h,
      (COALESCE(e.reads_24h,0) + COALESCE(e.likes_24h,0) * 4.0)
      / NULLIF(SQRT(GREATEST((SELECT COUNT(*) FROM public.takip WHERE takip_edilen_id = p.id), 1)), 0) AS momentum
    FROM public.hikayeler h
    JOIN public.profiles p ON p.id = h.yazar_id
    JOIN eng e ON e.story_id = h.id
    WHERE p.is_verified = false
      AND (SELECT COUNT(*) FROM public.takip WHERE takip_edilen_id = p.id) < 500
  )
  SELECT * FROM scored ORDER BY momentum DESC LIMIT p_limit;
$$;

-- §22.2 Günün seçimi
CREATE OR REPLACE FUNCTION public.get_daily_pick()
RETURNS TABLE (
  id uuid, baslik text, slug text, kapak_url text,
  goruntuleme integer, daily_pick_at timestamptz,
  profiles jsonb, kategoriler jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    h.id, h.baslik, h.slug, h.kapak_url, h.goruntuleme, h.daily_pick_at,
    jsonb_build_object('username', p.username, 'display_name', p.display_name,
      'avatar_url', p.avatar_url, 'is_premium', p.is_premium, 'is_verified', p.is_verified) AS profiles,
    CASE WHEN k.id IS NOT NULL
      THEN jsonb_build_object('ad', k.ad, 'ikon', k.ikon, 'renk', k.renk, 'slug', k.slug)
      ELSE NULL END AS kategoriler
  FROM public.hikayeler h
  JOIN public.profiles p ON p.id = h.yazar_id
  LEFT JOIN public.kategoriler k ON k.id = h.kategori_id
  WHERE h.is_daily_pick = true
    AND h.daily_pick_at > now() - interval '24 hours'
    AND h.durum IN ('yayinda','tamamlandi')
  ORDER BY h.daily_pick_at DESC
  LIMIT 1;
$$;

-- §22.3 Günlük seçim ve boost'u kaldır
CREATE OR REPLACE FUNCTION public.expire_daily_picks()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.hikayeler SET is_daily_pick = false
  WHERE is_daily_pick = true AND daily_pick_at < now() - interval '24 hours';

  UPDATE public.hikayeler SET boost_until = NULL
  WHERE boost_until IS NOT NULL AND (boost_until < now() OR goruntuleme >= 100);
$$;

-- ============================================================
-- §23. E-POSTA LOGLARI (Email Logs)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_logs (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type     text NOT NULL, -- 'new_chapter' | 'new_follower' | 'new_comment'
  ref_id   uuid,
  sent_at  timestamptz DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_logs_admin_all" ON public.email_logs;
CREATE POLICY "email_logs_admin_all" ON public.email_logs FOR ALL USING (public.is_admin());

-- ============================================================
-- §24. PREMIUM BEKLEMELİSTESİ (Waitlist)
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

CREATE POLICY "waitlist_insert_public" ON public.premium_waitlist FOR INSERT WITH CHECK (true);
CREATE POLICY "waitlist_admin_all"     ON public.premium_waitlist FOR ALL   USING (public.is_admin());

-- ============================================================
-- §25. STORAGE BUCKETS & GÜVENLİK POLİTİKALARI
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('kapaklar',  'kapaklar',  true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatarlar', 'avatarlar', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('banners',   'banners',   true) ON CONFLICT (id) DO NOTHING;

-- Tüm eski storage politikalarını temizle
DROP POLICY IF EXISTS "kapaklar_select_public"  ON storage.objects;
DROP POLICY IF EXISTS "kapaklar_insert_auth"    ON storage.objects;
DROP POLICY IF EXISTS "kapaklar_insert_own"     ON storage.objects;
DROP POLICY IF EXISTS "kapaklar_update_own"     ON storage.objects;
DROP POLICY IF EXISTS "kapaklar_delete_own"     ON storage.objects;
DROP POLICY IF EXISTS "avatarlar_select_public" ON storage.objects;
DROP POLICY IF EXISTS "avatarlar_insert_auth"   ON storage.objects;
DROP POLICY IF EXISTS "avatarlar_update_own"    ON storage.objects;
DROP POLICY IF EXISTS "avatarlar_delete_own"    ON storage.objects;
DROP POLICY IF EXISTS "banners_public_read"     ON storage.objects;
DROP POLICY IF EXISTS "banners_auth_upload"     ON storage.objects;
DROP POLICY IF EXISTS "banners_auth_delete"     ON storage.objects;

-- KAPAKLAR (Hikaye kapakları — hikaye sahibi kontrolü)
CREATE POLICY "kapaklar_select_public"
  ON storage.objects FOR SELECT USING (bucket_id = 'kapaklar');

CREATE POLICY "kapaklar_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'kapaklar' AND auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.hikayeler h WHERE h.id::text = (storage.foldername(name))[1] AND h.yazar_id = auth.uid())
  );

CREATE POLICY "kapaklar_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'kapaklar' AND auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.hikayeler h WHERE h.id::text = (storage.foldername(name))[1] AND h.yazar_id = auth.uid())
  );

CREATE POLICY "kapaklar_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'kapaklar' AND auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.hikayeler h WHERE h.id::text = (storage.foldername(name))[1] AND h.yazar_id = auth.uid())
  );

-- AVATARLAR (Kullanıcı avatarları — kişisel klasör)
CREATE POLICY "avatarlar_select_public"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatarlar');

CREATE POLICY "avatarlar_insert_auth"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatarlar' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatarlar_update_own"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatarlar' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatarlar_delete_own"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatarlar' AND (storage.foldername(name))[1] = auth.uid()::text);

-- BANNERS (Profil banner'ları)
CREATE POLICY "banners_public_read"
  ON storage.objects FOR SELECT USING (bucket_id = 'banners');

CREATE POLICY "banners_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'banners' AND auth.role() = 'authenticated');

CREATE POLICY "banners_auth_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- §26. PERFORMANS İNDEKSLERİ (Indexes)
-- ============================================================

-- Hikayeler
CREATE INDEX IF NOT EXISTS hikayeler_fts_idx        ON public.hikayeler USING gin(fts);
CREATE INDEX IF NOT EXISTS hikayeler_durum_idx      ON public.hikayeler(durum, created_at DESC);
CREATE INDEX IF NOT EXISTS hikayeler_yazar_idx      ON public.hikayeler(yazar_id);
CREATE INDEX IF NOT EXISTS hikayeler_featured_idx   ON public.hikayeler(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS hikayeler_daily_idx      ON public.hikayeler(is_daily_pick, daily_pick_at DESC);
CREATE INDEX IF NOT EXISTS hikayeler_boost_idx      ON public.hikayeler(boost_until);
CREATE INDEX IF NOT EXISTS hikayeler_cat_slug_idx   ON public.hikayeler(kategori_id);

-- Profiller
CREATE INDEX IF NOT EXISTS profiles_verified_idx    ON public.profiles(is_verified);
CREATE INDEX IF NOT EXISTS profiles_banned_idx      ON public.profiles(is_banned) WHERE is_banned = true;
CREATE INDEX IF NOT EXISTS idx_profiles_premium     ON public.profiles(is_premium, premium_expires_at) WHERE is_premium = true;

-- Yorumlar
CREATE INDEX IF NOT EXISTS idx_yorumlar_paragraph   ON public.yorumlar(bolum_id, paragraph_index) WHERE paragraph_index IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_yorumlar_ust         ON public.yorumlar(ust_yorum_id) WHERE ust_yorum_id IS NOT NULL;

-- Takip & Engagement
CREATE INDEX IF NOT EXISTS engagement_hikaye_idx    ON public.engagement_logs(hikaye_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS engagement_user_story_idx ON public.engagement_logs(user_id, hikaye_id, event_type);
CREATE INDEX IF NOT EXISTS engagement_ip_story_idx  ON public.engagement_logs(ip_hash, hikaye_id, event_type);
CREATE INDEX IF NOT EXISTS engagement_created_idx   ON public.engagement_logs(created_at DESC);

-- Abonelikler & Ödemeler
CREATE INDEX IF NOT EXISTS subscriptions_user_idx   ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS payments_user_idx        ON public.payments(user_id);

-- Raporlar
CREATE INDEX IF NOT EXISTS reports_status_idx       ON public.reports(status);
CREATE INDEX IF NOT EXISTS reports_target_idx       ON public.reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS reports_reporter_idx     ON public.reports(reporter_id);

-- AI logları
CREATE INDEX IF NOT EXISTS ai_logs_user_idx         ON public.ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS ai_logs_created_idx      ON public.ai_usage_logs(created_at DESC);

-- Audit log
CREATE INDEX IF NOT EXISTS audit_log_admin_idx      ON public.audit_log(admin_id, created_at DESC);

-- Doğrulama başvuruları
CREATE INDEX IF NOT EXISTS verify_apps_status_idx   ON public.verification_applications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS verify_apps_user_idx     ON public.verification_applications(user_id);

-- DM
CREATE INDEX IF NOT EXISTS idx_mesajlar_konusma     ON public.mesajlar(konusma_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mesajlar_okunmamis   ON public.mesajlar(konusma_id, okundu) WHERE okundu = false;
CREATE INDEX IF NOT EXISTS idx_konusmalar_k1        ON public.konusmalar(katilimci_1, son_mesaj_at DESC);
CREATE INDEX IF NOT EXISTS idx_konusmalar_k2        ON public.konusmalar(katilimci_2, son_mesaj_at DESC);
CREATE INDEX IF NOT EXISTS idx_engellemeler_kisi    ON public.engellemeler(engelleyen_id);

-- Okuma listesi & kütüphane
CREATE INDEX IF NOT EXISTS idx_okuma_klasorleri_user  ON public.okuma_klasorleri(kullanici_id);
CREATE INDEX IF NOT EXISTS idx_okuma_listesi_klasor   ON public.okuma_listesi(klasor_id) WHERE klasor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hikaye_abonelik_user   ON public.hikaye_abonelikleri(user_id);
CREATE INDEX IF NOT EXISTS idx_hikaye_abonelik_hikaye ON public.hikaye_abonelikleri(hikaye_id);

-- Reading progress
CREATE INDEX IF NOT EXISTS rp_user_idx  ON public.reading_progress(user_id);
CREATE INDEX IF NOT EXISTS rp_story_idx ON public.reading_progress(hikaye_id);

-- E-posta logları
CREATE INDEX IF NOT EXISTS email_logs_user_type ON public.email_logs(user_id, type, sent_at);

-- Tercihler
CREATE INDEX IF NOT EXISTS prefs_user_idx     ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS prefs_category_idx ON public.user_preferences(category);

-- ============================================================
-- §27. REALTIME YAYINLAR (Realtime Publications)
-- ============================================================
-- NOT: Eğer supabase_realtime yayını yoksa CREATE, varsa ADD TABLE
-- Aşağıdaki ALTER komutları idempotent değil; tablo zaten ekliyse hata vermez.
ALTER PUBLICATION supabase_realtime ADD TABLE public.yorumlar;
ALTER PUBLICATION supabase_realtime ADD TABLE public.begeniler;
ALTER PUBLICATION supabase_realtime ADD TABLE public.takip;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mesajlar;
ALTER PUBLICATION supabase_realtime ADD TABLE public.konusmalar;

-- ============================================================
-- §28. ADMİN ATAMA — ⚠️ BURAYA KENDİ KULLANICI ADINIZI YAZIN
-- ============================================================
-- Aşağıdaki satırdaki 'YOUR_USERNAME_HERE' ifadesini
-- kendi InkStory kullanıcı adınızla değiştirin:

-- UPDATE public.profiles
-- SET is_admin = true
-- WHERE username = 'YOUR_USERNAME_HERE';

-- ============================================================
-- §29. DOĞRULAMA SORGUSU (Final Verify)
-- ============================================================
SELECT
  table_name,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY table_name;
