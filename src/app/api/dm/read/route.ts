import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

// POST — konuşmadaki tüm mesajları okundu işaretle
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

  if (!conv)
    return NextResponse.json({ error: 'Konuşma bulunamadı.' }, { status: 404 })

  // Bana gelen tüm okunmamış mesajları okundu yap
  const { error } = await supabase
    .from('mesajlar')
    .update({ okundu: true })
    .eq('konusma_id', conversationId)
    .eq('okundu', false)
    .neq('gonderen_id', user.id)

  if (error)
    return NextResponse.json({ error: 'Güncellenemedi.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
