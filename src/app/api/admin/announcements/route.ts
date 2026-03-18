import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { checkRateLimit, apiLimiter } from '@/lib/ratelimit'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateSchema = z.object({
  title:   z.string().min(1).max(200).trim(),
  message: z.string().min(1).max(2000).trim(),
  active:  z.boolean().default(false),
})

const UpdateSchema = z.object({
  id:      z.string().uuid(),
  title:   z.string().min(1).max(200).trim().optional(),
  message: z.string().min(1).max(2000).trim().optional(),
  active:  z.boolean().optional(),
})

// GET all announcements (admin sees all, including inactive)
export async function GET(req: NextRequest) {
  const limited = await checkRateLimit(req, apiLimiter)
  if (limited) return limited

  const { error } = await requireAdmin()
  if (error) return error

  const supabase = await createClient()
  const { data, error: dbErr } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json({ announcements: data || [] })
}

// POST create new announcement
export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, apiLimiter)
  if (limited) return limited

  const { user, error } = await requireAdmin()
  if (error) return error

  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 })

  const supabase = await createClient()

  // If activating, deactivate all others first (only one active at a time)
  if (parsed.data.active) {
    await supabase.from('announcements').update({ active: false }).eq('active', true)
  }

  const { data, error: dbErr } = await supabase
    .from('announcements')
    .insert(parsed.data)
    .select()
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  await supabase.rpc('log_audit', {
    p_action: 'admin_create_announcement', p_table_name: 'announcements',
    p_record_id: data.id, p_metadata: JSON.stringify({ title: parsed.data.title }),
  })

  return NextResponse.json({ announcement: data }, { status: 201 })
}

// PATCH update announcement
export async function PATCH(req: NextRequest) {
  const limited = await checkRateLimit(req, apiLimiter)
  if (limited) return limited

  const { error } = await requireAdmin()
  if (error) return error

  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 })

  const { id, ...updates } = parsed.data
  const supabase = await createClient()

  // If activating, deactivate all others first
  if (updates.active === true) {
    await supabase.from('announcements').update({ active: false }).neq('id', id)
  }

  const { data, error: dbErr } = await supabase
    .from('announcements')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json({ announcement: data })
}

// DELETE remove announcement
export async function DELETE(req: NextRequest) {
  const limited = await checkRateLimit(req, apiLimiter)
  if (limited) return limited

  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: 'Valid ID required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error: dbErr } = await supabase.from('announcements').delete().eq('id', id)
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
