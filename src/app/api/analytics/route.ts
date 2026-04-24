import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const supabase = await createClient()
  const days = Math.min(parseInt(new URL(req.url).searchParams.get('days') || '30'), 90)

  // Kullanıcının hikayeleri
  const { data: stories } = await supabase
    .from('hikayeler')
    .select('id, baslik, slug, goruntuleme, durum, created_at, kategoriler(ad, ikon)')
    .eq('yazar_id', user.id)
    .order('goruntuleme', { ascending: false })

  if (!stories?.length) {
    return NextResponse.json({
      stories: [],
      topStories: [],
      chart: buildEmptyChart(days),
      totals: { reads: 0, stories: 0, followers: 0, comments: 0, likes: 0 },
      days,
    })
  }

  const storyIds = stories.map(s => s.id)

  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString()

  // Paralel sorgular
  const [
    { data: engagementLogs },
    { count: followerCount },
    { count: commentCount },
    { count: likeCount },
  ] = await Promise.all([
    // engagement_logs tablosundan günlük okuma sayıları
    supabase
      .from('engagement_logs')
      .select('created_at, event_type')
      .in('hikaye_id', storyIds)
      .eq('event_type', 'read')
      .gte('created_at', sinceStr)
      .order('created_at'),
    supabase.from('takip')
      .select('*', { count: 'exact', head: true })
      .eq('takip_edilen_id', user.id),
    supabase.from('yorumlar')
      .select('*', { count: 'exact', head: true })
      .in('hikaye_id', storyIds),
    supabase.from('begeniler')
      .select('*', { count: 'exact', head: true })
      .in('hikaye_id', storyIds),
  ])

  // Günlük chart verisi oluştur
  const dateMap: Record<string, number> = buildEmptyDateMap(days)
  ;(engagementLogs || []).forEach((log: any) => {
    const date = log.created_at.split('T')[0]
    if (dateMap[date] !== undefined) dateMap[date]++
  })
  const chart = Object.entries(dateMap).map(([date, reads]) => ({ date, reads }))

  // Toplam okuma
  const totalReads = stories.reduce((a, s) => a + (s.goruntuleme || 0), 0)
  const topStories = [...stories].slice(0, 5)

  return NextResponse.json({
    stories,
    topStories,
    chart,
    totals: {
      reads:     totalReads,
      stories:   stories.length,
      followers: followerCount || 0,
      comments:  commentCount  || 0,
      likes:     likeCount     || 0,
    },
    days,
  })
}

function buildEmptyDateMap(days: number): Record<string, number> {
  const map: Record<string, number> = {}
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    map[d.toISOString().split('T')[0]] = 0
  }
  return map
}

function buildEmptyChart(days: number) {
  return Object.entries(buildEmptyDateMap(days)).map(([date, reads]) => ({ date, reads }))
}
