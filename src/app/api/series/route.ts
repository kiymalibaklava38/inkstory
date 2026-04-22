import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

// GET — kullanıcının serileri
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const supabase = await createClient()
  const { data } = await supabase
    .from('seriler')
    .select('*, seri_hikayeleri(hikaye_id, sira, hikayeler(id,baslik,slug,kapak_url,goruntuleme))')
    .eq('yazar_id', user.id)
    .order('created_at', { ascending: false })
  return NextResponse.json({ series: data || [] })
}

// POST — yeni seri oluştur
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { baslik, aciklama } = await req.json()
  if (!baslik?.trim()) return NextResponse.json({ error: 'Başlık gerekli.' }, { status: 400 })
  const supabase = await createClient()
  const { data, error: err } = await supabase
    .from('seriler')
    .insert({ yazar_id: user.id, baslik: baslik.trim(), aciklama: aciklama?.trim() || null })
    .select().single()
  if (err) return NextResponse.json({ error: err.message }, { status: 500 })
  return NextResponse.json({ serie: data }, { status: 201 })
}

// PATCH — seri güncelle / hikaye ekle-çıkar
export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { serieId, baslik, aciklama, addStoryId, removeStoryId, reorder } = await req.json()
  const supabase = await createClient()

  // Seri sahibi kontrolü
  const { data: serie } = await supabase.from('seriler').select('id').eq('id', serieId).eq('yazar_id', user.id).single()
  if (!serie) return NextResponse.json({ error: 'Seri bulunamadı.' }, { status: 404 })

  if (baslik !== undefined) {
    await supabase.from('seriler').update({ baslik, aciklama, updated_at: new Date().toISOString() }).eq('id', serieId)
  }
  if (addStoryId) {
    const { count } = await supabase.from('seri_hikayeleri').select('*', { count: 'exact', head: true }).eq('seri_id', serieId)
    await supabase.from('seri_hikayeleri').upsert({ seri_id: serieId, hikaye_id: addStoryId, sira: (count || 0) + 1 })
  }
  if (removeStoryId) {
    await supabase.from('seri_hikayeleri').delete().eq('seri_id', serieId).eq('hikaye_id', removeStoryId)
  }
  if (reorder && Array.isArray(reorder)) {
    for (const { hikayeId, sira } of reorder) {
      await supabase.from('seri_hikayeleri').update({ sira }).eq('seri_id', serieId).eq('hikaye_id', hikayeId)
    }
  }
  return NextResponse.json({ success: true })
}

// DELETE — seri sil
export async function DELETE(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const serieId = new URL(req.url).searchParams.get('id')
  if (!serieId) return NextResponse.json({ error: 'ID gerekli.' }, { status: 400 })
  const supabase = await createClient()
  await supabase.from('seriler').delete().eq('id', serieId).eq('yazar_id', user.id)
  return NextResponse.json({ success: true })
}
