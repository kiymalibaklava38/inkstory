import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  const supabase = await createClient()

  // 1. OAuth veya Magic Link girişi
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // 2. Şifre Sıfırlama (Recovery)
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/reset-password`)
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}