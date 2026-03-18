import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { checkRateLimit, authLimiter, apiLimiter, getClientIp } from '@/lib/ratelimit'
import { applySecurityHeaders } from '@/lib/security-headers'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── 1. Rate limiting ───────────────────────────────────
  // Auth endpoints — strict limit to prevent brute-force
  if (pathname.startsWith('/login') || pathname.startsWith('/register') || pathname === '/auth/callback') {
    const limited = await checkRateLimit(request, authLimiter)
    if (limited) return limited
  }

  // API routes — general limit
  if (pathname.startsWith('/api/')) {
    const limited = await checkRateLimit(request, apiLimiter)
    if (limited) return limited
  }

  // ── 2. Block suspicious requests ──────────────────────
  const ua = request.headers.get('user-agent') || ''

  // Block empty user-agents on API routes (bots/scanners)
  if (pathname.startsWith('/api/') && !ua) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Block common scanner paths
  const blockedPaths = [
    '/wp-admin', '/wp-login', '/.env', '/config.php',
    '/phpinfo', '/adminer', '/.git', '/backup',
  ]
  if (blockedPaths.some(p => pathname.toLowerCase().startsWith(p))) {
    return new NextResponse(null, { status: 404 })
  }

  // ── 3. Session management (Supabase auth) ─────────────
  const response = await updateSession(request)

  // ── 4. Security headers ────────────────────────────────
  // Apply to all non-static responses
  if (
    !pathname.startsWith('/_next/static') &&
    !pathname.startsWith('/_next/image') &&
    !pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/)
  ) {
    applySecurityHeaders(response)
  }

  // ── 5. Add request ID for tracing ────────────────────
  const requestId = crypto.randomUUID()
  response.headers.set('X-Request-Id', requestId)

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
}
