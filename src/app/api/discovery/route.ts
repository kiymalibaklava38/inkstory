import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 5-minute cache
const cache = new Map<string, { data: any; expiresAt: number }>()
const TTL = 5 * 60 * 1000

function cached(key: string, fn: () => Promise<any>) {
  const hit = cache.get(key)
  if (hit && Date.now() < hit.expiresAt) return Promise.resolve(hit.data)
  return fn().then(data => {
    cache.set(key, { data, expiresAt: Date.now() + TTL })
    return data
  })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  const storySelect = '*, profiles(id,username,display_name,avatar_url,is_premium,is_verified,verification_badge), kategoriler(id,ad,slug,renk,ikon)'

  const [verifiedStories, dailyPick, newBoosted] = await Promise.all([

    // ── Doğrulanmış Yazarların Eserleri ───────────────────
    cached('verified-stories', async () => {
      const { data } = await supabase
        .from('hikayeler')
        .select(storySelect)
        .in('durum', ['yayinda', 'tamamlandi'])
        .eq('profiles.is_verified', true)
        .order('goruntuleme', { ascending: false })
        .limit(6)
      return (data || []).filter((s: any) => s.profiles?.is_verified)
    }),

    // ── Günün Seçimi ──────────────────────────────────────
    cached('daily-pick', async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from('hikayeler')
        .select(storySelect)
        .eq('is_daily_pick', true)
        .gte('daily_pick_at', since)
        .in('durum', ['yayinda', 'tamamlandi'])
        .order('daily_pick_at', { ascending: false })
        .limit(1)
      return data?.[0] || null
    }),

    // ── Şanslı İlk 100 (boosted yeni hikayeler) ──────────
    cached('boosted-new', async () => {
      const now = new Date().toISOString()
      const { data } = await supabase
        .from('hikayeler')
        .select(storySelect)
        .in('durum', ['yayinda', 'tamamlandi'])
        .gt('boost_until', now)
        .lt('goruntuleme', 100)
        .order('created_at', { ascending: false })
        .limit(6)
      return data || []
    }),
  ])

  // ── Yükselen Kalemler (rising writers via engagement) ──
  // Fetch engagement logs from last 24h
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentEngagement } = await supabase
    .from('engagement_logs')
    .select('hikaye_id, event_type')
    .gte('created_at', since24h)

  let risingStories: any[] = []

  if (recentEngagement && recentEngagement.length > 0) {
    // Count per story
    const engMap: Record<string, { reads: number; likes: number }> = {}
    for (const e of recentEngagement) {
      if (!engMap[e.hikaye_id]) engMap[e.hikaye_id] = { reads: 0, likes: 0 }
      if (e.event_type === 'read') engMap[e.hikaye_id].reads++
      if (e.event_type === 'like') engMap[e.hikaye_id].likes++
    }

    const storyIds = Object.keys(engMap)
    if (storyIds.length > 0) {
      const { data: stories } = await supabase
        .from('hikayeler')
        .select(storySelect)
        .in('id', storyIds)
        .in('durum', ['yayinda', 'tamamlandi'])
        .eq('profiles.is_verified', false)

      // Score by momentum
      risingStories = (stories || [])
        .filter((s: any) => !s.profiles?.is_verified)
        .map((s: any) => ({
          ...s,
          _reads24h: engMap[s.id]?.reads || 0,
          _likes24h: engMap[s.id]?.likes || 0,
          _momentum: (engMap[s.id]?.reads || 0) + (engMap[s.id]?.likes || 0) * 4,
        }))
        .sort((a: any, b: any) => b._momentum - a._momentum)
        .slice(0, 6)
    }
  }

  return NextResponse.json({
    verifiedStories,
    risingStories,
    dailyPick,
    newBoosted,
  }, { headers: { 'Cache-Control': 'public, max-age=300' } })
}
