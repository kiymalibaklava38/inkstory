import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

async function verifyPaddleSignature(req: NextRequest, body: string): Promise<boolean> {
  const secret = process.env.PADDLE_WEBHOOK_SECRET
  if (!secret) return false

  const signature = req.headers.get('paddle-signature')
  if (!signature) return false

  const parts = Object.fromEntries(
    signature
      .split(';')
      .map(part => part.trim())
      .map(part => {
        const idx = part.indexOf('=')
        return idx === -1
          ? [part, '']
          : [part.slice(0, idx), part.slice(idx + 1)]
      })
  )

  const ts = parts.ts
  const h1 = parts.h1

  if (!ts || !h1) return false

  const signedPayload = `${ts}:${body}`
  const encoder = new TextEncoder()

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
  const expected = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return timingSafeEqualHex(expected, h1)
}

function addPlanDuration(fromDate: Date, plan: 'monthly' | 'yearly') {
  const next = new Date(fromDate)
  if (plan === 'yearly') {
    next.setFullYear(next.getFullYear() + 1)
  } else {
    next.setMonth(next.getMonth() + 1)
  }
  return next
}

async function findUserIdBySubscriptionId(subscriptionId?: string | null): Promise<string | null> {
  if (!subscriptionId) return null

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('paddle_subscription_id', subscriptionId)
    .maybeSingle()

  if (error) {
    console.error('[Paddle Webhook] Failed to find user by subscription id:', error.message)
    return null
  }

  return data?.id ?? null
}

export async function POST(req: NextRequest) {
  const body = await req.text()

  const valid = await verifyPaddleSignature(req, body)
  if (!valid) {
    console.error('[Paddle Webhook] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = event?.event_type
  const payload = event?.data

  console.log('[Paddle Webhook] Event:', eventType)

  try {
    // 1) İlk ödeme tamamlandı
    if (eventType === 'transaction.completed') {
      const tx = payload

      // Paddle docs: completed event fully processed transaction içindir
      if (tx?.status !== 'completed') {
        console.log('[Paddle] Ignored transaction.completed with non-completed status:', tx?.status)
        return NextResponse.json({ ok: true })
      }

      const userId = tx?.custom_data?.user_id as string | undefined
      const plan = tx?.custom_data?.plan as 'monthly' | 'yearly' | undefined
      const subId = tx?.subscription_id as string | null | undefined

      if (!userId || !plan) {
        console.log('[Paddle] Missing user_id or plan on transaction.completed')
        return NextResponse.json({ ok: true })
      }

      // Idempotency: aynı subscription/event tekrar geldiyse sorun çıkarmasın
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('premium_expires_at, paddle_subscription_id')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) {
        console.error('[Paddle] Failed reading profile:', profileError.message)
        return NextResponse.json({ error: 'Profile read failed' }, { status: 500 })
      }

      const baseDate =
        profile?.premium_expires_at && new Date(profile.premium_expires_at) > new Date()
          ? new Date(profile.premium_expires_at)
          : new Date()

      const expires = addPlanDuration(baseDate, plan)

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          is_premium: true,
          premium_expires_at: expires.toISOString(),
          paddle_subscription_id: subId ?? profile?.paddle_subscription_id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (updateError) {
        console.error('[Paddle] Failed activating premium:', updateError.message)
        return NextResponse.json({ error: 'Failed to activate premium' }, { status: 500 })
      }

      console.log(`[Paddle] Premium activated for user ${userId} until ${expires.toISOString()}`)
      return NextResponse.json({ ok: true })
    }

    // 2) Subscription aktif oldu
    if (eventType === 'subscription.activated') {
      const sub = payload

      const userId =
        (sub?.custom_data?.user_id as string | undefined) ??
        (await findUserIdBySubscriptionId(sub?.id))

      const plan = sub?.custom_data?.plan as 'monthly' | 'yearly' | undefined

      if (!userId || !plan) {
        console.log('[Paddle] Missing user_id or plan on subscription.activated')
        return NextResponse.json({ ok: true })
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('premium_expires_at')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) {
        console.error('[Paddle] Failed reading profile:', profileError.message)
        return NextResponse.json({ error: 'Profile read failed' }, { status: 500 })
      }

      const baseDate =
        profile?.premium_expires_at && new Date(profile.premium_expires_at) > new Date()
          ? new Date(profile.premium_expires_at)
          : new Date()

      const expires = addPlanDuration(baseDate, plan)

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          is_premium: true,
          premium_expires_at: expires.toISOString(),
          paddle_subscription_id: sub.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (updateError) {
        console.error('[Paddle] Failed activating subscription:', updateError.message)
        return NextResponse.json({ error: 'Failed to activate subscription' }, { status: 500 })
      }

      console.log(`[Paddle] Subscription activated for user ${userId}`)
      return NextResponse.json({ ok: true })
    }

    // 3) Subscription güncellendi
    // Not: burada süreyi körü körüne uzatmıyoruz.
    if (eventType === 'subscription.updated') {
      const sub = payload

      const userId =
        (sub?.custom_data?.user_id as string | undefined) ??
        (await findUserIdBySubscriptionId(sub?.id))

      if (!userId) {
        console.log('[Paddle] Missing user_id on subscription.updated')
        return NextResponse.json({ ok: true })
      }

      const status = sub?.status as string | undefined
      const shouldBePremium = status === 'active' || status === 'trialing'

      const patch: Record<string, any> = {
        is_premium: shouldBePremium,
        paddle_subscription_id: sub?.id ?? null,
        updated_at: new Date().toISOString(),
      }

      // Paddle tarafında next_billed_at/current_billing_period varsa onları kullanmak daha iyi olur.
      const nextBilledAt =
        sub?.next_billed_at ||
        sub?.current_billing_period?.ends_at ||
        null

      if (shouldBePremium && nextBilledAt) {
        patch.premium_expires_at = nextBilledAt
      }

      if (!shouldBePremium) {
        patch.premium_expires_at = new Date().toISOString()
      }

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(patch)
        .eq('id', userId)

      if (updateError) {
        console.error('[Paddle] Failed updating subscription:', updateError.message)
        return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
      }

      console.log(`[Paddle] Subscription updated for user ${userId}, status=${status}`)
      return NextResponse.json({ ok: true })
    }

    // 4) İptal / duraklatma / ödeme başarısız
    if (
      eventType === 'subscription.canceled' ||
      eventType === 'subscription.paused' ||
      eventType === 'transaction.payment_failed'
    ) {
      const data = payload

      const subscriptionId =
        data?.subscription_id ??
        data?.id ??
        null

      const userId =
        (data?.custom_data?.user_id as string | undefined) ??
        (await findUserIdBySubscriptionId(subscriptionId))

      if (!userId) {
        console.log('[Paddle] Could not resolve user for deactivation event')
        return NextResponse.json({ ok: true })
      }

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          is_premium: false,
          premium_expires_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (updateError) {
        console.error('[Paddle] Failed deactivating premium:', updateError.message)
        return NextResponse.json({ error: 'Failed to deactivate premium' }, { status: 500 })
      }

      console.log(`[Paddle] Premium deactivated for user ${userId}`)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Paddle Webhook] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}