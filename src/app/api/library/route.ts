import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

// GET — tüm klasörler + her klasördeki hikayeler
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const supabase = await createClient()

  const [{ data: folders }, { data: saved }] = await Promise.all([
    supabase.from('okuma_klasorleri')
      .select('*').eq('kullanici_id', user.id).order('sira'),
    supabase.from('okuma_listesi')
      .select('id, hikaye_id, klasor_id, created_at, hikayeler(id,baslik,slug,kapak_url,goruntuleme,profiles(username,display_name,avatar_url),kategoriler(ad,ikon,renk))')
      .eq('kullanici_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  return NextResponse.json({ folders: folders || [], saved: saved || [] })
}

// POST — klasör oluştur VEYA hikayeyi klasöre ekle/çıkar
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const body = await req.json()
  const supabase = await createClient()

  // Klasör oluştur
  if (body.action === 'create_folder') {
    const { ad, renk, ikon } = body
    if (!ad?.trim()) return NextResponse.json({ error: 'Klasör adı gerekli.' }, { status: 400 })
    const { data, error: err } = await supabase.from('okuma_klasorleri')
      .insert({ kullanici_id: user.id, ad: ad.trim(), renk: renk || '#d4840f', ikon: ikon || '📚' })
      .select().single()
    if (err) return NextResponse.json({ error: err.message }, { status: 500 })
    return NextResponse.json({ folder: data }, { status: 201 })
  }

  // Hikayeyi klasöre taşı
  if (body.action === 'move_to_folder') {
    const { hikayeId, klasorId } = body
    await supabase.from('okuma_listesi')
      .update({ klasor_id: klasorId || null })
      .eq('kullanici_id', user.id)
      .eq('hikaye_id', hikayeId)
    return NextResponse.json({ success: true })
  }

  // Klasör sil
  if (body.action === 'delete_folder') {
    // Klasördeki hikayeleri sınıflandırmasız yap
    await supabase.from('okuma_listesi')
      .update({ klasor_id: null })
      .eq('kullanici_id', user.id)
      .eq('klasor_id', body.klasorId)
    await supabase.from('okuma_klasorleri')
      .delete().eq('id', body.klasorId).eq('kullanici_id', user.id)
    return NextResponse.json({ success: true })
  }

  // Klasörü yeniden adlandır
  if (body.action === 'rename_folder') {
    const { klasorId, ad, renk, ikon } = body
    await supabase.from('okuma_klasorleri')
      .update({ ad, renk, ikon, updated_at: new Date().toISOString() })
      .eq('id', klasorId).eq('kullanici_id', user.id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Geçersiz action.' }, { status: 400 })
}

// DELETE — hikayeyi kütüphaneden çıkar
export async function DELETE(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const hikayeId = new URL(req.url).searchParams.get('hikayeId')
  if (!hikayeId) return NextResponse.json({ error: 'hikayeId gerekli.' }, { status: 400 })
  const supabase = await createClient()
  await supabase.from('okuma_listesi')
    .delete().eq('kullanici_id', user.id).eq('hikaye_id', hikayeId)
  return NextResponse.json({ success: true })
}
