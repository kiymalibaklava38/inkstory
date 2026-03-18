-- ============================================================
-- InkStory — Premium Subscription Schema
-- Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- ── 1. Extend profiles with premium fields ────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_premium          boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_expires_at  timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_customer_id  text,
  ADD COLUMN IF NOT EXISTS ai_calls_today      integer     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_calls_reset_at   date        DEFAULT CURRENT_DATE;

-- ── 2. Subscriptions table ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                   uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id text      UNIQUE,
  stripe_customer_id   text,
  plan                 text        NOT NULL CHECK (plan IN ('monthly', 'yearly', 'lifetime')),
  status               text        NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  current_period_start timestamptz,
  current_period_end   timestamptz,
  cancel_at_period_end boolean     DEFAULT false,
  created_at           timestamptz DEFAULT now() NOT NULL,
  updated_at           timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_select_own"   ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_admin_all"    ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert_system" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_system" ON public.subscriptions;

CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_admin_all"
  ON public.subscriptions FOR ALL
  USING (public.is_admin());

-- System (webhook) can insert/update via service role — no RLS needed for service role

-- ── 3. Payment history table ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_id     uuid        REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  stripe_payment_id   text        UNIQUE,
  amount              integer     NOT NULL, -- in smallest currency unit (kuruş / cents)
  currency            text        DEFAULT 'try',
  status              text        NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending', 'refunded')),
  plan                text,
  created_at          timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select_own"  ON public.payments;
DROP POLICY IF EXISTS "payments_admin_all"   ON public.payments;

CREATE POLICY "payments_select_own"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "payments_admin_all"
  ON public.payments FOR ALL
  USING (public.is_admin());

-- ── 4. Function: reset AI daily usage ────────────────────
CREATE OR REPLACE FUNCTION public.reset_ai_calls_if_needed(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET
    ai_calls_today   = 0,
    ai_calls_reset_at = CURRENT_DATE
  WHERE id = p_user_id
    AND ai_calls_reset_at < CURRENT_DATE;
END;
$$;

-- ── 5. Function: increment AI call counter ────────────────
CREATE OR REPLACE FUNCTION public.increment_ai_calls(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_calls integer;
BEGIN
  -- Reset if new day
  PERFORM public.reset_ai_calls_if_needed(p_user_id);

  UPDATE public.profiles
  SET ai_calls_today = ai_calls_today + 1
  WHERE id = p_user_id
  RETURNING ai_calls_today INTO v_calls;

  RETURN v_calls;
END;
$$;

-- ── 6. Indexes ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS subscriptions_user_idx    ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_idx  ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx  ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS payments_user_idx         ON public.payments(user_id);

-- ── 7. Verify ─────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('subscriptions', 'payments')
ORDER BY table_name;
