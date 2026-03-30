import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const { plan } = await req.json()

  const priceId = plan === 'yearly'
    ? process.env.PADDLE_PRICE_YEARLY
    : process.env.PADDLE_PRICE_MONTHLY

  if (!process.env.PADDLE_API_KEY) {
    console.error('[Paddle] PADDLE_API_KEY is not set')
    return NextResponse.json({ error: 'PADDLE_API_KEY not configured' }, { status: 500 })
  }
  if (!priceId) {
    console.error(`[Paddle] Price ID not set for plan: ${plan}. PADDLE_PRICE_MONTHLY=${process.env.PADDLE_PRICE_MONTHLY}, PADDLE_PRICE_YEARLY=${process.env.PADDLE_PRICE_YEARLY}`)
    return NextResponse.json({ error: `Price ID not configured for plan: ${plan}` }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles').select('username, display_name').eq('id', user.id).single()

  // Paddle sandbox vs production
  const paddleBase = process.env.PADDLE_API_KEY?.startsWith('pdl_live')
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com'

  const res = await fetch(`${paddleBase}/transactions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PADDLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [{ price_id: priceId, quantity: 1 }],
      customer: { email: user.email },
      custom_data: {
        user_id: user.id,
        username: profile?.username,
        plan,
      },
      checkout: {
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/premium?success=1`,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[Paddle] Transaction error:', res.status, err)
    return NextResponse.json({ error: 'Failed to create checkout', detail: err }, { status: 500 })
  }

  const data = await res.json()
  const checkoutUrl = data?.data?.checkout?.url

  if (!checkoutUrl) {
    console.error('[Paddle] No checkout URL in response:', JSON.stringify(data))
    return NextResponse.json({ error: 'No checkout URL returned' }, { status: 500 })
  }

  return NextResponse.json({ url: checkoutUrl })
}
