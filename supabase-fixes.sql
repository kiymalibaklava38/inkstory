-- ============================================================
-- InkStory — Admin Fix & AI Logs Schema (v2)
-- Supabase SQL Editor → New Query → Run
-- ============================================================

-- ── 1. audit_log tablosunu sıfırdan oluştur ───────────────
DROP TABLE IF EXISTS public.audit_log;

CREATE TABLE public.audit_log (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text        NOT NULL,
  table_name  text,
  record_id   uuid,
  metadata    jsonb,
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_admin_all" ON public.audit_log;
CREATE POLICY "audit_admin_all" ON public.audit_log FOR ALL USING (public.is_admin());

-- ── 2. log_audit fonksiyonu ───────────────────────────────
DROP FUNCTION IF EXISTS public.log_audit(text, text, uuid, text);

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

-- ── 3. ai_usage_logs tablosu ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text,
  tokens_used integer     DEFAULT 0,
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_logs_insert_auth" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "ai_logs_admin_all"   ON public.ai_usage_logs;

CREATE POLICY "ai_logs_insert_auth" ON public.ai_usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_logs_admin_all"   ON public.ai_usage_logs FOR ALL   USING (public.is_admin());

-- ── 4. profiles — eksik kolonlar ─────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned     boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason    text,
  ADD COLUMN IF NOT EXISTS banned_at     timestamptz,
  ADD COLUMN IF NOT EXISTS shadow_banned boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_admin      boolean     DEFAULT false;

-- ── 5. Indexes ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS ai_logs_user_idx    ON public.ai_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_logs_created_idx ON public.ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_admin_idx ON public.audit_log(admin_id, created_at DESC);

-- ── Verify ────────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('audit_log', 'ai_usage_logs')
ORDER BY table_name;
