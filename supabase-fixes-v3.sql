-- ============================================================
-- InkStory — Database Fixes (v3)
-- Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- ── 1. STORAGE: Secure cover image uploads ────────────────
-- Drop old insecure policy
DROP POLICY IF EXISTS "kapaklar_insert_auth" ON storage.objects;
DROP POLICY IF EXISTS "kapaklar_insert_own" ON storage.objects;

-- Create secure policy verifying that the user owns the story
CREATE POLICY "kapaklar_insert_own" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'kapaklar' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.hikayeler h
    WHERE h.id::text = (storage.foldername(name))[1]
      AND h.yazar_id = auth.uid()
  )
);

-- ── 2. ENGAGEMENT LOGS: Allow guest/anonymous visits ───────
-- Drop old policies
DROP POLICY IF EXISTS "engagement_insert_anon" ON public.engagement_logs;

-- Recreate to allow insert if user_id is NULL (guests)
CREATE POLICY "engagement_insert_anon" ON public.engagement_logs FOR INSERT
WITH CHECK (user_id IS NULL);

-- ── 3. EMAIL LOGS: Enable RLS and protect table ───────────
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_logs_admin_all" ON public.email_logs;

CREATE POLICY "email_logs_admin_all" ON public.email_logs FOR ALL
USING (public.is_admin());

-- ── 4. TRENDING STORIES: RPC performance optimization ──────
CREATE OR REPLACE FUNCTION public.get_trending_stories_v2(p_limit integer DEFAULT 10)
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
  bookmarks_24h     bigint,
  profiles          jsonb,
  kategoriler       jsonb
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
        SQRT(EXTRACT(EPOCH FROM (now() - h.created_at)) / 3600.0 + 2),
        0
      ) AS trending_score
    FROM public.hikayeler h
    LEFT JOIN engagement_24h e ON e.hikaye_id = h.id
    WHERE h.durum IN ('yayinda', 'tamamlandi')
  )
  SELECT 
    s.id,
    s.baslik,
    s.slug,
    s.kapak_url,
    s.goruntuleme,
    s.created_at,
    s.yazar_id,
    s.kategori_id,
    s.trending_score,
    s.reads_24h,
    s.likes_24h,
    s.comments_24h,
    s.bookmarks_24h,
    jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'is_premium', COALESCE(p.is_premium, false)
    ) AS profiles,
    CASE 
      WHEN k.id IS NOT NULL THEN jsonb_build_object(
        'id', k.id,
        'ad', k.ad,
        'slug', k.slug,
        'renk', k.renk,
        'ikon', k.ikon
      )
      ELSE NULL
    END AS kategoriler
  FROM scored s
  JOIN public.profiles p ON p.id = s.yazar_id
  LEFT JOIN public.kategoriler k ON k.id = s.kategori_id
  ORDER BY s.trending_score DESC
$$;

-- ── 5. INLINE COMMENTS: Paragraph-level comments support ──
ALTER TABLE public.yorumlar
  ADD COLUMN IF NOT EXISTS paragraph_index integer DEFAULT null;

CREATE INDEX IF NOT EXISTS idx_yorumlar_paragraph
  ON public.yorumlar(bolum_id, paragraph_index)
  WHERE paragraph_index IS NOT NULL;
