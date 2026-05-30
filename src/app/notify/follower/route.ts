import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendNewFollowerEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const { targetUserId } = await req.json()
  if (!targetUserId) return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 })

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[Email] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ sent: false, reason: 'no_service_role_key' })
  }

  const supabase = await createClient()

  // Hedef kullanıcı ve bildirim tercihi (email hariç, çünkü email profiles tablosunda yok)
  const { data: target } = await supabase
    .from('profiles')
    .select('display_name, username, email_new_follower')
    .eq('id', targetUserId)
    .single()

  if (!target || target.email_new_follower === false)
    return NextResponse.json({ sent: false, reason: 'user_disabled_or_not_found' })

  // Spam: son 24 saatte bu takip için mail gitti mi?
  const { count } = await supabase
    .from('email_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', targetUserId)
    .eq('type', 'new_follower')
    .eq('ref_id', user.id)
    .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if ((count || 0) > 0) return NextResponse.json({ sent: false, reason: 'spam_protection_24h' })

  // Takip eden kullanıcı bilgisi
  const { data: follower } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', user.id)
    .single()

  if (!follower) return NextResponse.json({ sent: false, reason: 'follower_profile_not_found' })

  // E-postayı secure auth.users katmanından admin yetkisiyle çekiyoruz
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  const { data: authData, error: authErr } = await admin.auth.admin.getUserById(targetUserId)

  if (authErr || !authData?.user?.email) {
    console.error(`[Email] Failed to fetch email for user ${targetUserId}:`, authErr?.message)
    return NextResponse.json({ sent: false, reason: 'email_not_found_in_auth' })
  }

  const targetEmail = authData.user.email

  try {
    await sendNewFollowerEmail({
      toEmail:          targetEmail,
      toName:           target.display_name || target.username,
      followerName:     follower.display_name || follower.username,
      followerUsername: follower.username,
    })

    await supabase.from('email_logs').insert({
      user_id: targetUserId,
      type:    'new_follower',
      ref_id:  user.id,
    })

    return NextResponse.json({ sent: true })
  } catch (e) {
    console.error('[Email] Follower notification failed:', e)
    return NextResponse.json({ sent: false, error: (e as any)?.message })
  }
}
