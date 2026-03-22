import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { checkRateLimit, apiLimiter } from '@/lib/ratelimit'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const BanSchema = z.object({
  userId:  z.string().uuid(),
  action:  z.enum(['ban', 'unban', 'shadow_ban', 'make_admin', 'remove_admin']),
  reason:  z.string().max(500).optional(),
})

export async function GET(req: NextRequest) {
  const limited = await checkRateLimit(req, apiLimiter)
  if (limited) return limited

  const { error } = await requireAdmin()
  if (error) return error

  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const page   = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const search = searchParams.get('search') || ''
  const filter = searchParams.get('filter') || 'all'
  const limit  = 30
  const offset = (page - 1) * limit

  let query = supabase
    .from('profiles')
    .select('id,username,display_name,avatar_url,is_admin,is_banned,ban_reason,banned_at,shadow_banned,is_verified,verification_badge,created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
  if (filter === 'banned')        query = query.eq('is_banned', true)
  if (filter === 'shadow_banned') query = query.eq('shadow_banned', true)
  if (filter === 'admins')        query = query.eq('is_admin', true)

  const { data, count, error: dbErr } = await query
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ users: data || [], total: count || 0, page, limit })
}

export async function PATCH(req: NextRequest) {
  const limited = await checkRateLimit(req, apiLimiter)
  if (limited) return limited

  const { user: adminUser, error } = await requireAdmin()
  if (error) return error

  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = BanSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 })

  const { userId, action, reason } = parsed.data
  const supabase = await createClient()

  if (userId === adminUser.id) {
    return NextResponse.json({ error: 'Kendi hesabınıza bu işlemi yapamazsınız.' }, { status: 400 })
  }

  const updates: Record<string, any> = {}

  switch (action) {
    case 'ban':
      updates.is_banned     = true
      updates.ban_reason    = reason || 'Admin kararı'
      updates.banned_at     = new Date().toISOString()
      updates.shadow_banned = false
      break
    case 'unban':
      updates.is_banned     = false
      updates.ban_reason    = null
      updates.banned_at     = null
      updates.shadow_banned = false
      break
    case 'shadow_ban':
      updates.shadow_banned = true
      updates.ban_reason    = reason || 'Shadow ban'
      break
    case 'make_admin':
      updates.is_admin = true
      break
    case 'remove_admin':
      updates.is_admin = false
      break
  }

  const { error: dbErr } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (dbErr) {
    console.error('[Admin Users] Update error:', dbErr)
    return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }

  // Audit log — hata olursa işlemi bloklama
  try {
    await supabase.rpc('log_audit', {
      p_action:     `admin_user_${action}`,
      p_table_name: 'profiles',
      p_record_id:  userId,
      p_metadata:   JSON.stringify({ action, reason }),
    })
  } catch (e) {
    console.warn('[Admin Users] Audit log failed (non-critical):', e)
  }

  return NextResponse.json({ success: true })
}
