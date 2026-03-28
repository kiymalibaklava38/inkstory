import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendNewFollowerEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth()
    if (authError) return authError

    const body = await req.json()
    const targetUserId = body?.targetUserId
    if (!targetUserId) return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 })

    // SERVICE_ROLE_KEY kontrolü
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Email] SUPABASE_SERVICE_ROLE_KEY is not set')
      return NextResponse.json({ sent: false, reason: 'no_service_key' })
    }
    if (!process.env.RESEND_API_KEY) {
      console.error('[Email] RESEND_API_KEY is not set')
      return NextResponse.json({ sent: false, reason: 'no_resend_key' })
    }

    const supabase = await createClient()

    // Bildirim tercihi
    const { data: target } = await supabase
      .from('profiles')
      .select('display_name, username, email_new_follower')
      .eq('id', targetUserId)
      .single()

    if (target?.email_new_follower === false)
      return NextResponse.json({ sent: false, reason: 'disabled' })

    // Spam kontrolü
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', targetUserId)
      .eq('type', 'new_follower')
      .eq('ref_id', user.id)
      .gte('sent_at', since)

    if ((count || 0) > 0)
      return NextResponse.json({ sent: false, reason: 'already_sent' })

    // Admin ile email çek
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    )
    const { data: authData, error: authErr } = await admin.auth.admin.getUserById(targetUserId)
    if (authErr) {
      console.error('[Email] getUserById error:', authErr)
      return NextResponse.json({ sent: false, reason: 'auth_error' })
    }
    const email = authData?.user?.email
    if (!email) return NextResponse.json({ sent: false, reason: 'no_email' })

    // Takip eden bilgisi
    const { data: follower } = await supabase
      .from('profiles').select('display_name, username').eq('id', user.id).single()
    if (!follower) return NextResponse.json({ sent: false, reason: 'no_follower' })

    const result = await sendNewFollowerEmail({
      toEmail:          email,
      toName:           target?.display_name || target?.username || 'Yazar',
      followerName:     follower.display_name || follower.username,
      followerUsername: follower.username,
    })

    if (result.error) {
      console.error('[Email] Resend error:', result.error)
      return NextResponse.json({ sent: false, reason: 'resend_error', error: result.error })
    }

    await supabase.from('email_logs').insert({
      user_id: targetUserId,
      type:    'new_follower',
      ref_id:  user.id,
    })

    console.log(`[Email] Follower notification sent to ${email}`)
    return NextResponse.json({ sent: true })

  } catch (e: any) {
    console.error('[Email] Follower notification unexpected error:', e?.message)
    return NextResponse.json({ sent: false, reason: 'exception', error: e?.message }, { status: 500 })
  }
}
