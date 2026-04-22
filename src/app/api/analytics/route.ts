import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const supabase = await createClient()
  const days = parseInt(new URL(req.url).searchParams.get('days') || '30')

  // Hikayeleri al
  const { data: stories } = await supabase
    .from('hikayeler')
    .select('id,baslik,slug,goruntuleme,durum,created_at,kategoriler(ad,ikon)')
    .eq('yazar_id', user.id)
    .order('goruntuleme', { ascending: false })

  if (!stories?.length) return NextResponse.json({ stories: [], totals: { reads: 0, stories: 0, followers: 0, comments: 0 } })

  const storyIds = stories.map(s => s.id)

  // Son N günün istatistikleri
  const since = new Date()
  since.setDate(since.getDate() - days)

  const [{ data: dailyStats }, { count: followerCount }, { count: commentCount }, { count: likeCount }] = await Promise.all([
    supabase.from('hikaye_istatistikleri')
      .select('hikaye_id,tarih,goruntuleme')
      .in('hikaye_id', storyIds)
      .gte('tarih', since.toISOString().split('T')[0])
      .order('tarih'),
    supabase.from('takip').select('*', { count: 'exact', head: true }).eq('takip_edilen_id', user.id),
    supabase.from('yorumlar').select('*', { count: 'exact', head: true }).in('hikaye_id', storyIds),
    supabase.from('begeniler').select('*', { count: 'exact', head: true }).in('hikaye_id', storyIds),
  ])

  // Günlük okuma grafiği için veri hazırla
  const dateMap: Record<string, number> = {}
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dateMap[d.toISOString().split('T')[0]] = 0
  }
  ;(dailyStats || []).forEach((s: any) => {
    if (dateMap[s.tarih] !== undefined) dateMap[s.tarih] += s.goruntuleme
  })
  const chart = Object.entries(dateMap).map(([date, reads]) => ({ date, reads }))

  // En çok okunan hikayeler
  const topStories = [...(stories || [])].sort((a, b) => (b.goruntuleme || 0) - (a.goruntuleme || 0)).slice(0, 5)

  const totals = {
    reads:     stories.reduce((a, s) => a + (s.goruntuleme || 0), 0),
    stories:   stories.length,
    followers: followerCount || 0,
    comments:  commentCount || 0,
    likes:     likeCount || 0,
  }

  return NextResponse.json({ stories, topStories, chart, totals, days })
}
