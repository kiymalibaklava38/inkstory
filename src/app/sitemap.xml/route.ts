import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BASE = 'https://inkstory.com.tr'

function url(loc: string, lastmod?: string, priority = '0.8', changefreq = 'weekly') {
  return `  <url>
    <loc>${BASE}${loc}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

export async function GET() {
  const supabase = await createClient()

  // Tüm yayındaki hikayeleri çek
  const { data: stories } = await supabase
    .from('hikayeler')
    .select('slug, updated_at, created_at')
    .in('durum', ['yayinda', 'tamamlandi'])
    .order('created_at', { ascending: false })
    .limit(1000)

  // Tüm profilleri çek
  const { data: profiles } = await supabase
    .from('profiles')
    .select('username, updated_at')
    .not('username', 'is', null)
    .limit(500)

  const staticPages = [
    url('/', undefined, '1.0', 'daily'),
    url('/stories', undefined, '0.9', 'hourly'),
    url('/search', undefined, '0.8', 'daily'),
    url('/premium', undefined, '0.5', 'monthly'),
    url('/terms', undefined, '0.3', 'monthly'),
  ]

  const storyPages = (stories || []).map(s =>
    url(`/story/${s.slug}`, new Date(s.updated_at || s.created_at).toISOString().split('T')[0], '0.8', 'weekly')
  )

  const profilePages = (profiles || []).map(p =>
    url(`/profile/${p.username}`, p.updated_at ? new Date(p.updated_at).toISOString().split('T')[0] : undefined, '0.6', 'weekly')
  )

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticPages, ...storyPages, ...profilePages].join('\n')}
</urlset>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
