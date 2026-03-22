import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

const REQUIREMENTS = {
  followers: 1000,
  reads:     10000,
  chapters:  5,
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const supabase = await createClient()

  const [
    { count: followerCount },
    { count: chapterCount },
    { data: storyData },
    { data: application },
    { data: profile },
  ] = await Promise.all([
    supabase.from('takip').select('*', { count: 'exact', head: true }).eq('takip_edilen_id', user.id),
    supabase.from('bolumler').select('*', { count: 'exact', head: true }).eq('yazar_id', user.id).eq('yayinda', true),
    supabase.from('hikayeler').select('goruntuleme').eq('yazar_id', user.id).in('durum', ['yayinda','tamamlandi']),
    supabase.from('verification_applications').select('*').eq('user_id', user.id).single(),
    supabase.from('profiles').select('is_verified,verification_badge').eq('id', user.id).single(),
  ])

  const totalReads = (storyData || []).reduce((sum, s) => sum + (s.goruntuleme || 0), 0)

  const stats = {
    followers: followerCount || 0,
    reads:     totalReads,
    chapters:  chapterCount || 0,
  }

  // Progress per requirement (0–100)
  const progress = {
    followers: Math.min(100, Math.round((stats.followers / REQUIREMENTS.followers) * 100)),
    reads:     Math.min(100, Math.round((stats.reads     / REQUIREMENTS.reads)     * 100)),
    chapters:  Math.min(100, Math.round((stats.chapters  / REQUIREMENTS.chapters)  * 100)),
  }

  const eligible = stats.followers >= REQUIREMENTS.followers &&
                   stats.reads     >= REQUIREMENTS.reads     &&
                   stats.chapters  >= REQUIREMENTS.chapters

  return NextResponse.json({
    stats,
    progress,
    requirements: REQUIREMENTS,
    eligible,
    application: application || null,
    isVerified: profile?.is_verified || false,
    badge: profile?.verification_badge || 'author',
  })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const supabase = await createClient()

  // Check if already applied
  const { data: existing } = await supabase
    .from('verification_applications')
    .select('id, status')
    .eq('user_id', user.id)
    .single()

  if (existing?.status === 'pending') {
    return NextResponse.json({ error: 'Zaten bekleyen bir başvurun var.' }, { status: 409 })
  }
  if (existing?.status === 'approved') {
    return NextResponse.json({ error: 'Zaten doğrulanmış yazarsın.' }, { status: 409 })
  }

  // Get current stats
  const [
    { count: followers },
    { count: chapters },
    { data: storyData },
  ] = await Promise.all([
    supabase.from('takip').select('*', { count: 'exact', head: true }).eq('takip_edilen_id', user.id),
    supabase.from('bolumler').select('*', { count: 'exact', head: true }).eq('yazar_id', user.id).eq('yayinda', true),
    supabase.from('hikayeler').select('goruntuleme').eq('yazar_id', user.id).in('durum', ['yayinda','tamamlandi']),
  ])

  const reads = (storyData || []).reduce((sum, s) => sum + (s.goruntuleme || 0), 0)

  if ((followers || 0) < REQUIREMENTS.followers ||
      reads < REQUIREMENTS.reads ||
      (chapters || 0) < REQUIREMENTS.chapters) {
    return NextResponse.json({ error: 'Şartları henüz karşılamıyorsun.' }, { status: 400 })
  }

  // Upsert application
  const { error: dbErr } = await supabase
    .from('verification_applications')
    .upsert({
      user_id:        user.id,
      status:         'pending',
      follower_count: followers || 0,
      read_count:     reads,
      chapter_count:  chapters || 0,
      updated_at:     new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
