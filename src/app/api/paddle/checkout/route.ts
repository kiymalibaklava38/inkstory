import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  if (!process.env.PADDLE_API_KEY)
    return NextResponse.json({ error: 'Ödeme sistemi yapılandırılmamış.' }, { status: 500 })

  const { plan } = await req.json()
  if (!plan || !['monthly', 'yearly'].includes(plan))
    return NextResponse.json({ error: 'Geçersiz plan.' }, { status: 400 })

  // ── IP'den ülke tespiti (sunucu tarafı — manipüle edilemez) ──
  const vercelCountry  = req.geo?.country || req.headers.get('x-vercel-ip-country')
  const cfCountry      = req.headers.get('cf-ipcountry')
  const country        = (vercelCountry || cfCountry || 'US').toUpperCase()
  const isTurkey       = country === 'TR'

  console.log(`[Paddle] IP country=${country} isTurkey=${isTurkey} plan=${plan}`)

  // ── Ülkeye göre fiyat ID seç ──
  // Türkiye → TL fiyatı, diğerleri → USD fiyatı
  const priceMap: Record<string, string | undefined> = {
    monthly_tr: process.env.PADDLE_PRICE_MONTHLY_TR,
    yearly_tr:  process.env.PADDLE_PRICE_YEARLY_TR,
    monthly:    process.env.PADDLE_PRICE_MONTHLY,
    yearly:     process.env.PADDLE_PRICE_YEARLY,
  }

  const planKey  = isTurkey ? `${plan}_tr` : plan
  const priceId  = priceMap[planKey] || priceMap[plan]  // fallback: USD

  if (!priceId) {
    console.error(`[Paddle] Price ID yok: planKey=${planKey}, plan=${plan}`)
    console.error(`[Paddle] Env: MONTHLY=${process.env.PADDLE_PRICE_MONTHLY} YEARLY=${process.env.PADDLE_PRICE_YEARLY} MONTHLY_TR=${process.env.PADDLE_PRICE_MONTHLY_TR} YEARLY_TR=${process.env.PADDLE_PRICE_YEARLY_TR}`)
    return NextResponse.json({ error: 'Fiyat yapılandırması eksik.' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()

  const isLive     = process.env.PADDLE_API_KEY.startsWith('pdl_live')
  const paddleBase = isLive ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com'
  const siteUrl    = (process.env.NEXT_PUBLIC_SITE_URL || 'https://inkstory.com.tr').replace(/\/$/, '')

  console.log(`[Paddle] Transaction: planKey=${planKey} priceId=${priceId} user=${user.email}`)

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
        user_id:  user.id,
        username: profile?.username || '',
        plan:     planKey,  // monthly_tr / yearly_tr / monthly / yearly
        country,
      },
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
  try { data = JSON.parse(responseText) }
  catch {
    console.error('[Paddle] JSON parse error:', responseText)
    return NextResponse.json({ error: 'Paddle yanıtı geçersiz.' }, { status: 500 })
  }

  const checkoutUrl = data?.data?.checkout?.url
  if (!checkoutUrl) {
    console.error('[Paddle] Checkout URL yok:', JSON.stringify(data))
    return NextResponse.json({ error: 'Checkout URL alınamadı.', detail: JSON.stringify(data) }, { status: 500 })
  }

  console.log(`[Paddle] ✅ Checkout URL oluşturuldu: ${checkoutUrl}`)
  return NextResponse.json({ url: checkoutUrl, isTurkey, country })
}
