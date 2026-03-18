import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { checkRateLimit, apiLimiter } from '@/lib/ratelimit'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ModerateStorySchema = z.object({
  storyId: z.string().uuid(),
  action:  z.enum(['feature','unfeature','lock','unlock','unpublish','delete','flag','unflag']),
})

export async function GET(req: NextRequest) {
  const limited = await checkRateLimit(req, apiLimiter)
  if (limited) return limited

  const { error } = await requireAdmin()
  if (error) return error

  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const page   = parseInt(searchParams.get('page') || '1')
  const search = searchParams.get('search') || ''
  const filter = searchParams.get('filter') || 'all'
  const limit  = 30
  const offset = (page - 1) * limit

  let query = supabase
    .from('hikayeler')
    .select(`
      id, baslik, slug, durum, goruntuleme, created_at, yazar_id,
      is_featured, is_locked, moderation_status,
      profiles(username, display_name, avatar_url),
      kategoriler(ad, ikon)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) query = query.ilike('baslik', `%${search}%`)
  if (filter === 'featured')  query = query.eq('is_featured', true)
  if (filter === 'locked')    query = query.eq('is_locked', true)
  if (filter === 'flagged')   query = query.eq('moderation_status', 'flagged')

  const { data, count, error: dbErr } = await query
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ stories: data, total: count, page, limit })
}

export async function PATCH(req: NextRequest) {
  const limited = await checkRateLimit(req, apiLimiter)
  if (limited) return limited

  const { user, error } = await requireAdmin()
  if (error) return error

  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = ModerateStorySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 })

  const { storyId, action } = parsed.data
  const supabase = await createClient()

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }

  switch (action) {
    case 'feature':   updates.is_featured = true;  break
    case 'unfeature': updates.is_featured = false; break
    case 'lock':      updates.is_locked   = true;  break
    case 'unlock':    updates.is_locked   = false; break
    case 'unpublish': updates.durum = 'taslak';    break
    case 'flag':      updates.moderation_status = 'flagged';  break
    case 'unflag':    updates.moderation_status = 'ok';       break
    case 'delete':
      await supabase.from('hikayeler').delete().eq('id', storyId)
      await supabase.rpc('log_audit', { p_action: 'admin_delete_story', p_table_name: 'hikayeler', p_record_id: storyId, p_metadata: null })
      return NextResponse.json({ success: true, deleted: true })
  }

  const { error: dbErr } = await supabase.from('hikayeler').update(updates).eq('id', storyId)
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  await supabase.rpc('log_audit', {
    p_action:     `admin_story_${action}`,
    p_table_name: 'hikayeler',
    p_record_id:  storyId,
    p_metadata:   JSON.stringify({ action }),
  })

  return NextResponse.json({ success: true })
}
