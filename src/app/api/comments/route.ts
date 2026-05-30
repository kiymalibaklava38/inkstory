import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, commentLimiter } from '@/lib/ratelimit'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { stripHtml } from '@/lib/sanitize'

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, commentLimiter)
  if (limited) return limited

  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 }) }

  const { storyId, content, parentId, chapterId, paragraphIndex } = body as any

  // Manuel validasyon — Zod schema bypass sorunlarını önler
  if (!storyId || typeof storyId !== 'string' || !/^[0-9a-f-]{36}$/.test(storyId))
    return NextResponse.json({ error: 'Geçersiz hikaye ID.' }, { status: 400 })

  if (!content || typeof content !== 'string' || content.trim().length === 0)
    return NextResponse.json({ error: 'Yorum boş olamaz.' }, { status: 400 })

  if (content.trim().length > 2000)
    return NextResponse.json({ error: 'Yorum en fazla 2000 karakter olabilir.' }, { status: 400 })

  if (parentId && (typeof parentId !== 'string' || !/^[0-9a-f-]{36}$/.test(parentId)))
    return NextResponse.json({ error: 'Geçersiz parent ID.' }, { status: 400 })

  if (paragraphIndex !== undefined && (typeof paragraphIndex !== 'number' || paragraphIndex < 0))
    return NextResponse.json({ error: 'Geçersiz satır indeksi.' }, { status: 400 })

  const safeContent = stripHtml(content)

  if (!safeContent)
    return NextResponse.json({ error: 'Yorum boş olamaz.' }, { status: 400 })

  const supabase = await createClient()

  // Hikaye yayında mı?
  const { data: story, error: storyErr } = await supabase
    .from('hikayeler')
    .select('id, durum')
    .eq('id', storyId)
    .in('durum', ['yayinda', 'tamamlandi'])
    .single()

  if (storyErr || !story) {
    console.error('[Comments] Story not found:', storyId, storyErr?.message)
    return NextResponse.json({ error: 'Hikaye bulunamadı veya yayında değil.' }, { status: 404 })
  }

  // Parent yorum kontrolü
  if (parentId) {
    const { data: parent } = await supabase
      .from('yorumlar')
      .select('id')
      .eq('id', parentId)
      .eq('hikaye_id', storyId)
      .single()
    if (!parent)
      return NextResponse.json({ error: 'Üst yorum bulunamadı.' }, { status: 404 })
  }

  // Insert
  const { data: inserted, error: insertErr } = await supabase
    .from('yorumlar')
    .insert({
      hikaye_id:       storyId,
      bolum_id:        chapterId ?? null,
      yazar_id:        user.id,
      icerik:          safeContent,
      ust_yorum_id:    parentId ?? null,
      paragraph_index: paragraphIndex !== undefined ? paragraphIndex : null,
    })
    .select('id, icerik, created_at, yazar_id, ust_yorum_id, paragraph_index')
    .single()

  if (insertErr) {
    console.error('[Comments] Insert error:', insertErr.message, insertErr.code, insertErr.details)
    return NextResponse.json({ error: 'Yorum gönderilemedi: ' + insertErr.message }, { status: 500 })
  }

  // Profili ayrı çek
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

  if (error) {
    console.error('[Comments] Delete error:', error.message)
    return NextResponse.json({ error: 'Silinemedi.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
