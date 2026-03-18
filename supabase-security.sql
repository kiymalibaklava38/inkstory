-- ============================================================
-- InkStory — Complete RLS Security Policies
-- Run in: Supabase Dashboard → SQL Editor → New Query
--
-- This file:
--  1. Enables RLS on all tables
--  2. Drops any existing policies (idempotent)
--  3. Creates tight, explicit policies
--  4. Adds helper functions
--  5. Hardens storage buckets
--  6. Creates audit log table
-- ============================================================

-- ── Helper: is the current user an admin? ────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ── Helper: is the current user the owner? ───────────────
CREATE OR REPLACE FUNCTION public.is_owner(owner_id uuid)
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT auth.uid() = owner_id;
$$;

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_public"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"      ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_trigger"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all"       ON public.profiles;

-- Anyone can read profiles (public platform)
CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Profiles are inserted by the trigger (handle_new_user), not directly
-- This policy allows the security definer trigger function to insert
CREATE POLICY "profiles_insert_trigger"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile (e.g., ban user)
CREATE POLICY "profiles_admin_all"
  ON public.profiles FOR ALL
  USING (public.is_admin());

-- ============================================================
-- KATEGORILER (Categories) — read-only for users
-- ============================================================
ALTER TABLE public.kategoriler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kategoriler_select_all"  ON public.kategoriler;
DROP POLICY IF EXISTS "kategoriler_admin_write" ON public.kategoriler;

CREATE POLICY "kategoriler_select_all"
  ON public.kategoriler FOR SELECT
  USING (true);

CREATE POLICY "kategoriler_admin_write"
  ON public.kategoriler FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- HIKAYELER (Stories)
-- ============================================================
ALTER TABLE public.hikayeler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hikayeler_select_published" ON public.hikayeler;
DROP POLICY IF EXISTS "hikayeler_select_own"       ON public.hikayeler;
DROP POLICY IF EXISTS "hikayeler_insert_auth"      ON public.hikayeler;
DROP POLICY IF EXISTS "hikayeler_update_own"       ON public.hikayeler;
DROP POLICY IF EXISTS "hikayeler_delete_own"       ON public.hikayeler;
DROP POLICY IF EXISTS "hikayeler_admin_all"        ON public.hikayeler;

-- Published/completed stories are public
CREATE POLICY "hikayeler_select_published"
  ON public.hikayeler FOR SELECT
  USING (durum IN ('yayinda', 'tamamlandi'));

-- Authors can always see their own stories (including drafts)
CREATE POLICY "hikayeler_select_own"
  ON public.hikayeler FOR SELECT
  USING (auth.uid() = yazar_id);

-- Authenticated users can create stories
CREATE POLICY "hikayeler_insert_auth"
  ON public.hikayeler FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = yazar_id
  );

-- Authors can only update their own stories
CREATE POLICY "hikayeler_update_own"
  ON public.hikayeler FOR UPDATE
  USING (auth.uid() = yazar_id)
  WITH CHECK (auth.uid() = yazar_id);

-- Authors can delete their own stories
CREATE POLICY "hikayeler_delete_own"
  ON public.hikayeler FOR DELETE
  USING (auth.uid() = yazar_id);

-- Admins have full access
CREATE POLICY "hikayeler_admin_all"
  ON public.hikayeler FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- BOLUMLER (Chapters)
-- ============================================================
ALTER TABLE public.bolumler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bolumler_select_published" ON public.bolumler;
DROP POLICY IF EXISTS "bolumler_select_own"       ON public.bolumler;
DROP POLICY IF EXISTS "bolumler_insert_own"       ON public.bolumler;
DROP POLICY IF EXISTS "bolumler_update_own"       ON public.bolumler;
DROP POLICY IF EXISTS "bolumler_delete_own"       ON public.bolumler;
DROP POLICY IF EXISTS "bolumler_admin_all"        ON public.bolumler;

-- Published chapters of published stories are public
CREATE POLICY "bolumler_select_published"
  ON public.bolumler FOR SELECT
  USING (
    yayinda = true AND
    EXISTS (
      SELECT 1 FROM public.hikayeler h
      WHERE h.id = hikaye_id
        AND h.durum IN ('yayinda', 'tamamlandi')
    )
  );

