import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendNewCommentEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { commentId } = await req.json()
  if (!commentId) return NextResponse.json({ error: 'Missing commentId' }, { status: 400 })

  const supabase = await createClient()

  // Yorumu çek
  const { data: comment } = await supabase
    .from('yorumlar')
    .select('id, icerik, yazar_id, hikayeler(id, baslik, slug, yazar_id, profiles(display_name, username, email_new_comment))')
    .eq('id', commentId)
    .single()

  if (!comment) return NextResponse.json({ sent: false })

  const hikaye  = comment.hikayeler as any
  const yazarPr = hikaye?.profiles as any

  // Kendi hikayesine yorum yapmışsa bildirim atma
  if (comment.yazar_id === hikaye?.yazar_id) return NextResponse.json({ sent: false })
  if (yazarPr?.email_new_comment === false) return NextResponse.json({ sent: false })

  // Spam kontrolü
  const { count } = await supabase
    .from('email_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', hikaye.yazar_id)
    .eq('type', 'new_comment')
    .eq('ref_id', commentId)

  if ((count || 0) > 0) return NextResponse.json({ sent: false })

  // Admin client ile yazar emailini çek
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: authUser } = await adminClient.auth.admin.getUserById(hikaye.yazar_id)
  const email = authUser?.user?.email
  if (!email) return NextResponse.json({ sent: false })

  // Yorum yapanın adı
  const { data: commenter } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', comment.yazar_id)
    .single()

  try {
    await sendNewCommentEmail({
      toEmail:        email,
      toName:         yazarPr?.display_name || yazarPr?.username || 'Yazar',
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
