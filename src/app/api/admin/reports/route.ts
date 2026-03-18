import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { checkRateLimit, apiLimiter } from '@/lib/ratelimit'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ResolveSchema = z.object({
  reportId:  z.string().uuid(),
  action:    z.enum(['dismiss', 'resolve', 'delete_content', 'ban_user']),
  adminNote: z.string().max(500).optional(),
  banReason: z.string().max(500).optional(),
})

// GET: list reports with optional status filter
export async function GET(req: NextRequest) {
  const limited = await checkRateLimit(req, apiLimiter)
  if (limited) return limited

  const { user, error } = await requireAdmin()
  if (error) return error

  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'pending'
  const page   = parseInt(searchParams.get('page') || '1')
  const limit  = 25
  const offset = (page - 1) * limit

  let query = supabase
    .from('reports')
    .select(`
      *,
      reporter:profiles!reporter_id(username, display_name, avatar_url)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status !== 'all') query = query.eq('status', status)

  const { data: reports, count, error: dbErr } = await query
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ reports, total: count, page, limit })
}

// PATCH: admin resolves / acts on a report
export async function PATCH(req: NextRequest) {
  const limited = await checkRateLimit(req, apiLimiter)
  if (limited) return limited

  const { user, error } = await requireAdmin()
  if (error) return error

  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = ResolveSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 })

  const { reportId, action, adminNote, banReason } = parsed.data
  const supabase = await createClient()

  // Fetch report to know target
  const { data: report } = await supabase.from('reports').select('*').eq('id', reportId).single()
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  let newStatus: string = 'reviewed'

  // Perform action
  if (action === 'delete_content') {
    if (report.target_type === 'story') {
      await supabase.from('hikayeler').delete().eq('id', report.target_id)
    } else if (report.target_type === 'comment') {
      await supabase.from('yorumlar').update({ is_deleted: true, moderation_flag: true }).eq('id', report.target_id)
    } else if (report.target_type === 'user') {
      await supabase.from('profiles').update({
        is_banned: true, ban_reason: banReason || 'Reported content violation',
        banned_at: new Date().toISOString(),
      }).eq('id', report.target_id)
    }
    newStatus = 'resolved'
  } else if (action === 'ban_user') {
    const targetUserId = report.target_type === 'user'
      ? report.target_id
      : (await supabase.from('hikayeler').select('yazar_id').eq('id', report.target_id).single()).data?.yazar_id
    if (targetUserId) {
      await supabase.from('profiles').update({
        is_banned: true, ban_reason: banReason || 'Admin action',
        banned_at: new Date().toISOString(),
      }).eq('id', targetUserId)
    }
    newStatus = 'resolved'
  } else if (action === 'dismiss') {
    newStatus = 'dismissed'
  } else if (action === 'resolve') {
    newStatus = 'resolved'
  }

  // Update report
  await supabase.from('reports').update({
    status:      newStatus,
    reviewed_by: user.id,
    admin_note:  adminNote || null,
    updated_at:  new Date().toISOString(),
  }).eq('id', reportId)

  // Audit log
  await supabase.rpc('log_audit', {
    p_action:     `report_${action}`,
    p_table_name: 'reports',
    p_record_id:  reportId,
    p_metadata:   JSON.stringify({ action, target_type: report.target_type, target_id: report.target_id }),
  })

  return NextResponse.json({ success: true, status: newStatus })
}
