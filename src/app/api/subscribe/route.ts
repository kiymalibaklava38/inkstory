import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { hikayeId } = await req.json()
  if (!hikayeId) return NextResponse.json({ error: 'Missing hikayeId' }, { status: 400 })

  const supabase = await createClient()

  const { error: insertErr } = await supabase
    .from('hikaye_abonelikleri')
    .insert({ user_id: user.id, hikaye_id: hikayeId })

  if (insertErr?.code === '23505') // unique violation
    return NextResponse.json({ subscribed: true, already: true })

  return NextResponse.json({ subscribed: true })
}

export async function DELETE(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { hikayeId } = await req.json()
  const supabase = await createClient()

  await supabase
    .from('hikaye_abonelikleri')
    .delete()
    .eq('user_id', user.id)
    .eq('hikaye_id', hikayeId)

  return NextResponse.json({ subscribed: false })
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return NextResponse.json({ subscribed: false })

  const { searchParams } = new URL(req.url)
  const hikayeId = searchParams.get('hikayeId')
  if (!hikayeId) return NextResponse.json({ subscribed: false })

  const supabase = await createClient()
  const { data } = await supabase
    .from('hikaye_abonelikleri')
    .select('id')
    .eq('user_id', user.id)
    .eq('hikaye_id', hikayeId)
    .single()

  return NextResponse.json({ subscribed: !!data })
}
