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
    return NextResponse.json({ error: 'Geçerli bir e-posta adresi gir.' }, { status: 400 })

  email = email.trim().toLowerCase()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL || 'https://inkstory.com.tr'

  if (!supabaseUrl || !serviceKey) {
    console.error('[Password Reset] ENV eksik — SUPABASE_SERVICE_ROLE_KEY veya URL')
    return NextResponse.json({ error: 'Sunucu yapılandırma hatası.' }, { status: 500 })
  }

  try {
    // Service role ile admin client — resetPasswordForEmail için gerekli
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // SDK metodu — SMTP ayarını, rate limit'i, redirect'i doğru yönetir
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?type=recovery`,
    })

    if (error) {
      console.error('[Password Reset] Supabase error:', error.message, error.status)
      // Güvenlik: email'in kayıtlı olup olmadığını dışarı sızdırma
      return NextResponse.json({ success: true })
    }

    console.log(`[Password Reset] ✅ Mail gönderildi: ${email}`)
    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[Password Reset] Hata:', err?.message)
    return NextResponse.json({ error: 'Beklenmeyen hata oluştu.' }, { status: 500 })
  }
}
