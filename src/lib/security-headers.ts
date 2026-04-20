import { NextResponse } from 'next/server'

export function applySecurityHeaders(response: NextResponse): NextResponse {
  const isDev = process.env.NODE_ENV !== 'production'

  // Development: skip CSP — Next.js HMR requires eval and dynamic scripts
  if (isDev) {
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.delete('X-Powered-By')
    return response
  }

  // Production CSP
  const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
    : '*.supabase.co'

  const csp = [
    `default-src 'self'`,
    // Paddle.js CDN + Next.js inline scripts
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.paddle.com`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.paddle.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `img-src 'self' data: blob: https://${supabaseHost} https://avatars.githubusercontent.com https://*.paddle.com`,
    // Supabase realtime + Paddle API + Paddle sandbox
    `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://api.paddle.com https://sandbox-api.paddle.com https://*.paddle.com`,
    // Paddle overlay checkout iframe
    `frame-src 'self' https://*.paddle.com https://paddle.com`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self' https://*.paddle.com`,
    `upgrade-insecure-requests`,
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  response.headers.delete('X-Powered-By')
  response.headers.delete('Server')

  return response
}
