import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const { plan } = await req.json() // 'monthly' | 'yearly'

  const priceId = plan === 'yearly'
    ? process.env.PADDLE_PRICE_YEARLY
    : process.env.PADDLE_PRICE_MONTHLY

  if (!priceId) return NextResponse.json({ error: 'Price not configured' }, { status: 500 })
  if (!process.env.PADDLE_API_KEY) return NextResponse.json({ error: 'Paddle not configured' }, { status: 500 })

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles').select('username, display_name').eq('id', user.id).single()

  // Paddle transaction oluştur
  const res = await fetch('https://api.paddle.com/transactions', {
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
    console.error('[Paddle] Transaction error:', err)
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 })
  }

  const data = await res.json()
  const checkoutUrl = data?.data?.checkout?.url

  if (!checkoutUrl) return NextResponse.json({ error: 'No checkout URL' }, { status: 500 })

  return NextResponse.json({ url: checkoutUrl })
}
