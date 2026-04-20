import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

// GET — konuşmanın mesajları
export async function GET(req: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const conversationId = new URL(req.url).searchParams.get('conversationId')
  if (!conversationId)
    return NextResponse.json({ error: 'conversationId gerekli.' }, { status: 400 })

  const supabase = await createClient()

  // Kullanıcı bu konuşmada mı?
  const { data: conv } = await supabase
    .from('konusmalar')
    .select('id')
    .eq('id', conversationId)
    .or(`katilimci_1.eq.${user.id},katilimci_2.eq.${user.id}`)
    .single()

  if (!conv)
    return NextResponse.json({ error: 'Konuşma bulunamadı.' }, { status: 404 })

  const { data: messages } = await supabase
    .from('mesajlar')
    .select('id, icerik, gonderen_id, okundu, silinmis, created_at, profiles(username, display_name, avatar_url)')
    .eq('konusma_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(100)

  // Okunmamışları okundu işaretle
  await supabase
    .from('mesajlar')
    .update({ okundu: true })
    .eq('konusma_id', conversationId)
    .eq('okundu', false)
    .neq('gonderen_id', user.id)

  return NextResponse.json({ messages: messages || [] })
}

// POST — mesaj gönder
export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const { conversationId, content } = await req.json()
  if (!conversationId || !content?.trim())
    return NextResponse.json({ error: 'Mesaj içeriği boş olamaz.' }, { status: 400 })

  if (content.trim().length > 2000)
    return NextResponse.json({ error: 'Mesaj 2000 karakterden uzun olamaz.' }, { status: 400 })

  const supabase = await createClient()

  // Kullanıcı bu konuşmada mı?
  const { data: conv } = await supabase
    .from('konusmalar')
    .select('id, katilimci_1, katilimci_2')
    .eq('id', conversationId)
    .or(`katilimci_1.eq.${user.id},katilimci_2.eq.${user.id}`)
    .single()

  if (!conv)
    return NextResponse.json({ error: 'Konuşma bulunamadı.' }, { status: 404 })

  const otherId = conv.katilimci_1 === user.id ? conv.katilimci_2 : conv.katilimci_1

  // Engelleme kontrolü
  const { data: block } = await supabase
    .from('engellemeler')
    .select('id')
    .or(`and(engelleyen_id.eq.${user.id},engellenen_id.eq.${otherId}),and(engelleyen_id.eq.${otherId},engellenen_id.eq.${user.id})`)
    .single()

  if (block)
    return NextResponse.json({ error: 'Bu kullanıcıyla mesajlaşamazsın.' }, { status: 403 })

  const { data: message, error } = await supabase
    .from('mesajlar')
    .insert({ konusma_id: conversationId, gonderen_id: user.id, icerik: content.trim() })
    .select('id, icerik, gonderen_id, okundu, silinmis, created_at, profiles(username, display_name, avatar_url)')
    .single()

  if (error)
    return NextResponse.json({ error: 'Mesaj gönderilemedi.' }, { status: 500 })

  // Son mesaj tarihini güncelle
  await supabase
    .from('konusmalar')
    .update({ son_mesaj_at: new Date().toISOString() })
    .eq('id', conversationId)

  return NextResponse.json({ message })
}

// DELETE — kendi mesajını sil
export async function DELETE(req: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const messageId = new URL(req.url).searchParams.get('id')
  if (!messageId)
    return NextResponse.json({ error: 'messageId gerekli.' }, { status: 400 })

  const supabase = await createClient()

  const { error } = await supabase
    .from('mesajlar')
    .update({ silinmis: true, icerik: 'Bu mesaj silindi.' })
    .eq('id', messageId)
    .eq('gonderen_id', user.id)

  if (error)
    return NextResponse.json({ error: 'Silinemedi.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
