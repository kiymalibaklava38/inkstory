import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  let email: string

  try {
    const body = await req.json()
    email = body?.email
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
  }

  if (!email || typeof email !== 'string' || !email.includes('@'))
    return NextResponse.json({ error: 'Geçerli bir e-posta gir.' }, { status: 400 })

  email = email.trim().toLowerCase()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL || 'https://inkstory.com.tr'

  if (!supabaseUrl || !supabaseKey) {
    console.error('[Password Reset] Supabase env eksik')
    return NextResponse.json({ error: 'Sunucu yapılandırma hatası.' }, { status: 500 })
  }

  try {
    // Supabase REST API'ye direkt HTTP isteği — hiç import gerektirmez
    const res = await fetch(`${supabaseUrl}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
      },
      body: JSON.stringify({
        email,
        gotrue_meta_security: {},
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[Password Reset] Supabase recover error:', res.status, err)
    }

    // Güvenlik: hata olsa bile success döndür (e-posta var mı bilgisi verme)
    console.log(`[Password Reset] ✅ Reset requested for: ${email}`)
    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[Password Reset] Unexpected:', err?.message)
    return NextResponse.json({ error: 'Hata oluştu.' }, { status: 500 })
  }
}
