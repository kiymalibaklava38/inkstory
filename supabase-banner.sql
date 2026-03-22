-- ── profiles tablosuna banner_url ekle ─────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banner_url text;

-- ── banner storage bucket ────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "banners_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "banners_auth_upload"  ON storage.objects;
DROP POLICY IF EXISTS "banners_auth_delete"  ON storage.objects;

CREATE POLICY "banners_public_read"
  ON storage.objects FOR SELECT USING (bucket_id = 'banners');

CREATE POLICY "banners_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'banners' AND auth.role() = 'authenticated');

CREATE POLICY "banners_auth_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Verify
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'banner_url';
