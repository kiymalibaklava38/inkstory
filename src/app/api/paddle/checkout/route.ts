import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  if (!process.env.PADDLE_API_KEY) {
    console.error('[Paddle] PADDLE_API_KEY is not set')
    return NextResponse.json({ error: 'Ödeme sistemi yapılandırılmamış.' }, { status: 500 })
  }

  const { plan } = await req.json()
  if (!plan) return NextResponse.json({ error: 'Plan belirtilmedi.' }, { status: 400 })

  // Plan → Price ID eşleştirmesi (TR fiyatları dahil)
  const priceMap: Record<string, string | undefined> = {
    monthly:    process.env.PADDLE_PRICE_MONTHLY,
    yearly:     process.env.PADDLE_PRICE_YEARLY,
    monthly_tr: process.env.PADDLE_PRICE_MONTHLY_TR,
    yearly_tr:  process.env.PADDLE_PRICE_YEARLY_TR,
  }
  const priceId = priceMap[plan]

  if (!priceId) {
    console.error(`[Paddle] Price ID bulunamadı: ${plan}. Mevcut env: MONTHLY=${process.env.PADDLE_PRICE_MONTHLY}, YEARLY=${process.env.PADDLE_PRICE_YEARLY}`)
    return NextResponse.json({ error: `"${plan}" planı için fiyat ID'si tanımlanmamış.` }, { status: 500 })
  }

  const supabase  = await createClient()
  const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()

  const isLive     = process.env.PADDLE_API_KEY.startsWith('pdl_live')
  const paddleBase = isLive ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com'
  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL || 'https://inkstory.com.tr'

  console.log(`[Paddle] Creating transaction: plan=${plan}, priceId=${priceId}, base=${paddleBase}`)

  const res = await fetch(`${paddleBase}/transactions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PADDLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [{ price_id: priceId, quantity: 1 }],
      customer: { email: user.email },
      custom_data: { user_id: user.id, username: profile?.username || '', plan },
      settings: {
        success_url: `${siteUrl}/premium?success=1`,
        allow_logout: false,
      },
    }),
  })

  const responseText = await res.text()

  if (!res.ok) {
    console.error('[Paddle] Transaction error:', res.status, responseText)
    return NextResponse.json({ error: 'Ödeme başlatılamadı.', detail: responseText }, { status: 500 })
  }

  let data: any
  try { data = JSON.parse(responseText) } catch {
    console.error('[Paddle] JSON parse error:', responseText)
    return NextResponse.json({ error: 'Paddle yanıtı geçersiz.' }, { status: 500 })
  }

  // Paddle v2 response: data.data.checkout.url
  const checkoutUrl = data?.data?.checkout?.url

  if (!checkoutUrl) {
    console.error('[Paddle] Checkout URL yok. Yanıt:', JSON.stringify(data))
    return NextResponse.json({ error: 'Checkout URL alınamadı.', detail: JSON.stringify(data) }, { status: 500 })
  }

  console.log(`[Paddle] Checkout URL: ${checkoutUrl}`)
  return NextResponse.json({ url: checkoutUrl })
}
