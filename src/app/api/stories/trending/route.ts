import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── In-memory cache (5 dakika) ────────────────────────────
let cache: { data: any[]; expiresAt: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 dakika

export async function GET(req: NextRequest) {
  // Cache geçerli mi?
  if (cache && Date.now() < cache.expiresAt) {
    return NextResponse.json(
      { stories: cache.data, cached: true },
      { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=60' } }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20)

  // High performance veritabanı RPC trending sorgusu
  const { data: stories, error } = await supabase.rpc('get_trending_stories_v2', {
    p_limit: limit
  })

  if (error) {
    console.error('[Trending API] RPC error:', error.message)
  }

  // Eğer veri yoksa veya hata oluştuysa fallback olarak en yeni hikayeleri döndür
  if (!stories || stories.length === 0) {
    const { data: fallback } = await supabase
      .from('hikayeler')
      .select('*, profiles(id,username,display_name,avatar_url,is_premium), kategoriler(id,ad,slug,renk,ikon)')
      .in('durum', ['yayinda', 'tamamlandi'])
      .order('created_at', { ascending: false })
      .limit(limit)

    return NextResponse.json({ stories: fallback || [], cached: false, fallback: true })
  }

  // Cache'e kaydet
  cache = { data: stories, expiresAt: Date.now() + CACHE_TTL_MS }

  return NextResponse.json(
    { stories, cached: false },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=60' } }
  )
}
