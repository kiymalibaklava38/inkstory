import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

// GET — kullanıcının tüm konuşmaları
export async function GET() {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const supabase = await createClient()

  const { data } = await supabase
    .from('konusmalar')
    .select(`
      id, son_mesaj_at, created_at,
      katilimci_1, katilimci_2,
      p1:profiles!konusmalar_katilimci_1_fkey(id, username, display_name, avatar_url, is_verified),
      p2:profiles!konusmalar_katilimci_2_fkey(id, username, display_name, avatar_url, is_verified)
    `)
    .or(`katilimci_1.eq.${user.id},katilimci_2.eq.${user.id}`)
    .order('son_mesaj_at', { ascending: false })
    .limit(50)

  // Son mesaj + okunmamış sayısını çek
  const enriched = await Promise.all((data || []).map(async (conv: any) => {
    const { data: lastMsg } = await supabase
      .from('mesajlar')
      .select('icerik, gonderen_id, created_at, okundu, silinmis')
      .eq('konusma_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const { count: unread } = await supabase
      .from('mesajlar')
      .select('id', { count: 'exact', head: true })
      .eq('konusma_id', conv.id)
      .eq('okundu', false)
      .neq('gonderen_id', user.id)

    const other = conv.katilimci_1 === user.id ? conv.p2 : conv.p1

    return { ...conv, other, lastMsg, unread: unread || 0 }
  }))

  return NextResponse.json({ conversations: enriched })
}

// POST — konuşma başlat veya mevcut olanı getir
export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const { targetUserId } = await req.json()
  if (!targetUserId || targetUserId === user.id)
    return NextResponse.json({ error: 'Geçersiz kullanıcı.' }, { status: 400 })

  const supabase = await createClient()

  // Engelleme kontrolü
  const { data: block } = await supabase
    .from('engellemeler')
    .select('id')
    .or(`and(engelleyen_id.eq.${user.id},engellenen_id.eq.${targetUserId}),and(engelleyen_id.eq.${targetUserId},engellenen_id.eq.${user.id})`)
    .single()

  if (block)
    return NextResponse.json({ error: 'Bu kullanıcıyla mesajlaşamazsın.' }, { status: 403 })

  // Canonical order — küçük UUID önce
  const [k1, k2] = [user.id, targetUserId].sort()

  const { data: existing } = await supabase
    .from('konusmalar')
    .select('id')
    .eq('katilimci_1', k1)
    .eq('katilimci_2', k2)
    .single()

  if (existing)
    return NextResponse.json({ conversationId: existing.id })

  const { data: newConv, error } = await supabase
    .from('konusmalar')
    .insert({ katilimci_1: k1, katilimci_2: k2 })
    .select('id')
    .single()

  if (error)
    return NextResponse.json({ error: 'Konuşma başlatılamadı.' }, { status: 500 })

  return NextResponse.json({ conversationId: newConv.id })
}
