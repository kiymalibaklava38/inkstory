-- ============================================================
-- InkStory — Paddle Premium Integration
-- Supabase SQL Editor → New Query → Run
-- ============================================================

-- profiles tablosuna Paddle kolonu ekle
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS paddle_subscription_id text;

-- Middleware'de premium kontrolü için index
CREATE INDEX IF NOT EXISTS idx_profiles_premium
  ON public.profiles(is_premium, premium_expires_at)
  WHERE is_premium = true;
