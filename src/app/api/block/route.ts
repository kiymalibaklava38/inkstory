import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

// GET — engellenen kullanıcılar listesi
export async function GET() {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const supabase = await createClient()
  const { data } = await supabase
    .from('engellemeler')
    .select('engellenen_id, created_at, profiles!engellemeler_engellenen_id_fkey(username, display_name, avatar_url)')
    .eq('engelleyen_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ blocked: data || [] })
}

// POST — engelle
export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const { targetUserId } = await req.json()
  if (!targetUserId || targetUserId === user.id)
    return NextResponse.json({ error: 'Geçersiz kullanıcı.' }, { status: 400 })

  const supabase = await createClient()

  // Takibi de kaldır
  await supabase.from('takip').delete()
    .or(`and(takipci_id.eq.${user.id},takip_edilen_id.eq.${targetUserId}),and(takipci_id.eq.${targetUserId},takip_edilen_id.eq.${user.id})`)

  const { error } = await supabase
    .from('engellemeler')
    .upsert({ engelleyen_id: user.id, engellenen_id: targetUserId })

  if (error)
    return NextResponse.json({ error: 'Engellenemedi.' }, { status: 500 })

  return NextResponse.json({ success: true })
}

// DELETE — engeli kaldır
export async function DELETE(req: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const targetUserId = new URL(req.url).searchParams.get('userId')
  if (!targetUserId)
    return NextResponse.json({ error: 'userId gerekli.' }, { status: 400 })

  const supabase = await createClient()
  await supabase.from('engellemeler')
    .delete()
    .eq('engelleyen_id', user.id)
    .eq('engellenen_id', targetUserId)

  return NextResponse.json({ success: true })
}
