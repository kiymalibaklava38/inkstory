import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const { conversationId } = await req.json()
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

  if (!conv) {
    console.error('[Read] Konuşma bulunamadı:', conversationId, user.id)
    return NextResponse.json({ error: 'Konuşma bulunamadı.' }, { status: 404 })
  }

  // Bana gelen okunmamış mesajları okundu yap
  const { error, count } = await supabase
    .from('mesajlar')
    .update({ okundu: true })
    .eq('konusma_id', conversationId)
    .eq('okundu', false)
    .neq('gonderen_id', user.id)

  if (error) {
    console.error('[Read] Update error:', error.message, error.code, error.details)
    return NextResponse.json({ error: 'Güncellenemedi.', detail: error.message }, { status: 500 })
  }

  console.log(`[Read] ${count ?? '?'} mesaj okundu işaretlendi. conv=${conversationId}`)
  return NextResponse.json({ success: true })
}