-- Authors can always see their own chapters
CREATE POLICY "bolumler_select_own"
  ON public.bolumler FOR SELECT
  USING (auth.uid() = yazar_id);

-- Authors can only add chapters to their own stories
CREATE POLICY "bolumler_insert_own"
  ON public.bolumler FOR INSERT
  WITH CHECK (
    auth.uid() = yazar_id AND
    EXISTS (
      SELECT 1 FROM public.hikayeler h
      WHERE h.id = hikaye_id AND h.yazar_id = auth.uid()
    )
  );

CREATE POLICY "bolumler_update_own"
  ON public.bolumler FOR UPDATE
  USING (auth.uid() = yazar_id)
  WITH CHECK (auth.uid() = yazar_id);

CREATE POLICY "bolumler_delete_own"
  ON public.bolumler FOR DELETE
  USING (auth.uid() = yazar_id);

CREATE POLICY "bolumler_admin_all"
  ON public.bolumler FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- YORUMLAR (Comments)
-- ============================================================
ALTER TABLE public.yorumlar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "yorumlar_select_public" ON public.yorumlar;
DROP POLICY IF EXISTS "yorumlar_insert_auth"   ON public.yorumlar;
DROP POLICY IF EXISTS "yorumlar_delete_own"    ON public.yorumlar;
DROP POLICY IF EXISTS "yorumlar_admin_all"     ON public.yorumlar;

-- Comments on published stories are readable by anyone
CREATE POLICY "yorumlar_select_public"
  ON public.yorumlar FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.hikayeler h
      WHERE h.id = hikaye_id
        AND h.durum IN ('yayinda', 'tamamlandi')
    )
  );

-- Authenticated users can comment on published stories
CREATE POLICY "yorumlar_insert_auth"
  ON public.yorumlar FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = yazar_id AND
    EXISTS (
      SELECT 1 FROM public.hikayeler h
      WHERE h.id = hikaye_id
        AND h.durum IN ('yayinda', 'tamamlandi')
    )
  );

-- Users can delete only their own comments
CREATE POLICY "yorumlar_delete_own"
  ON public.yorumlar FOR DELETE
  USING (auth.uid() = yazar_id);

CREATE POLICY "yorumlar_admin_all"
  ON public.yorumlar FOR ALL
  USING (public.is_admin());

-- ============================================================
-- BEGENILER (Likes)
-- ============================================================
ALTER TABLE public.begeniler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "begeniler_select_public" ON public.begeniler;
DROP POLICY IF EXISTS "begeniler_insert_auth"   ON public.begeniler;
DROP POLICY IF EXISTS "begeniler_delete_own"    ON public.begeniler;

CREATE POLICY "begeniler_select_public"
  ON public.begeniler FOR SELECT USING (true);

CREATE POLICY "begeniler_insert_auth"
  ON public.begeniler FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = kullanici_id
  );

CREATE POLICY "begeniler_delete_own"
  ON public.begeniler FOR DELETE
  USING (auth.uid() = kullanici_id);

-- ============================================================
-- TAKIP (Follow)
-- ============================================================
ALTER TABLE public.takip ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "takip_select_public" ON public.takip;
DROP POLICY IF EXISTS "takip_insert_auth"   ON public.takip;
DROP POLICY IF EXISTS "takip_delete_own"    ON public.takip;

CREATE POLICY "takip_select_public"
  ON public.takip FOR SELECT USING (true);

CREATE POLICY "takip_insert_auth"
  ON public.takip FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = takipci_id AND
    takipci_id != takip_edilen_id  -- can't follow yourself
  );

CREATE POLICY "takip_delete_own"
  ON public.takip FOR DELETE
  USING (auth.uid() = takipci_id);

-- ============================================================
-- OKUMA_LISTESI (Library / Reading List)
-- ============================================================
ALTER TABLE public.okuma_listesi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "okuma_listesi_select_own" ON public.okuma_listesi;
DROP POLICY IF EXISTS "okuma_listesi_insert_own" ON public.okuma_listesi;
DROP POLICY IF EXISTS "okuma_listesi_delete_own" ON public.okuma_listesi;

