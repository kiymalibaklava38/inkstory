import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ActionSchema = z.object({
  applicationId: z.string().uuid(),
  action:        z.enum(['approve', 'reject']),
  reason:        z.string().max(500).optional(),
  badge:         z.enum(['author', 'editor', 'staff']).default('author'),
})

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'pending'

  const { data, error: dbErr } = await supabase
    .from('verification_applications')
    .select('*, profiles(id,username,display_name,avatar_url,is_verified)')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ applications: data || [] })
}

export async function PATCH(req: NextRequest) {
  const { user: admin, error } = await requireAdmin()
  if (error) return error

  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = ActionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 })

  const { applicationId, action, reason, badge } = parsed.data
  const supabase = await createClient()

  const { data: app } = await supabase
    .from('verification_applications')
    .select('user_id')
    .eq('id', applicationId)
    .single()

  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  // Update application
  await supabase.from('verification_applications').update({
    status:        action === 'approve' ? 'approved' : 'rejected',
    reject_reason: reason || null,
    reviewed_by:   admin.id,
    reviewed_at:   new Date().toISOString(),
    updated_at:    new Date().toISOString(),
  }).eq('id', applicationId)

  // Update profile
  if (action === 'approve') {
    await supabase.from('profiles').update({
      is_verified:        true,
      verified_at:        new Date().toISOString(),
      verification_badge: badge,
    }).eq('id', app.user_id)
  } else {
    await supabase.from('profiles').update({
      is_verified: false,
    }).eq('id', app.user_id)
  }

  return NextResponse.json({ success: true })
}
