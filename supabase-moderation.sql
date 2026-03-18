-- ============================================================
-- InkStory — Moderation System Schema
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. Extend profiles: ban system ───────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned       boolean   DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason      text,
  ADD COLUMN IF NOT EXISTS banned_at       timestamptz,
  ADD COLUMN IF NOT EXISTS shadow_banned   boolean   DEFAULT false;

-- ── 2. Extend hikayeler: moderation fields ────────────────
ALTER TABLE public.hikayeler
  ADD COLUMN IF NOT EXISTS is_featured       boolean   DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_locked         boolean   DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderation_status text      DEFAULT 'ok'
    CHECK (moderation_status IN ('ok','flagged','removed'));

-- ── 3. Extend yorumlar: moderation fields ─────────────────
ALTER TABLE public.yorumlar
  ADD COLUMN IF NOT EXISTS is_deleted        boolean   DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderation_flag   boolean   DEFAULT false;

-- ── 4. Reports table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reports (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type   text        NOT NULL CHECK (target_type IN ('story','comment','user')),
  target_id     text        NOT NULL,
  reason        text        NOT NULL,
  details       text,
  status        text        DEFAULT 'pending'
    CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  reviewed_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_note    text,
  created_at    timestamptz DEFAULT now() NOT NULL,
  updated_at    timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_insert_auth"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = reporter_id);

CREATE POLICY "reports_select_own"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "reports_admin_all"
  ON public.reports FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 5. AI Usage Logs table ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action        text        NOT NULL,
  prompt_length integer     DEFAULT 0,
  result_length integer     DEFAULT 0,
  story_title   text,
  created_at    timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_logs_insert_auth"
  ON public.ai_usage_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "ai_logs_select_own"
  ON public.ai_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "ai_logs_admin_all"
  ON public.ai_usage_logs FOR ALL
  USING (public.is_admin());

-- ── 6. Indexes ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS reports_status_idx      ON public.reports(status);
CREATE INDEX IF NOT EXISTS reports_target_idx      ON public.reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS reports_reporter_idx    ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS ai_logs_user_idx        ON public.ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS ai_logs_created_idx     ON public.ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS hikayeler_featured_idx  ON public.hikayeler(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS profiles_banned_idx     ON public.profiles(is_banned) WHERE is_banned = true;

-- ── 7. Update audit log to include moderation actions ─────
-- (audit_log table was created in supabase-security.sql)
-- No changes needed — log_audit() function handles everything.

-- ── 8. Verify ─────────────────────────────────────────────
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('reports', 'ai_usage_logs', 'profiles', 'hikayeler', 'yorumlar')
  AND column_name IN (
    'is_banned','ban_reason','banned_at','shadow_banned',
    'is_featured','is_locked','moderation_status',
    'is_deleted','moderation_flag',
    'status','target_type','target_id','reason',
    'action','prompt_length','result_length'
  )
ORDER BY table_name, column_name;
