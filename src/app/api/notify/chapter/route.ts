import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { sendNewChapterEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const { hikayeId, bolumId, bolumNo, bolumBaslik } = await req.json()
  if (!hikayeId || !bolumId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const supabase = await createClient()

  // Hikayenin sahibi bu kullanıcı mı?
  const { data: hikaye } = await supabase
    .from('hikayeler')
    .select('id, baslik, slug, yazar_id, profiles(display_name, username)')
    .eq('id', hikayeId)
    .eq('yazar_id', user.id)
    .single()

  if (!hikaye) return NextResponse.json({ error: 'Story not found' }, { status: 404 })

  // Bu hikayeye abone olan kullanıcıları çek
  const { data: aboneler } = await supabase
    .from('hikaye_abonelikleri')
    .select('user_id, profiles(email, display_name, username, email_new_chapter)')
    .eq('hikaye_id', hikayeId)

  if (!aboneler || aboneler.length === 0) return NextResponse.json({ sent: 0 })

  const authorName = (hikaye.profiles as any)?.display_name || (hikaye.profiles as any)?.username

  let sent = 0
  for (const abone of aboneler) {
    const profile = abone.profiles as any
    if (!profile?.email || profile?.email_new_chapter === false) continue
    if (abone.user_id === user.id) continue // Yazara kendine mail atma

    // Spam kontrolü: son 1 saatte bu hikaye için mail gönderilmiş mi?
    const { count } = await supabase
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', abone.user_id)
      .eq('type', 'new_chapter')
      .eq('ref_id', bolumId)

    if ((count || 0) > 0) continue

    try {
      await sendNewChapterEmail({
        toEmail:      profile.email,
        toName:       profile.display_name || profile.username,
        authorName,
        storyTitle:   hikaye.baslik,
        storySlug:    hikaye.slug,
        chapterTitle: bolumBaslik,
        chapterNo:    bolumNo,
      })

      await supabase.from('email_logs').insert({
        user_id: abone.user_id,
        type:    'new_chapter',
        ref_id:  bolumId,
      })
      sent++
    } catch (e) {
      console.error('[Email] Failed to send chapter notification:', e)
    }
  }

  return NextResponse.json({ sent })
}
