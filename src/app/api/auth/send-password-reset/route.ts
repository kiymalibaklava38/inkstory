import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('[Password Reset] Supabase env eksik')
    return NextResponse.json({ error: 'Sunucu yapılandırma hatası.' }, { status: 500 })
  }

  try {
    // Supabase anon client — resetPasswordForEmail admin key gerektirmez
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://inkstory.com.tr'

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    })

    if (error) {
      console.error('[Password Reset] Supabase error:', error.message)
      // Güvenlik: hata olsa bile success döndür (e-posta var mı bilgisi verme)
      return NextResponse.json({ success: true })
    }

    console.log(`[Password Reset] ✅ Reset email sent: ${email}`)
    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[Password Reset] Unexpected:', err?.message)
    return NextResponse.json({ error: 'Hata oluştu: ' + (err?.message || 'bilinmiyor') }, { status: 500 })
  }
}
