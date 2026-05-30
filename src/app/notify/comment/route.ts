import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendNewCommentEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { commentId } = await req.json()
  if (!commentId) return NextResponse.json({ error: 'Missing commentId' }, { status: 400 })

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[Email] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ sent: false, reason: 'no_service_role_key' })
  }

  const supabase = await createClient()

  // Yorumu ve hikayeyi çek (email hariç, çünkü email profiles tablosunda yok)
  const { data: comment } = await supabase
    .from('yorumlar')
    .select('id, icerik, yazar_id, hikayeler(id, baslik, slug, yazar_id, profiles(display_name, username, email_new_comment))')
    .eq('id', commentId)
    .single()

  if (!comment) return NextResponse.json({ sent: false, reason: 'comment_not_found' })

  const hikaye  = comment.hikayeler as any
  const yazarPr = hikaye?.profiles as any

  // Kendi hikayesine yorum yapmışsa bildirim atma
  if (comment.yazar_id === hikaye?.yazar_id) return NextResponse.json({ sent: false, reason: 'own_story_comment' })
  if (!yazarPr || yazarPr?.email_new_comment === false) return NextResponse.json({ sent: false, reason: 'user_disabled_notifications' })

  // Spam: bu yorum için mail gitti mi?
  const { count } = await supabase
    .from('email_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', hikaye.yazar_id)
    .eq('type', 'new_comment')
    .eq('ref_id', commentId)

  if ((count || 0) > 0) return NextResponse.json({ sent: false, reason: 'spam_protection_duplicate' })

  // Yorum yapanın adı
  const { data: commenter } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', comment.yazar_id)
    .single()

  // E-postayı secure auth.users katmanından admin yetkisiyle çekiyoruz
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  const { data: authData, error: authErr } = await admin.auth.admin.getUserById(hikaye.yazar_id)

  if (authErr || !authData?.user?.email) {
    console.error(`[Email] Failed to fetch email for user ${hikaye.yazar_id}:`, authErr?.message)
    return NextResponse.json({ sent: false, reason: 'email_not_found_in_auth' })
  }

  const targetEmail = authData.user.email

  try {
    await sendNewCommentEmail({
      toEmail:        targetEmail,
      toName:         yazarPr.display_name || yazarPr.username,
      commenterName:  commenter?.display_name || commenter?.username || 'Biri',
      storyTitle:     hikaye.baslik,
      storySlug:      hikaye.slug,
      commentSnippet: comment.icerik.slice(0, 100) + (comment.icerik.length > 100 ? '…' : ''),
    })

    await supabase.from('email_logs').insert({
      user_id: hikaye.yazar_id,
      type:    'new_comment',
      ref_id:  commentId,
    })

    return NextResponse.json({ sent: true })
  } catch (e) {
    console.error('[Email] Comment notification failed:', e)
    return NextResponse.json({ sent: false, error: (e as any)?.message })
  }
}
