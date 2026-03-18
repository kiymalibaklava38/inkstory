import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { createHash } from 'crypto'

const Schema = z.object({
  hikaye_id:  z.string().uuid(),
  event_type: z.enum(['read', 'like', 'comment', 'bookmark']),
})

// IP rate limiter — engagement başına max 60/dakika
const ipLog = new Map<string, number[]>()

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + process.env.NEXT_PUBLIC_SUPABASE_URL).digest('hex').slice(0, 16)
}

export async function POST(req: NextRequest) {
  // Basic IP rate limit
  const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '0.0.0.0'
  const now   = Date.now()
  const hits  = (ipLog.get(rawIp) || []).filter(t => now - t < 60_000)
  if (hits.length >= 60) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  ipLog.set(rawIp, [...hits, now])

  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  const { hikaye_id, event_type } = parsed.data
  const supabase = await createClient()

  // Kullanıcı giriş yapmış mı?
  const { data: { user } } = await supabase.auth.getUser()
  const ipHash = hashIp(rawIp)

  // Anti-spam: aynı sinyal son 1 saatte gönderilmiş mi?
  const { data: canLog } = await supabase.rpc('can_log_engagement', {
    p_hikaye_id:  hikaye_id,
    p_user_id:    user?.id || null,
    p_ip_hash:    ipHash,
    p_event_type: event_type,
  })

  if (!canLog) {
    // Sessizce başarılı döndür — spam tespitini açık etme
    return NextResponse.json({ success: true, skipped: true })
  }

  // Hikayenin gerçekten yayında olduğunu doğrula
  const { data: story } = await supabase
    .from('hikayeler')
    .select('id')
    .eq('id', hikaye_id)
    .in('durum', ['yayinda', 'tamamlandi'])
    .single()

  if (!story) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 })
  }

  // Log'u kaydet
  const { error } = await supabase
    .from('engagement_logs')
    .insert({
      hikaye_id,
      user_id:    user?.id || null,
      ip_hash:    ipHash,
      event_type,
    })

  if (error) {
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
