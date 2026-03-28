import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { sendNewFollowerEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const { targetUserId } = await req.json()
  if (!targetUserId) return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 })

  const supabase = await createClient()

  // Hedef kullanıcının bildirim tercihi
  const { data: target } = await supabase
    .from('profiles')
    .select('display_name, username, email_new_follower')
    .eq('id', targetUserId)
    .single()

  if (target?.email_new_follower === false) return NextResponse.json({ sent: false })

  // Spam: son 24 saatte bu takip için mail gitti mi?
  const { count } = await supabase
    .from('email_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', targetUserId)
    .eq('type', 'new_follower')
    .eq('ref_id', user.id)
    .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if ((count || 0) > 0) return NextResponse.json({ sent: false })

  // Admin client ile email çek
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: authUser } = await adminClient.auth.admin.getUserById(targetUserId)
  const email = authUser?.user?.email
  if (!email) return NextResponse.json({ sent: false })

  // Takip eden kullanıcı bilgisi
  const { data: follower } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', user.id)
    .single()

  if (!follower) return NextResponse.json({ sent: false })

  try {
    await sendNewFollowerEmail({
      toEmail:          email,
      toName:           target?.display_name || target?.username || 'Yazar',
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
    return NextResponse.json({ sent: false })
  }
}
