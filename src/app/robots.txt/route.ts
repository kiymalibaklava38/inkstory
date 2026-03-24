import { NextResponse } from 'next/server'

export function GET() {
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /library
Disallow: /notifications
Disallow: /profile/edit
Disallow: /write
Disallow: /api/

Sitemap: https://inkstory.com.tr/sitemap.xml`

  return new NextResponse(body, {
    headers: { 'Content-Type': 'text/plain' },
  })
}
