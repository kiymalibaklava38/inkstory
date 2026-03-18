'use client'
import { useState, useEffect } from 'react'
import { Heart, BookMarked, UserPlus, UserMinus, Send, Loader2, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { tr as dateFnsTr, enUS } from 'date-fns/locale'


// Engagement log helper - trending sistemi için
async function logEngagement(hikayeId: string, eventType: 'read' | 'like' | 'comment' | 'bookmark') {
  try {
    await fetch('/api/engagement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hikaye_id: hikayeId, event_type: eventType }),
    })
  } catch { /* non-critical */ }
}

// ── Like Button ───────────────────────────────────────────
export function LikeButton({ storyId, initialCount, initialLiked, hasUser }: {
  storyId: string; initialCount: number; initialLiked: boolean; hasUser: boolean
}) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [busy, setBusy]   = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  const toggle = async () => {
    if (!hasUser) { router.push('/login'); return }
    if (busy) return
    setBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    if (liked) {
      await supabase.from('begeniler').delete().eq('kullanici_id', user.id).eq('hikaye_id', storyId)
      setLiked(false); setCount(c => c - 1)
    } else {
      await supabase.from('begeniler').insert({ kullanici_id: user.id, hikaye_id: storyId })
      setLiked(true); setCount(c => c + 1)
      logEngagement(storyId, 'like')
    }
    setBusy(false)
  }

  return (
    <button onClick={toggle} disabled={busy}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
        liked
          ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/15'
          : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-red-400/40 hover:text-red-400'
      }`}>
      <Heart style={{ width: 15, height: 15 }} className={liked ? 'fill-red-400' : ''} />
      {count.toLocaleString()}
    </button>
  )
}

// ── Library Button ────────────────────────────────────────
export function LibraryButton({ storyId, initialSaved, hasUser }: {
  storyId: string; initialSaved: boolean; hasUser: boolean
}) {
  const [saved, setSaved] = useState(initialSaved)
  const [busy, setBusy]   = useState(false)
  const router   = useRouter()
  const supabase = createClient()
  const { t }    = useLang()

  const toggle = async () => {
    if (!hasUser) { router.push('/login'); return }
    if (busy) return
    setBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (saved) {
      await supabase.from('okuma_listesi').delete().eq('kullanici_id', user.id).eq('hikaye_id', storyId)
      setSaved(false)
    } else {
      await supabase.from('okuma_listesi').insert({ kullanici_id: user.id, hikaye_id: storyId })
      setSaved(true)
      logEngagement(storyId, 'bookmark')
    }
    setBusy(false)
  }

  return (
    <button onClick={toggle} disabled={busy}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
        saved
          ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]'
          : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)]'
      }`}>
      <BookMarked style={{ width: 15, height: 15 }} className={saved ? 'fill-[var(--accent)]' : ''} />
      {saved ? t.saved : t.save}
    </button>
  )
}

// ── Follow Button ─────────────────────────────────────────
export function FollowButton({ profileId, initialFollowing, hasUser }: {
  profileId: string; initialFollowing: boolean; hasUser: boolean
}) {
  const [following, setFollowing] = useState(initialFollowing)
  const [busy, setBusy]           = useState(false)
  const router   = useRouter()
  const supabase = createClient()
  const { t }    = useLang()

  const toggle = async () => {
    if (!hasUser) { router.push('/login'); return }
    if (busy) return
    setBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (following) {
      await supabase.from('takip').delete().eq('takipci_id', user.id).eq('takip_edilen_id', profileId)
      setFollowing(false)
    } else {
      await supabase.from('takip').insert({ takipci_id: user.id, takip_edilen_id: profileId })
      setFollowing(true)
    }
    setBusy(false)
  }

  return (
    <button onClick={toggle} disabled={busy}
      className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${
        following
          ? 'border border-[var(--border)] text-[var(--fg-muted)] hover:border-red-400/40 hover:text-red-400'
          : 'text-white hover:scale-105'
      }`}
      style={!following ? { background: 'linear-gradient(135deg,#d4840f,#e8a030)' } : {}}>
      {following
        ? <><UserMinus style={{ width: 14, height: 14 }} />{t.unfollow}</>
        : <><UserPlus  style={{ width: 14, height: 14 }} />{t.follow}</>}
    </button>
  )
}

// ── Comments Section ──────────────────────────────────────
interface Comment {
  id: string; icerik: string; created_at: string
  profiles: { username: string; display_name: string | null; avatar_url: string | null }
}

export function CommentsSection({ storyId, userId }: { storyId: string; userId: string | null }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [sending, setSending]   = useState(false)
  const [loaded, setLoaded]     = useState(false)
  const supabase = createClient()
  const { t, lang } = useLang()
  const locale = lang === 'tr' ? dateFnsTr : enUS

  const loadComments = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('yorumlar')
      .select('id,icerik,created_at,profiles(username,display_name,avatar_url)')
      .eq('hikaye_id', storyId).is('ust_yorum_id', null)
      .order('created_at', { ascending: false }).limit(20)
    setComments((data as any) || [])
    setLoading(false)
    setLoaded(true)
  }

  const send = async () => {
    if (!text.trim() || !userId || sending) return
    setSending(true)
    await supabase.from('yorumlar').insert({ hikaye_id: storyId, yazar_id: userId, icerik: text.trim() })
    setText('')
    logEngagement(storyId, 'comment')
    await loadComments()
    setSending(false)
  }

  return (
    <div>
      {/* Section header — clickable to lazy-load */}
      <button
        onClick={() => { if (!loaded) loadComments() }}
        className="font-display text-2xl font-bold text-[var(--fg)] mb-5 flex items-center gap-2 hover:text-[var(--accent)] transition-colors"
      >
        <MessageCircle style={{ width: 22, height: 22 }} />
        {t.comments}
      </button>

      {!loaded ? (
        <button onClick={loadComments}
          className="w-full py-3 rounded-xl border border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--accent)]/50 transition-all">
          {t.loadComments}
        </button>
      ) : (
        <>
          {/* Comment input */}
          {userId ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 mb-5">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={3}
                placeholder={t.shareThoughts}
                className="w-full resize-none text-sm text-[var(--fg)] bg-transparent placeholder-[var(--fg-muted)] focus:outline-none"
              />
              <div className="flex justify-end mt-2">
                <button onClick={send} disabled={!text.trim() || sending}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white transition-all hover:scale-105 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                  {sending
                    ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
                    : <Send style={{ width: 13, height: 13 }} />}
                  {t.post}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)] p-4 mb-5 text-center text-sm text-[var(--fg-muted)]">
              <Link href="/login" className="text-[var(--accent)] hover:underline font-medium">
                {t.signIn}
              </Link>{' '}
              {t.signInComment}
            </div>
          )}

          {/* Comments list */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 style={{ width: 20, height: 20 }} className="animate-spin text-[var(--fg-muted)]" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-[var(--fg-muted)] text-sm py-8">{t.noComments}</p>
          ) : (
            <div className="space-y-4">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  {c.profiles.avatar_url ? (
                    <img src={c.profiles.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                      {(c.profiles.display_name || c.profiles.username)[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <Link href={`/profile/${c.profiles.username}`}
                        className="text-sm font-medium text-[var(--fg)] hover:text-[var(--accent)] transition-colors">
                        {c.profiles.display_name || c.profiles.username}
                      </Link>
                      <span className="text-xs text-[var(--fg-muted)]">
                        {format(new Date(c.created_at),
                          lang === 'tr' ? 'd MMM yyyy' : 'MMM d, yyyy',
                          { locale }
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--fg-muted)] leading-relaxed">{c.icerik}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
