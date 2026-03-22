import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, commentLimiter } from '@/lib/ratelimit'
import { requireAuth } from '@/lib/auth-helpers'
import { parseOrError, CommentSchema } from '@/lib/validation'
import { sanitizeHtml, escapeHtml } from '@/lib/sanitize'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // Rate limit
  const limited = await checkRateLimit(req, commentLimiter)
  if (limited) return limited

  // Auth - 'user' kontrolünü ekledik
  const { user, error: authError } = await requireAuth()
  if (authError || !user) return authError || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Parse & validate
  let body: unknown
  try { 
    body = await req.json() 
  } catch { 
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }) 
  }

  // Veri doğrulama ve null kontrolü
  const { data, error: validErr } = parseOrError(CommentSchema, body)
  if (validErr || !data) {
    return NextResponse.json({ error: validErr || 'Veri bulunamadı' }, { status: 400 })
  }

  // DİKKAT: Burada sadece BİR KEZ tanımlama yapıyoruz
  const safeContent = escapeHtml(data.content)

  const supabase = await createClient()

  // Hikaye kontrolü
  const { data: story } = await supabase
    .from('hikayeler')
    .select('id, durum')
    .eq('id', data.storyId)
    .in('durum', ['yayinda', 'tamamlandi'])
    .single()

  if (!story) {
    return NextResponse.json({ error: 'Story not found.' }, { status: 404 })
  }

  // Yanıt ise üst yorum kontrolü
  if (data.parentId) {
    const { data: parent } = await supabase
      .from('yorumlar')
      .select('id')
      .eq('id', data.parentId)
      .eq('hikaye_id', data.storyId)
      .single()

    if (!parent) {
      return NextResponse.json({ error: 'Parent comment not found.' }, { status: 404 })
    }
  }

  // Veritabanına ekleme
  const { data: comment, error } = await supabase
    .from('yorumlar')
    .insert({
      hikaye_id:    data.storyId,
      bolum_id:     data.chapterId ?? null,
      yazar_id:     user.id, // user artık kesinlikle var
      icerik:       safeContent,
      ust_yorum_id: data.parentId ?? null,
    })
    .select('id, icerik, created_at, profiles(username, display_name, avatar_url, is_verified, verification_badge)')
    .single()

  if (error) {
    console.error('[Comments] Insert error:', error.message)
    return NextResponse.json({ error: 'Failed to post comment.' }, { status: 500 })
  }

  return NextResponse.json({ comment }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const { searchParams } = new URL(req.url)
  const commentId = searchParams.get('id')

  if (!commentId || !/^[0-9a-f-]{36}$/.test(commentId)) {
    return NextResponse.json({ error: 'Valid comment ID is required.' }, { status: 400 })
  }

  const supabase = await createClient()

  // Only allow deleting own comments (RLS also enforces this)
  const { error } = await supabase
    .from('yorumlar')
    .delete()
    .eq('id', commentId)
    .eq('yazar_id', user.id)   // double check ownership in query

  if (error) {
    return NextResponse.json({ error: 'Failed to delete comment.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
