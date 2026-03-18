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

  // Trending hesaplama: son 24 saatin engagement verisi
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Engagement sayılarını çek
  const { data: engagements } = await supabase
    .from('engagement_logs')
    .select('hikaye_id, event_type')
    .gte('created_at', since24h)

  if (!engagements || engagements.length === 0) {
    // Engagement yoksa en yeni yayınlanan 10 hikayeyi döndür
    const { data: fallback } = await supabase
      .from('hikayeler')
      .select('*, profiles(id,username,display_name,avatar_url,is_premium), kategoriler(id,ad,slug,renk,ikon)')
      .in('durum', ['yayinda', 'tamamlandi'])
      .order('created_at', { ascending: false })
      .limit(limit)

    return NextResponse.json({ stories: fallback || [], cached: false, fallback: true })
  }

  // Hikaye bazında engagement topla
  const engMap: Record<string, { reads: number; likes: number; comments: number; bookmarks: number }> = {}

  for (const e of engagements) {
    if (!engMap[e.hikaye_id]) {
      engMap[e.hikaye_id] = { reads: 0, likes: 0, comments: 0, bookmarks: 0 }
    }
    const m = engMap[e.hikaye_id]
    if (e.event_type === 'read')     m.reads++
    if (e.event_type === 'like')     m.likes++
    if (e.event_type === 'comment')  m.comments++
    if (e.event_type === 'bookmark') m.bookmarks++
  }

  // İlgili hikayeleri çek
  const storyIds = Object.keys(engMap)
  if (storyIds.length === 0) {
    return NextResponse.json({ stories: [], cached: false })
  }

  const { data: stories } = await supabase
    .from('hikayeler')
    .select('*, profiles(id,username,display_name,avatar_url,is_premium), kategoriler(id,ad,slug,renk,ikon)')
    .in('id', storyIds)
    .in('durum', ['yayinda', 'tamamlandi'])

  if (!stories) return NextResponse.json({ stories: [], cached: false })

  // Trending score hesapla
  const now = Date.now()
  const scored = stories.map(story => {
    const e = engMap[story.id] || { reads: 0, likes: 0, comments: 0, bookmarks: 0 }
    const rawScore = e.reads * 1 + e.likes * 3 + e.comments * 4 + e.bookmarks * 2

    // Time decay: yayınlanma üzerinden geçen saat
    const publishedAt = new Date(story.created_at).getTime()
    const hoursSince  = Math.max((now - publishedAt) / (1000 * 60 * 60), 0.1)

    // sqrt time decay — logaritmik yaklaşım
    const decayedScore = rawScore / Math.sqrt(hoursSince + 2)

    return {
      ...story,
      trending_score:  isNaN(decayedScore) ? 0 : Math.round(decayedScore * 100) / 100,
      reads_24h:       e.reads,
      likes_24h:       e.likes,
      comments_24h:    e.comments,
      bookmarks_24h:   e.bookmarks,
    }
  })

  // Skora göre sırala, en yüksek ilk
  scored.sort((a, b) => b.trending_score - a.trending_score)
  const topN = scored.slice(0, limit)

  // Cache'e kaydet
  cache = { data: topN, expiresAt: Date.now() + CACHE_TTL_MS }

  return NextResponse.json(
    { stories: topN, cached: false },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=60' } }
  )
}
