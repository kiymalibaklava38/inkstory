import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  const supabase = await createClient()

  // 1. Durum: OAuth veya Magic Link (code parametresi varsa)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // 2. Durum: Şifre Sıfırlama (Recovery)
  // E-postadan gelen linkte 'access_token' ve 'refresh_token' bulunur.
  // Supabase istemcisi, URL'deki hash (#) kısmında gelen token'ları otomatik olarak 
  // okumaya çalışacaktır. Sadece 'type=recovery' kontrolü yaparak kullanıcıyı 
  // şifre güncelleme sayfasına göndermen yeterlidir.
  if (type === 'recovery') {
    // Burada session zaten kurulmuş olmalı (Supabase bunu arka planda yapar)
    // Eğer sayfada şifre güncelleme formun varsa buraya yönlendir.
    return NextResponse.redirect(`${origin}/reset-password`)
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}