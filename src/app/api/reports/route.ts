import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { checkRateLimit } from '@/lib/ratelimit'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const reportLimiter = { limit: 5, windowSec: 3600, prefix: 'report' } // 5 reports/hour

const ReportSchema = z.object({
  target_type: z.enum(['story', 'comment', 'user']),
  target_id:   z.string().min(1).max(100),
  reason:      z.enum([
    'spam', 'harassment', 'hate_speech', 'sexual_content',
    'violence', 'misinformation', 'copyright', 'other',
  ]),
  details: z.string().max(1000).optional(),
})

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, reportLimiter)
  if (limited) return limited

  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = ReportSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 })

  const { target_type, target_id, reason, details } = parsed.data
  const supabase = await createClient()

  // Prevent duplicate reports from same user on same target
  const { data: existing } = await supabase
    .from('reports')
    .select('id')
    .eq('reporter_id', user.id)
    .eq('target_type', target_type)
    .eq('target_id', target_id)
    .eq('status', 'pending')
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'You have already reported this content.' },
      { status: 409 }
    )
  }

  const { error: dbErr } = await supabase.from('reports').insert({
    reporter_id: user.id,
    target_type,
    target_id,
    reason,
    details: details || null,
    status: 'pending',
  })

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ success: true, message: 'Report submitted. Thank you.' }, { status: 201 })
}
