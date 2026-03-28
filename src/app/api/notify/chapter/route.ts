import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendNewChapterEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth()
    if (authError) return authError

    const body = await req.json()
    const { hikayeId, bolumId, bolumNo, bolumBaslik } = body
    if (!hikayeId || !bolumId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Email] SUPABASE_SERVICE_ROLE_KEY is not set')
      return NextResponse.json({ sent: 0, reason: 'no_service_key' })
    }
    if (!process.env.RESEND_API_KEY) {
      console.error('[Email] RESEND_API_KEY is not set')
      return NextResponse.json({ sent: 0, reason: 'no_resend_key' })
    }

    const supabase = await createClient()

    const { data: hikaye } = await supabase
      .from('hikayeler')
      .select('id, baslik, slug, yazar_id, profiles(display_name, username)')
      .eq('id', hikayeId).eq('yazar_id', user.id).single()

    if (!hikaye) return NextResponse.json({ error: 'Story not found' }, { status: 404 })

    const { data: aboneler } = await supabase
      .from('hikaye_abonelikleri')
      .select('user_id')
      .eq('hikaye_id', hikayeId)

    if (!aboneler || aboneler.length === 0)
      return NextResponse.json({ sent: 0, reason: 'no_subscribers' })

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    )

    const authorName = (hikaye.profiles as any)?.display_name || (hikaye.profiles as any)?.username
    let sent = 0

    for (const abone of aboneler) {
      if (abone.user_id === user.id) continue

      const { count } = await supabase
        .from('email_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', abone.user_id)
        .eq('type', 'new_chapter')
        .eq('ref_id', bolumId)
      if ((count || 0) > 0) continue

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username, email_new_chapter')
        .eq('id', abone.user_id).single()

      if (profile?.email_new_chapter === false) continue

      const { data: authData } = await admin.auth.admin.getUserById(abone.user_id)
      const email = authData?.user?.email
      if (!email) continue

      const result = await sendNewChapterEmail({
        toEmail:      email,
        toName:       profile?.display_name || profile?.username || 'Okuyucu',
        authorName,
        storyTitle:   hikaye.baslik,
        storySlug:    hikaye.slug,
        chapterTitle: bolumBaslik,
        chapterNo:    bolumNo,
      })

      if (result.error) {
        console.error('[Email] Chapter resend error:', result.error)
        continue
      }

      await supabase.from('email_logs').insert({
        user_id: abone.user_id, type: 'new_chapter', ref_id: bolumId,
      })
      console.log(`[Email] Chapter notification sent to ${email}`)
      sent++
    }

    return NextResponse.json({ sent })
  } catch (e: any) {
    console.error('[Email] Chapter notification unexpected error:', e?.message)
    return NextResponse.json({ sent: 0, error: e?.message }, { status: 500 })
  }
}
