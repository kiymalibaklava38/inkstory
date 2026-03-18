import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { checkRateLimit, apiLimiter } from '@/lib/ratelimit'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ModerateCommentSchema = z.object({
  commentId: z.string().uuid(),
  action:    z.enum(['delete', 'flag', 'unflag']),
})

export async function GET(req: NextRequest) {
  const limited = await checkRateLimit(req, apiLimiter)
  if (limited) return limited

  const { error } = await requireAdmin()
  if (error) return error

  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const page     = parseInt(searchParams.get('page') || '1')
  const flagged  = searchParams.get('flagged') === 'true'
  const limit    = 30
  const offset   = (page - 1) * limit

  let query = supabase
    .from('yorumlar')
    .select(`
      id, icerik, is_deleted, moderation_flag, created_at, yazar_id, hikaye_id,
      profiles(username, display_name, avatar_url),
      hikayeler(baslik, slug)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (flagged) query = query.eq('moderation_flag', true)

  const { data, count, error: dbErr } = await query
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ comments: data, total: count, page, limit })
}

export async function PATCH(req: NextRequest) {
  const limited = await checkRateLimit(req, apiLimiter)
  if (limited) return limited

  const { user, error } = await requireAdmin()
  if (error) return error

  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = ModerateCommentSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 })

  const { commentId, action } = parsed.data
  const supabase = await createClient()

  const updates: Record<string, any> = {}
  switch (action) {
    case 'delete':  updates.is_deleted = true; updates.moderation_flag = true; break
    case 'flag':    updates.moderation_flag = true;  break
    case 'unflag':  updates.moderation_flag = false; break
  }

  const { error: dbErr } = await supabase.from('yorumlar').update(updates).eq('id', commentId)
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  await supabase.rpc('log_audit', {
    p_action: `admin_comment_${action}`, p_table_name: 'yorumlar',
    p_record_id: commentId, p_metadata: JSON.stringify({ action }),
  })

  return NextResponse.json({ success: true })
}
