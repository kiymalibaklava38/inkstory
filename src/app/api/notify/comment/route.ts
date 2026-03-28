import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendNewCommentEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const commentId = body?.commentId
    if (!commentId) return NextResponse.json({ error: 'Missing commentId' }, { status: 400 })

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Email] SUPABASE_SERVICE_ROLE_KEY is not set')
      return NextResponse.json({ sent: false, reason: 'no_service_key' })
    }
    if (!process.env.RESEND_API_KEY) {
      console.error('[Email] RESEND_API_KEY is not set')
      return NextResponse.json({ sent: false, reason: 'no_resend_key' })
    }

    const supabase = await createClient()

    const { data: comment } = await supabase
      .from('yorumlar')
      .select('id, icerik, yazar_id, hikayeler(id, baslik, slug, yazar_id, profiles(display_name, username, email_new_comment))')
      .eq('id', commentId).single()

    if (!comment) return NextResponse.json({ sent: false, reason: 'no_comment' })

    const hikaye  = comment.hikayeler as any
    const yazarPr = hikaye?.profiles as any

    if (comment.yazar_id === hikaye?.yazar_id)
      return NextResponse.json({ sent: false, reason: 'own_comment' })
    if (yazarPr?.email_new_comment === false)
      return NextResponse.json({ sent: false, reason: 'disabled' })

    // Spam kontrolü
    const { count } = await supabase
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', hikaye.yazar_id)
      .eq('type', 'new_comment')
      .eq('ref_id', commentId)
    if ((count || 0) > 0)
      return NextResponse.json({ sent: false, reason: 'already_sent' })

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    )

    const { data: authData, error: authErr } = await admin.auth.admin.getUserById(hikaye.yazar_id)
    if (authErr) {
      console.error('[Email] getUserById error:', authErr)
      return NextResponse.json({ sent: false, reason: 'auth_error' })
    }
    const email = authData?.user?.email
    if (!email) return NextResponse.json({ sent: false, reason: 'no_email' })

    const { data: commenter } = await supabase
      .from('profiles').select('display_name, username').eq('id', comment.yazar_id).single()

    const result = await sendNewCommentEmail({
      toEmail:        email,
      toName:         yazarPr?.display_name || yazarPr?.username || 'Yazar',
      commenterName:  commenter?.display_name || commenter?.username || 'Biri',
      storyTitle:     hikaye.baslik,
      storySlug:      hikaye.slug,
      commentSnippet: comment.icerik.slice(0, 100) + (comment.icerik.length > 100 ? '…' : ''),
    })

    if (result.error) {
      console.error('[Email] Comment resend error:', result.error)
      return NextResponse.json({ sent: false, reason: 'resend_error', error: result.error })
    }

    await supabase.from('email_logs').insert({
      user_id: hikaye.yazar_id, type: 'new_comment', ref_id: commentId,
    })

    console.log(`[Email] Comment notification sent to ${email}`)
    return NextResponse.json({ sent: true })

  } catch (e: any) {
    console.error('[Email] Comment notification unexpected error:', e?.message)
    return NextResponse.json({ sent: false, reason: 'exception', error: e?.message }, { status: 500 })
  }
}
