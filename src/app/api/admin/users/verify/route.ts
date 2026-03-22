import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const Schema = z.object({
  userId: z.string().uuid(),
  action: z.enum(['give_verify', 'remove_verify']),
  badge:  z.enum(['author', 'editor', 'staff']).default('author'),
})

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 })

  const { userId, action, badge } = parsed.data
  const supabase = await createClient()

  if (action === 'give_verify') {
    await supabase.from('profiles').update({
      is_verified:        true,
      verified_at:        new Date().toISOString(),
      verification_badge: badge,
    }).eq('id', userId)

    // Upsert application as approved
    await supabase.from('verification_applications').upsert({
      user_id:     userId,
      status:      'approved',
      updated_at:  new Date().toISOString(),
    }, { onConflict: 'user_id' })
  } else {
    await supabase.from('profiles').update({
      is_verified:        false,
      verified_at:        null,
      verification_badge: 'author',
    }).eq('id', userId)
  }

  return NextResponse.json({ success: true })
}
