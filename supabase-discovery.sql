-- ============================================================
-- InkStory — Verified Author + Discovery System
-- Supabase SQL Editor → New Query → Run
-- ============================================================

-- ── 1. profiles — verification fields ────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified        boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at        timestamptz,
  ADD COLUMN IF NOT EXISTS verification_badge text        DEFAULT 'author'; -- 'author' | 'editor' | 'staff'

-- ── 2. Verification applications table ───────────────────
CREATE TABLE IF NOT EXISTS public.verification_applications (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status       text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reject_reason text,
  -- Snapshot of stats at time of application
  follower_count   integer DEFAULT 0,
  read_count       integer DEFAULT 0,
  chapter_count    integer DEFAULT 0,
  -- Admin action
  reviewed_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at  timestamptz,
  created_at   timestamptz DEFAULT now() NOT NULL,
  updated_at   timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.verification_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verify_select_own"   ON public.verification_applications;
DROP POLICY IF EXISTS "verify_insert_own"   ON public.verification_applications;
DROP POLICY IF EXISTS "verify_admin_all"    ON public.verification_applications;

CREATE POLICY "verify_select_own"
  ON public.verification_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "verify_insert_own"
  ON public.verification_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "verify_admin_all"
  ON public.verification_applications FOR ALL
  USING (public.is_admin());

-- ── 3. hikayeler — discovery fields ──────────────────────
ALTER TABLE public.hikayeler
  ADD COLUMN IF NOT EXISTS is_daily_pick      boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS daily_pick_at      timestamptz,
  ADD COLUMN IF NOT EXISTS boost_until        timestamptz, -- "Şanslı İlk 100" boost
  ADD COLUMN IF NOT EXISTS momentum_score     numeric     DEFAULT 0;

-- ── 4. Function: get rising writers (Yükselen Kalemler) ──
-- Writers with good engagement ratio in last 24h but < 100 followers
CREATE OR REPLACE FUNCTION public.get_rising_writers(p_limit integer DEFAULT 5)
RETURNS TABLE (
  story_id      uuid,
  story_baslik  text,
  story_slug    text,
  story_kapak   text,
  yazar_id      uuid,
  username      text,
  display_name  text,
  avatar_url    text,
  reads_24h     bigint,
  likes_24h     bigint,
  momentum      numeric
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
      -- momentum: likes weighted higher, normalized by follower count
      (COALESCE(e.reads_24h,0) + COALESCE(e.likes_24h,0) * 4.0)
      / NULLIF(SQRT(GREATEST(
          (SELECT COUNT(*) FROM public.takip WHERE takip_edilen_id = p.id), 1
        )), 0) AS momentum
    FROM public.hikayeler h
    JOIN public.profiles p ON p.id = h.yazar_id
    JOIN eng e ON e.story_id = h.id
    WHERE p.is_verified = false
      AND (SELECT COUNT(*) FROM public.takip WHERE takip_edilen_id = p.id) < 500
  )
  SELECT * FROM scored
  ORDER BY momentum DESC
  LIMIT p_limit;
$$;

-- ── 5. Function: get daily pick story ─────────────────────
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

-- ── 6. Auto-expire daily pick and boost ───────────────────
CREATE OR REPLACE FUNCTION public.expire_daily_picks()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.hikayeler
  SET is_daily_pick = false
  WHERE is_daily_pick = true
    AND daily_pick_at < now() - interval '24 hours';

  -- Remove boost from stories that have crossed 100 views
  UPDATE public.hikayeler
  SET boost_until = NULL
  WHERE boost_until IS NOT NULL
    AND (boost_until < now() OR goruntuleme >= 100);
$$;

-- ── 7. Indexes ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS profiles_verified_idx  ON public.profiles(is_verified);
CREATE INDEX IF NOT EXISTS hikayeler_daily_idx    ON public.hikayeler(is_daily_pick, daily_pick_at DESC);
CREATE INDEX IF NOT EXISTS hikayeler_boost_idx    ON public.hikayeler(boost_until);
CREATE INDEX IF NOT EXISTS verify_apps_status_idx ON public.verification_applications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS verify_apps_user_idx   ON public.verification_applications(user_id);

-- ── 8. Auto-boost new stories (trigger) ──────────────────
CREATE OR REPLACE FUNCTION public.auto_boost_new_story()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Give new stories a 48-hour boost window
  NEW.boost_until := now() + interval '48 hours';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS story_auto_boost ON public.hikayeler;
CREATE TRIGGER story_auto_boost
  BEFORE INSERT ON public.hikayeler
  FOR EACH ROW EXECUTE FUNCTION public.auto_boost_new_story();

-- ── Verify ────────────────────────────────────────────────
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name IN ('is_verified','verification_badge')
ORDER BY column_name;
