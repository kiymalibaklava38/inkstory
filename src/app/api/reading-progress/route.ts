import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const Schema = z.object({
  hikaye_id:   z.string().uuid(),
  bolum_no:    z.number().int().min(1),
  total_bolum: z.number().int().min(1),
})

// GET — kullanıcının hikayedeki konumu
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const hikayeId = searchParams.get('hikaye_id')
  if (!hikayeId) return NextResponse.json({ error: 'hikaye_id required' }, { status: 400 })

  const supabase = await createClient()
  const { data } = await supabase
    .from('reading_progress')
    .select('bolum_no, total_bolum, updated_at')
    .eq('user_id', user.id)
    .eq('hikaye_id', hikayeId)
    .single()

  return NextResponse.json({ progress: data || null })
}

// POST — konumu kaydet/güncelle
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const { hikaye_id, bolum_no, total_bolum } = parsed.data
  const supabase = await createClient()

  const { error: dbErr } = await supabase
    .from('reading_progress')
    .upsert({
      user_id:     user.id,
      hikaye_id,
      bolum_no,
      total_bolum,
      updated_at:  new Date().toISOString(),
    }, { onConflict: 'user_id,hikaye_id' })

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
