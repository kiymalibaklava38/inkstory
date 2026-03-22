import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Güvenli veri çekme - destructuring hatasını önler
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // ── Protected pages: redirect to login ───────────────────
  const protectedPaths = ['/write', '/profile/edit', '/library', '/dashboard', '/notifications', '/admin']
  const isProtected = protectedPaths.some(p => pathname.startsWith(p))

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // ── Admin-only pages ──────────────────────────────────────
  if (pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, is_banned')
      .eq('id', user.id)
      .single()
      
    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // ── Ban check: block banned users from creating content ──
  if (user && (
    pathname.startsWith('/write') ||
    pathname.startsWith('/api/ai') ||
    pathname.startsWith('/api/comments')
  )) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_banned')
      .eq('id', user.id)
      .single()

    if (profile?.is_banned) {
      // API routes: return 403
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Your account has been suspended.' },
          { status: 403 }
        )
      }
      // Pages: redirect to home with message
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('banned', '1')
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}