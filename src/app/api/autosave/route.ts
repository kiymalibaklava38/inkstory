import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { bolumId, baslik, icerik } = await req.json()
  if (!bolumId) return NextResponse.json({ error: 'bolumId gerekli.' }, { status: 400 })
  const supabase = await createClient()

  // Bölümün sahibi mi kontrol et
  const { data: bolum } = await supabase.from('bolumler').select('id').eq('id', bolumId).eq('yazar_id', user.id).single()
  if (!bolum) return NextResponse.json({ error: 'Yetkisiz.' }, { status: 403 })

  const { error: err } = await supabase
    .from('bolum_taslaklar')
    .upsert({ bolum_id: bolumId, yazar_id: user.id, baslik, icerik, saved_at: new Date().toISOString() })

  if (err) return NextResponse.json({ error: err.message }, { status: 500 })
  return NextResponse.json({ success: true, saved_at: new Date().toISOString() })
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const bolumId = new URL(req.url).searchParams.get('bolumId')
  if (!bolumId) return NextResponse.json({ error: 'bolumId gerekli.' }, { status: 400 })
  const supabase = await createClient()
  const { data } = await supabase.from('bolum_taslaklar').select('*').eq('bolum_id', bolumId).eq('yazar_id', user.id).single()
  return NextResponse.json({ draft: data || null })
}

export async function DELETE(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error
  const bolumId = new URL(req.url).searchParams.get('bolumId')
  if (!bolumId) return NextResponse.json({ error: 'bolumId gerekli.' }, { status: 400 })
  const supabase = await createClient()
  await supabase.from('bolum_taslaklar').delete().eq('bolum_id', bolumId).eq('yazar_id', user.id)
  return NextResponse.json({ success: true })
}
