'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n'
import { Bell, Heart, MessageCircle, UserPlus, Loader2, Zap } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { tr as dateFnsTr, enUS } from 'date-fns/locale'

type NotifType = 'like' | 'comment' | 'follow'

type Notif = {
  id: string; type: NotifType
  text: string; link: string; time: string
  avatar?: string; username?: string; isNew?: boolean
}

export default function NotificationsPage() {
  const [notifs, setNotifs]   = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const [realtimeActive, setRealtimeActive] = useState(false)
  const router   = useRouter()
  const supabase = createClient()
  const { t, lang } = useLang()

  const locale = lang === 'tr' ? dateFnsTr : enUS

  const buildLikeText = (displayName: string, storyTitle: string) =>
    lang === 'tr'
      ? `<strong>${displayName}</strong> hikayeni beğendi: <em>${storyTitle}</em>`
      : `<strong>${displayName}</strong> liked your story <em>${storyTitle}</em>`

  const buildCommentText = (displayName: string, snippet: string) =>
    lang === 'tr'
      ? `<strong>${displayName}</strong> Yorum Yaptı: "${snippet}"`
      : `<strong>${displayName}</strong> Commented: "${snippet}"`

  const buildFollowText = (displayName: string) =>
    lang === 'tr'
      ? `<strong>${displayName}</strong> Seni takip etmeye başladı`
      : `<strong>${displayName}</strong> Started following you`

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      await loadNotifs(user.id)

      const channel = supabase.channel('notifications-page')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'yorumlar' }, async (payload) => {
          // Ignore own comments
          if (payload.new.yazar_id === user.id) return

          const { data: c } = await supabase
            .from('yorumlar')
            .select('icerik, profiles(username,display_name,avatar_url), hikayeler(baslik,slug,yazar_id)')
            .eq('id', payload.new.id).single()

          if (!c) return
          const d = c as any

          // Only show notification if current user owns the story
          if (d.hikayeler?.yazar_id !== user.id) return

          const name = d.profiles?.display_name || d.profiles?.username
          const snippet = d.icerik.slice(0, 60) + (d.icerik.length > 60 ? '…' : '')
          setNotifs(prev => [{
            id: payload.new.id, type: 'comment',
            text: buildCommentText(name, snippet),
            link: `/story/${d.hikayeler?.slug}`,
            time: payload.new.created_at,
            avatar: d.profiles?.avatar_url, username: d.profiles?.username, isNew: true,
          }, ...prev])
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'begeniler' }, async (payload) => {
          const { data: l } = await supabase
            .from('begeniler')
            .select('profiles(username,display_name,avatar_url), hikayeler(baslik,slug)')
            .eq('id', payload.new.id).single()
          if (l && (l as any).hikayeler) {
            const d = l as any
            const name = d.profiles?.display_name || d.profiles?.username
            setNotifs(prev => [{
              id: payload.new.id, type: 'like',
              text: buildLikeText(name, d.hikayeler?.baslik),
              link: `/story/${d.hikayeler?.slug}`,
              time: payload.new.created_at,
              avatar: d.profiles?.avatar_url, username: d.profiles?.username, isNew: true,
            }, ...prev])
          }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'takip' }, async (payload) => {
          const { data: f } = await supabase
            .from('takip')
            .select('profiles:takipci_id(username,display_name,avatar_url)')
            .eq('id', payload.new.id).single()
          if (f) {
            const d = f as any
            const name = d.profiles?.display_name || d.profiles?.username
            setNotifs(prev => [{
              id: payload.new.id, type: 'follow',
              text: buildFollowText(name),
              link: `/profile/${d.profiles?.username}`,
              time: payload.new.created_at,
              avatar: d.profiles?.avatar_url, username: d.profiles?.username, isNew: true,
            }, ...prev])
          }
        })
        .subscribe(status => setRealtimeActive(status === 'SUBSCRIBED'))

      return () => { supabase.removeChannel(channel) }
    }
    init()
  }, [lang]) // re-run when lang changes so text updates

  const loadNotifs = async (userId: string) => {
    setLoading(true)

    const [{ data: likes }, { data: comments }, { data: follows }] = await Promise.all([
      supabase.from('begeniler')
        .select('id,created_at,profiles(username,display_name,avatar_url),hikayeler(baslik,slug,yazar_id)')
        .order('created_at', { ascending: false }).limit(20),
      supabase.from('yorumlar')
        .select('id,icerik,created_at,profiles(username,display_name,avatar_url),hikayeler!inner(baslik,slug,yazar_id)')
        .neq('yazar_id', userId)
        .eq('hikayeler.yazar_id', userId)
        .order('created_at', { ascending: false }).limit(20),
      supabase.from('takip')
        .select('id,created_at,profiles:takipci_id(username,display_name,avatar_url)')
        .eq('takip_edilen_id', userId).order('created_at', { ascending: false }).limit(20),
    ])

    const all: Notif[] = [
      ...(likes || []).filter((l: any) => l.hikayeler?.yazar_id === userId && l.hikayeler).map((l: any) => ({
        id: l.id, type: 'like' as const,
        text: buildLikeText(l.profiles?.display_name || l.profiles?.username, l.hikayeler?.baslik),
        link: `/story/${l.hikayeler?.slug}`,
        time: l.created_at, avatar: l.profiles?.avatar_url, username: l.profiles?.username,
      })),
      ...(comments || []).filter((c: any) => c.hikayeler?.yazar_id === userId && c.hikayeler).map((c: any) => ({
        id: c.id, type: 'comment' as const,
        text: buildCommentText(c.profiles?.display_name || c.profiles?.username, c.icerik.slice(0, 60) + (c.icerik.length > 60 ? '…' : '')),
        link: `/story/${c.hikayeler?.slug}`,
        time: c.created_at, avatar: c.profiles?.avatar_url, username: c.profiles?.username,
      })),
      ...(follows || []).map((f: any) => ({
        id: f.id, type: 'follow' as const,
        text: buildFollowText((f.profiles as any)?.display_name || (f.profiles as any)?.username),
        link: `/profile/${(f.profiles as any)?.username}`,
        time: f.created_at, avatar: (f.profiles as any)?.avatar_url, username: (f.profiles as any)?.username,
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

    setNotifs(all)
    setLoading(false)
  }

  const icons: Record<NotifType, React.ReactNode> = {
    like:    <Heart    style={{ width: 12, height: 12 }} className="fill-red-400 text-red-400" />,
    comment: <MessageCircle style={{ width: 12, height: 12 }} className="text-blue-400" />,
    follow:  <UserPlus style={{ width: 12, height: 12 }} className="text-emerald-400" />,
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Bell style={{ width: 24, height: 24 }} className="text-[var(--accent)]" />
          <h1 className="font-display text-3xl font-bold text-[var(--fg)]">{t.notificationsTitle}</h1>
        </div>
        {/* Realtime indicator */}
        <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border ${
          realtimeActive
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
            : 'border-[var(--border)] text-[var(--fg-muted)]'
        }`}>
          <Zap style={{ width: 11, height: 11 }} />
          {realtimeActive ? t.live : t.connecting}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 style={{ width: 28, height: 28 }} className="animate-spin text-[var(--accent)]" />
        </div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <Bell style={{ width: 40, height: 40 }} className="text-[var(--border)] mx-auto mb-4" />
          <p className="font-display text-xl text-[var(--fg)]">{t.allQuiet}</p>
          <p className="text-[var(--fg-muted)] mt-2 text-sm">{t.allQuietDesc}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => (
            <Link key={n.id} href={n.link}
              className={`flex items-start gap-4 p-4 rounded-2xl border transition-all hover:border-[var(--accent)]/40 ${
                n.isNew
                  ? 'border-[var(--accent)]/30 bg-[var(--accent)]/5'
                  : 'border-[var(--border)] bg-[var(--card)]'
              }`}>
              <div className="relative flex-shrink-0">
                {n.avatar ? (
                  <img src={n.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                    {(n.username || '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center">
                  {icons[n.type]}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--fg)] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: n.text }} />
                <p className="text-xs text-[var(--fg-muted)] mt-1">
                  {format(new Date(n.time), lang === 'tr' ? 'd MMM yyyy, HH:mm' : 'MMM d, yyyy · h:mm a', { locale })}
                </p>
              </div>

              {n.isNew && <div className="w-2 h-2 rounded-full bg-[var(--accent)] flex-shrink-0 mt-2" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
