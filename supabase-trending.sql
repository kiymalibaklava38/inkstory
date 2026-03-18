-- ============================================================
-- InkStory — Trending Stories System
-- Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- ── 1. Engagement log table (24h signals) ────────────────
-- Her okuma/beğeni/yorum/kaydetme olayını kaydeder
-- Anti-spam: aynı kullanıcı + aynı hikaye = tek sinyal
CREATE TABLE IF NOT EXISTS public.engagement_logs (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  hikaye_id  uuid        REFERENCES public.hikayeler(id) ON DELETE CASCADE NOT NULL,
  user_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_hash    text,         -- IP'nin hash'i (kullanıcısız ziyaretler için)
  event_type text        NOT NULL CHECK (event_type IN ('read','like','comment','bookmark')),
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.engagement_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "engagement_insert_auth"   ON public.engagement_logs;
DROP POLICY IF EXISTS "engagement_insert_anon"   ON public.engagement_logs;
DROP POLICY IF EXISTS "engagement_admin_all"     ON public.engagement_logs;

-- Auth kullanıcılar kendi loglarını ekleyebilir
CREATE POLICY "engagement_insert_auth"
  ON public.engagement_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Admin tümünü görebilir
CREATE POLICY "engagement_admin_all"
  ON public.engagement_logs FOR ALL
  USING (public.is_admin());

-- ── 2. Trending cache table ───────────────────────────────
-- Her 5 dakikada bir hesaplanan trending sonuçları
CREATE TABLE IF NOT EXISTS public.trending_cache (
  id            serial PRIMARY KEY,
  stories       jsonb   NOT NULL,
  computed_at   timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.trending_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trending_cache_select_public" ON public.trending_cache;
DROP POLICY IF EXISTS "trending_cache_admin_all"     ON public.trending_cache;

CREATE POLICY "trending_cache_select_public"
  ON public.trending_cache FOR SELECT USING (true);

CREATE POLICY "trending_cache_admin_all"
  ON public.trending_cache FOR ALL USING (public.is_admin());

-- ── 3. Indexes ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS engagement_hikaye_idx
  ON public.engagement_logs(hikaye_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS engagement_user_story_idx
  ON public.engagement_logs(user_id, hikaye_id, event_type);

CREATE INDEX IF NOT EXISTS engagement_ip_story_idx
  ON public.engagement_logs(ip_hash, hikaye_id, event_type);

CREATE INDEX IF NOT EXISTS engagement_created_idx
  ON public.engagement_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS hikayeler_durum_created_idx
  ON public.hikayeler(durum, created_at DESC);

-- ── 4. Anti-spam: rate limit function ────────────────────
-- Aynı kullanıcı/IP'nin aynı hikayeye 1 saatte bir kez sinyal gönderebileceğini kontrol eder
CREATE OR REPLACE FUNCTION public.can_log_engagement(
  p_hikaye_id  uuid,
  p_user_id    uuid,
  p_ip_hash    text,
  p_event_type text
)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Aynı kullanıcıdan son 1 saatte aynı olay var mı?
  IF p_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM public.engagement_logs
    WHERE hikaye_id  = p_hikaye_id
      AND user_id    = p_user_id
      AND event_type = p_event_type
      AND created_at > now() - interval '1 hour';
    RETURN v_count = 0;
  END IF;

  -- Giriş yapmamış kullanıcı: IP hash'e göre kontrol
  IF p_ip_hash IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM public.engagement_logs
    WHERE hikaye_id  = p_hikaye_id
      AND ip_hash    = p_ip_hash
      AND event_type = p_event_type
      AND created_at > now() - interval '1 hour';
    RETURN v_count = 0;
  END IF;

  RETURN true;
END;
$$;

-- ── 5. Trending score function (SQL) ─────────────────────
-- Son 24 saatin engagement'ından trending skoru hesaplar
-- Score = (reads*1 + likes*3 + comments*4 + bookmarks*2) / sqrt(hours_since_publish + 2)
-- sqrt ile time decay: yeni hikayeleri aşırı avantajlandırmaz ama önceliklendirir
CREATE OR REPLACE FUNCTION public.get_trending_stories(p_limit integer DEFAULT 10)
RETURNS TABLE (
  id                uuid,
  baslik            text,
  slug              text,
  kapak_url         text,
  goruntuleme       integer,
  created_at        timestamptz,
  yazar_id          uuid,
  kategori_id       integer,
  trending_score    numeric,
  reads_24h         bigint,
  likes_24h         bigint,
  comments_24h      bigint,
  bookmarks_24h     bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
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
      h.id,
      h.baslik,
      h.slug,
      h.kapak_url,
      h.goruntuleme,
      h.created_at,
      h.yazar_id,
      h.kategori_id,
      COALESCE(e.reads_24h,    0) AS reads_24h,
      COALESCE(e.likes_24h,    0) AS likes_24h,
      COALESCE(e.comments_24h, 0) AS comments_24h,
      COALESCE(e.bookmarks_24h,0) AS bookmarks_24h,
      -- Weighted score
      (
        COALESCE(e.reads_24h,    0) * 1.0 +
        COALESCE(e.likes_24h,    0) * 3.0 +
        COALESCE(e.comments_24h, 0) * 4.0 +
        COALESCE(e.bookmarks_24h,0) * 2.0
      ) / NULLIF(
        -- Time decay: sqrt(hours since publish + 2) — minimum 2 to avoid /0
        SQRT(EXTRACT(EPOCH FROM (now() - h.created_at)) / 3600.0 + 2),
        0
      ) AS trending_score
    FROM public.hikayeler h
    LEFT JOIN engagement_24h e ON e.hikaye_id = h.id
    WHERE h.durum IN ('yayinda', 'tamamlandi')
      -- En az 1 engagement sinyali olan hikayeleri göster
      AND (
        COALESCE(e.reads_24h, 0) +
        COALESCE(e.likes_24h, 0) +
        COALESCE(e.comments_24h, 0) +
        COALESCE(e.bookmarks_24h, 0)
      ) > 0
  )
  SELECT *
  FROM scored
  ORDER BY trending_score DESC
  LIMIT p_limit;
$$;

-- ── 6. Auto-clean old engagement logs (>7 days) ──────────
-- Eski logları temizle (Supabase cron ile çalıştırılabilir)
CREATE OR REPLACE FUNCTION public.cleanup_old_engagement_logs()
RETURNS void
LANGUAGE sql SECURITY DEFINER
AS $$
  DELETE FROM public.engagement_logs
  WHERE created_at < now() - interval '7 days';
$$;

-- ── 7. Verify ─────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('engagement_logs', 'trending_cache')
ORDER BY table_name;
