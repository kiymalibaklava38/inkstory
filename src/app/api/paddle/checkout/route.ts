import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const plan =
    typeof body === 'object' &&
    body !== null &&
    'plan' in body &&
    (body as { plan?: string }).plan === 'yearly'
      ? 'yearly'
      : 'monthly'

  const priceId =
    plan === 'yearly'
      ? process.env.PADDLE_PRICE_YEARLY
      : process.env.PADDLE_PRICE_MONTHLY

  if (!process.env.PADDLE_API_KEY) {
    console.error('[Paddle] PADDLE_API_KEY is not set')
    return NextResponse.json({ error: 'PADDLE_API_KEY not configured' }, { status: 500 })
  }

  if (!priceId) {
    console.error(`[Paddle] Price ID not set for plan: ${plan}`)
    return NextResponse.json({ error: `Price ID not configured for plan: ${plan}` }, { status: 500 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_SITE_URL not configured' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, is_premium, premium_expires_at')
    .eq('id', user.id)
    .single()

  const alreadyPremium =
    !!profile?.is_premium &&
    !!profile?.premium_expires_at &&
    new Date(profile.premium_expires_at) > new Date()

  if (alreadyPremium) {
    return NextResponse.json({ error: 'User already has premium' }, { status: 409 })
  }

  const paddleBase = process.env.PADDLE_API_KEY.startsWith('pdl_live')
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com'

  const paddleRes = await fetch(`${paddleBase}/transactions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [{ price_id: priceId, quantity: 1 }],
      customer: {
        email: user.email,
      },
      custom_data: {
        user_id: user.id,
        username: profile?.username ?? null,
        plan,
      },
      checkout: {
        // success=1 YOK
        // İstersen approved başka bir page verebilirsin, ama sahte success paramı verme.
        url: `${siteUrl}/premium`,
      },
    }),
  })

  if (!paddleRes.ok) {
    const errText = await paddleRes.text()
    console.error('[Paddle] Transaction error:', paddleRes.status, errText)
    return NextResponse.json(
      { error: 'Failed to create checkout', detail: errText },
      { status: 500 }
    )
  }

  const paddleData = await paddleRes.json()
  const checkoutUrl = paddleData?.data?.checkout?.url

  if (!checkoutUrl) {
    console.error('[Paddle] No checkout URL in response:', JSON.stringify(paddleData))
    return NextResponse.json({ error: 'No checkout URL returned' }, { status: 500 })
  }

  return NextResponse.json({ url: checkoutUrl })
}