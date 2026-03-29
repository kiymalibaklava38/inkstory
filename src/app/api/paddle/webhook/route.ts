import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function verifyPaddleSignature(req: NextRequest, body: string): Promise<boolean> {
  const secret = process.env.PADDLE_WEBHOOK_SECRET
  if (!secret) return false

  const signature = req.headers.get('paddle-signature')
  if (!signature) return false

  // Paddle webhook signature verification
  const parts = Object.fromEntries(
    signature.split(';').map(p => p.split('='))
  )
  const ts = parts['ts']
  const h1 = parts['h1']

  if (!ts || !h1) return false

  const signedPayload = `${ts}:${body}`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')

  return expected === h1
}

export async function POST(req: NextRequest) {
  const body = await req.text()

  const valid = await verifyPaddleSignature(req, body)
  if (!valid) {
    console.error('[Paddle Webhook] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: any
  try { event = JSON.parse(body) }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const eventType = event?.event_type
  console.log('[Paddle Webhook] Event:', eventType)

  // Ödeme tamamlandı → premium aktifleştir
  if (eventType === 'transaction.completed') {
    const tx        = event.data
    const userId    = tx?.custom_data?.user_id
    const plan      = tx?.custom_data?.plan
    const subId     = tx?.subscription_id

    if (!userId) return NextResponse.json({ ok: true })

    // Premium bitiş tarihi hesapla
    const now = new Date()
    const expires = new Date(now)
    if (plan === 'yearly') {
      expires.setFullYear(expires.getFullYear() + 1)
    } else {
      expires.setMonth(expires.getMonth() + 1)
    }

    await supabaseAdmin.from('profiles').update({
      is_premium:           true,
      premium_expires_at:   expires.toISOString(),
      paddle_subscription_id: subId || null,
      updated_at:           now.toISOString(),
    }).eq('id', userId)

    console.log(`[Paddle] Premium activated for user ${userId} until ${expires.toISOString()}`)
  }

  // Abonelik yenilendi
  if (eventType === 'subscription.activated' || eventType === 'subscription.updated') {
    const sub    = event.data
    const userId = sub?.custom_data?.user_id
    const plan   = sub?.custom_data?.plan

    if (!userId) return NextResponse.json({ ok: true })

    const now = new Date()
    const expires = new Date(now)
    if (plan === 'yearly') {
      expires.setFullYear(expires.getFullYear() + 1)
    } else {
      expires.setMonth(expires.getMonth() + 1)
    }

    await supabaseAdmin.from('profiles').update({
      is_premium:           true,
      premium_expires_at:   expires.toISOString(),
      paddle_subscription_id: sub.id,
      updated_at:           now.toISOString(),
    }).eq('id', userId)
  }

  // Abonelik iptal edildi / ödeme başarısız
  if (
    eventType === 'subscription.canceled' ||
    eventType === 'subscription.paused' ||
    eventType === 'transaction.payment_failed'
  ) {
    const data   = event.data
    const userId = data?.custom_data?.user_id
    if (userId) {
      await supabaseAdmin.from('profiles').update({
        is_premium:         false,
        premium_expires_at: new Date().toISOString(),
        updated_at:         new Date().toISOString(),
      }).eq('id', userId)
      console.log(`[Paddle] Premium deactivated for user ${userId}`)
    }
  }

  return NextResponse.json({ ok: true })
}
