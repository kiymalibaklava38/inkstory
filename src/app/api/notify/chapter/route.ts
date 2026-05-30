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

    const userIds = aboneler
      .map(a => a.user_id)
      .filter(id => id !== user.id)

    if (userIds.length === 0) {
      return NextResponse.json({ sent: 0, reason: 'no_other_subscribers' })
    }

    // 1. Batch fetch profiles with email_new_chapter !== false in one query!
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('id, display_name, username, email_new_chapter')
      .in('id', userIds)

    if (profileErr) {
      console.error('[Email] Batch profiles error:', profileErr.message)
      return NextResponse.json({ error: 'Profiles query failed' }, { status: 500 })
    }

    // Filter profiles who want emails
    const activeProfiles = (profiles || []).filter(p => p.email_new_chapter !== false)
    if (activeProfiles.length === 0) {
      return NextResponse.json({ sent: 0, reason: 'no_active_subscribers' })
    }

    const activeUserIds = activeProfiles.map(p => p.id)

    // 2. Batch fetch email logs for new_chapter type & bolumId to prevent duplicate sends!
    const { data: sentLogs, error: logErr } = await supabase
      .from('email_logs')
      .select('user_id')
      .in('user_id', activeUserIds)
      .eq('type', 'new_chapter')
      .eq('ref_id', bolumId)

    if (logErr) {
      console.error('[Email] Batch email logs error:', logErr.message)
    }

    const alreadySentSet = new Set((sentLogs || []).map(l => l.user_id))

    // Filter profiles to those who haven't received it yet
    const profilesToSend = activeProfiles.filter(p => !alreadySentSet.has(p.id))
    if (profilesToSend.length === 0) {
      return NextResponse.json({ sent: 0, reason: 'all_already_sent' })
    }

    // Concurrency control: batch calls in chunks of 10 users to be polite to the APIs
    const CHUNK_SIZE = 10
    let sent = 0

    for (let i = 0; i < profilesToSend.length; i += CHUNK_SIZE) {
      const chunk = profilesToSend.slice(i, i + CHUNK_SIZE)

      await Promise.all(
        chunk.map(async (profile) => {
          try {
            // Get user's email via Auth Admin
            const { data: authData, error: authErr } = await admin.auth.admin.getUserById(profile.id)
            if (authErr || !authData?.user?.email) {
              console.error(`[Email] Failed to fetch email for user ${profile.id}:`, authErr?.message)
              return
            }

            const email = authData.user.email

            // Send email
            const result = await sendNewChapterEmail({
              toEmail:      email,
              toName:       profile.display_name || profile.username || 'Okuyucu',
              authorName,
              storyTitle:   hikaye.baslik,
              storySlug:    hikaye.slug,
              chapterTitle: bolumBaslik,
              chapterNo:    bolumNo,
            })

            if (result.error) {
              console.error(`[Email] Chapter resend error for user ${profile.id}:`, result.error)
              return
            }

            // Save to email logs
            await supabase.from('email_logs').insert({
              user_id: profile.id,
              type:    'new_chapter',
              ref_id:  bolumId,
            })

            console.log(`[Email] Chapter notification sent to ${email}`)
            sent++
          } catch (innerErr: any) {
            console.error(`[Email] Error sending to user ${profile.id}:`, innerErr?.message)
          }
        })
      )
    }

    return NextResponse.json({ sent })
  } catch (e: any) {
    console.error('[Email] Chapter notification unexpected error:', e?.message)
    return NextResponse.json({ sent: 0, error: e?.message }, { status: 500 })
  }
}
