import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendNewCommentEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { commentId } = await req.json()
  if (!commentId) return NextResponse.json({ error: 'Missing commentId' }, { status: 400 })

  const supabase = await createClient()

  // Yorumu ve hikayeyi çek
  const { data: comment } = await supabase
    .from('yorumlar')
    .select('id, icerik, yazar_id, hikayeler(id, baslik, slug, yazar_id, profiles(email, display_name, username, email_new_comment))')
    .eq('id', commentId)
    .single()

  if (!comment) return NextResponse.json({ sent: false })

  const hikaye  = comment.hikayeler as any
  const yazarPr = hikaye?.profiles as any

  // Kendi hikayesine yorum yapmışsa bildirim atma
  if (comment.yazar_id === hikaye?.yazar_id) return NextResponse.json({ sent: false })
  if (!yazarPr?.email || yazarPr?.email_new_comment === false) return NextResponse.json({ sent: false })

  // Spam: bu yorum için mail gitti mi?
  const { count } = await supabase
    .from('email_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', hikaye.yazar_id)
    .eq('type', 'new_comment')
    .eq('ref_id', commentId)

  if ((count || 0) > 0) return NextResponse.json({ sent: false })

  // Yorum yapanın adı
  const { data: commenter } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', comment.yazar_id)
    .single()

  try {
    await sendNewCommentEmail({
      toEmail:        yazarPr.email,
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
    return NextResponse.json({ sent: false })
  }
}