-- Only the owner can see their reading list
CREATE POLICY "okuma_listesi_select_own"
  ON public.okuma_listesi FOR SELECT
  USING (auth.uid() = kullanici_id);

CREATE POLICY "okuma_listesi_insert_own"
  ON public.okuma_listesi FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = kullanici_id
  );

CREATE POLICY "okuma_listesi_delete_own"
  ON public.okuma_listesi FOR DELETE
  USING (auth.uid() = kullanici_id);

-- ============================================================
-- STORAGE BUCKETS — harden policies
-- ============================================================

-- Drop existing storage policies
DROP POLICY IF EXISTS "avatarlar_select_public"   ON storage.objects;
DROP POLICY IF EXISTS "avatarlar_insert_auth"     ON storage.objects;
DROP POLICY IF EXISTS "avatarlar_update_own"      ON storage.objects;
DROP POLICY IF EXISTS "avatarlar_delete_own"      ON storage.objects;
DROP POLICY IF EXISTS "kapaklar_select_public"    ON storage.objects;
DROP POLICY IF EXISTS "kapaklar_insert_auth"      ON storage.objects;
DROP POLICY IF EXISTS "kapaklar_update_own"       ON storage.objects;
DROP POLICY IF EXISTS "kapaklar_delete_own"       ON storage.objects;

-- AVATARLAR bucket
CREATE POLICY "avatarlar_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatarlar');

CREATE POLICY "avatarlar_insert_auth"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatarlar' AND
    auth.role() = 'authenticated' AND
    -- Path must start with the user's own UUID
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatarlar_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatarlar' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatarlar_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatarlar' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- KAPAKLAR bucket (covers are keyed by story ID, not user ID)
CREATE POLICY "kapaklar_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'kapaklar');

CREATE POLICY "kapaklar_insert_auth"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'kapaklar' AND
    auth.role() = 'authenticated'
    -- Additional story ownership verified in the API route
  );

CREATE POLICY "kapaklar_update_auth"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'kapaklar' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "kapaklar_delete_auth"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'kapaklar' AND
    auth.role() = 'authenticated'
  );

-- ============================================================
-- AUDIT LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action     text NOT NULL,   -- 'login', 'story_delete', 'admin_ban', etc.
  table_name text,
  record_id  text,
  metadata   jsonb,
  ip_address inet,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read the audit log
CREATE POLICY "audit_log_admin_select"
  ON public.audit_log FOR SELECT
  USING (public.is_admin());

-- System inserts audit records (security definer function)
CREATE POLICY "audit_log_system_insert"
  ON public.audit_log FOR INSERT
  WITH CHECK (true);

-- No one can update or delete audit records
-- (intentionally no UPDATE or DELETE policy)

-- ── Audit log helper function ─────────────────────────────
CREATE OR REPLACE FUNCTION public.log_audit(
  p_action     text,
  p_table_name text DEFAULT NULL,
  p_record_id  text DEFAULT NULL,
  p_metadata   jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_log (user_id, action, table_name, record_id, metadata)
  VALUES (auth.uid(), p_action, p_table_name, p_record_id, p_metadata);
END;
$$;

-- ============================================================
-- PASSWORD POLICY via Supabase Auth (advisory — configure in dashboard)
-- ============================================================
-- Go to: Authentication → Settings → Password Requirements
-- Minimum length: 8
-- Require uppercase: ✓
-- Require number: ✓
-- Require special character: ✓ (recommended)
--
-- Also set: Authentication → Settings → Rate Limiting
-- Sign-up rate: 5/hour per IP
-- Sign-in rate: 10/15min per IP
-- OTP rate: 5/hour per email

-- ============================================================
-- REALTIME — restrict which tables broadcast to authenticated users
-- ============================================================
BEGIN;
  -- Allow authenticated users to subscribe to their own notifications
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE
    public.yorumlar,
    public.begeniler,
    public.takip;
COMMIT;

-- ============================================================
-- VERIFY — check all tables have RLS enabled
-- ============================================================
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
