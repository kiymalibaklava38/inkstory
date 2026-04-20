import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, commentLimiter } from '@/lib/ratelimit'
import { requireAuth } from '@/lib/auth-helpers'
import { parseOrError, CommentSchema } from '@/lib/validation'
import { escapeHtml } from '@/lib/sanitize'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, commentLimiter)
  if (limited) return limited

  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 }) }

  const { data, error: validErr } = parseOrError(CommentSchema, body)
  if (validErr || !data) return NextResponse.json({ error: validErr || 'Geçersiz veri.' }, { status: 400 })

  const safeContent = escapeHtml(data.content)
  const supabase    = await createClient()

  // Hikaye yayında mı?
  const { data: story } = await supabase
    .from('hikayeler')
    .select('id, durum')
    .eq('id', data.storyId)
    .in('durum', ['yayinda', 'tamamlandi'])
    .single()

  if (!story) return NextResponse.json({ error: 'Hikaye bulunamadı.' }, { status: 404 })

  // Cevapsa parent kontrolü
  if (data.parentId) {
    const { data: parent } = await supabase
      .from('yorumlar')
      .select('id')
      .eq('id', data.parentId)
      .eq('hikaye_id', data.storyId)
      .single()
    if (!parent) return NextResponse.json({ error: 'Üst yorum bulunamadı.' }, { status: 404 })
  }

  // Insert — select yapmıyoruz, ambiguous FK sorununu tamamen önler
  const { data: inserted, error } = await supabase
    .from('yorumlar')
    .insert({
      hikaye_id:    data.storyId,
      bolum_id:     data.chapterId ?? null,
      yazar_id:     user.id,
      icerik:       safeContent,
      ust_yorum_id: data.parentId ?? null,
    })
    .select('id, icerik, created_at, yazar_id, ust_yorum_id')
    .single()

  if (error) {
    console.error('[Comments] Insert error:', error.message)
    return NextResponse.json({ error: 'Yorum gönderilemedi.' }, { status: 500 })
  }

  // Profili ayrı çek — FK belirsizliği yok
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url, is_verified, verification_badge')
    .eq('id', user.id)
    .single()

  const comment = { ...inserted, profiles: profile }

  // Email bildirimi (non-blocking)
  if (inserted?.id) {
    const host     = req.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    fetch(`${protocol}://${host}/api/notify/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId: inserted.id }),
    }).catch(() => {})
  }

  return NextResponse.json({ comment }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const commentId = new URL(req.url).searchParams.get('id')
  if (!commentId || !/^[0-9a-f-]{36}$/.test(commentId))
    return NextResponse.json({ error: 'Geçerli yorum ID gerekli.' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase
    .from('yorumlar')
    .delete()
    .eq('id', commentId)
    .eq('yazar_id', user.id)

  if (error) return NextResponse.json({ error: 'Silinemedi.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
