import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { checkRateLimit, authLimiter, apiLimiter } from '@/lib/ratelimit'
import { applySecurityHeaders } from '@/lib/security-headers'

export async function middleware(request: NextRequest) {
  const { pathname, hash } = request.nextUrl

  // ── 1. Recovery Link Redirection ──────────────────────
  // Eğer ana sayfaya #access_token ile gelindiyse reset-password'e yönlendir
  if (pathname === '/' && hash.includes('access_token')) {
    return NextResponse.redirect(new URL(`/reset-password${hash}`, request.url))
  }

  // ── 2. Rate limiting ──────────────────────────────────
  const isRSCPrefetch = request.nextUrl.searchParams.has('_rsc') ||
    request.headers.get('rsc') === '1'

  if (!isRSCPrefetch) {
    if (request.method === 'POST' &&
      (pathname.startsWith('/login') || pathname.startsWith('/register') || pathname === '/auth/callback')) {
      const limited = await checkRateLimit(request, authLimiter)
      if (limited) return limited
    }

    if (pathname.startsWith('/api/')) {
      const limited = await checkRateLimit(request, apiLimiter)
      if (limited) return limited
    }
  }

  // ── 3. Block suspicious requests ──────────────────────
  const ua = request.headers.get('user-agent') || ''

  if (pathname.startsWith('/api/') && !ua) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const blockedPaths = [
    '/wp-admin', '/wp-login', '/.env', '/config.php',
    '/phpinfo', '/adminer', '/.git', '/backup',
  ]
  if (blockedPaths.some(p => pathname.toLowerCase().startsWith(p))) {
    return new NextResponse(null, { status: 404 })
  }

  // ── 4. Session management (Supabase auth) ─────────────
  const response = await updateSession(request)

  // ── 5. Security headers ────────────────────────────────
  if (
    !pathname.startsWith('/_next/static') &&
    !pathname.startsWith('/_next/image') &&
    !pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/)
  ) {
    applySecurityHeaders(response)
  }

  // ── 6. Add request ID for tracing ────────────────────
  const requestId = crypto.randomUUID()
  response.headers.set('X-Request-Id', requestId)

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
}