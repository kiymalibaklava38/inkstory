'use client'
import { useState, useEffect } from 'react'
import { Heart, BookMarked, UserPlus, UserMinus, Send, Loader2, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n'
import { VerifiedBadge } from '@/components/ui/VerifiedBadge'
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
  ust_yorum_id: string | null
  yazar_id: string
  profiles: { username: string; display_name: string | null; avatar_url: string | null; is_verified?: boolean; verification_badge?: string }
  replies?: Comment[]
}

function CommentAvatar({ p, size = 36 }: { p: Comment['profiles']; size?: number }) {
  if (p.avatar_url)
    return <img src={p.avatar_url} alt="" className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-xs"
      style={{ width: size, height: size, background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
      {(p.display_name || p.username)[0].toUpperCase()}
    </div>
  )
}

interface CommentBubbleProps {
  c: Comment
  isReply?: boolean
  myId: string | null
  userId: string | null
  lang: string
  locale: any
  onReply: (id: string, name: string) => void
  onDelete: (id: string) => void
  onBlock: (userId: string) => void
}

function CommentBubble({ c, isReply = false, myId, userId, lang, locale, onReply, onDelete, onBlock }: CommentBubbleProps) {
  const isOwn = c.yazar_id === myId
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className={`flex gap-3 ${isReply ? 'mt-2' : ''}`}>
      <Link href={`/profile/${c.profiles.username}`} className="flex-shrink-0">
        <CommentAvatar p={c.profiles} size={isReply ? 28 : 36} />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <Link href={`/profile/${c.profiles.username}`}
            className="text-sm font-semibold text-[var(--fg)] hover:text-[var(--accent)] transition-colors">
            {c.profiles.display_name || c.profiles.username}
          </Link>
          {c.profiles.is_verified && (
            <VerifiedBadge size={12} badge={c.profiles.verification_badge || 'author'} />
          )}
          <span className="text-xs text-[var(--fg-muted)]">
            {format(new Date(c.created_at), lang === 'tr' ? 'd MMM' : 'MMM d', { locale })}
          </span>
          <div className="ml-auto relative flex items-center gap-1">
            {!isReply && userId && (
              <button onClick={() => onReply(c.id, c.profiles.display_name || c.profiles.username)}
                className="text-xs text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors px-1.5 py-0.5 rounded">
                ↩ Cevapla
              </button>
            )}
            {(isOwn || userId) && (
              <div className="relative">
                <button onClick={() => setMenuOpen(v => !v)}
                  className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors px-1 py-0.5 rounded opacity-60 hover:opacity-100">
                  ···
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-36 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden">
                      {isOwn && (
                        <button onClick={() => { onDelete(c.id); setMenuOpen(false) }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                          🗑 Yorumu sil
                        </button>
                      )}
                      {!isOwn && myId && (
                        <button onClick={() => { onBlock(c.yazar_id); setMenuOpen(false) }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                          🚫 Engelle
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-[var(--fg-muted)] leading-relaxed">{c.icerik}</p>
      </div>
    </div>
  )
}

export function CommentsSection({ storyId, userId }: { storyId: string; userId: string | null }) {
  const [comments, setComments]   = useState<Comment[]>([])
  const [text, setText]           = useState('')
  const [loading, setLoading]     = useState(false)
  const [sending, setSending]     = useState(false)
  const [loaded, setLoaded]       = useState(false)
  const [replyTo, setReplyTo]     = useState<{ id: string; name: string } | null>(null)
  const [myId, setMyId]           = useState<string | null>(null)
  const supabase  = createClient()
  const { t, lang } = useLang()
  const locale    = lang === 'tr' ? dateFnsTr : enUS

  useEffect(() => {
    if (userId) setMyId(userId)
  }, [userId])

  const loadComments = async () => {
    setLoading(true)

    // Önce yorumları çek — profiles join yok (FK belirsizliği sorunu)
    const { data: rawComments, error } = await supabase
      .from('yorumlar')
      .select('id, icerik, created_at, ust_yorum_id, yazar_id')
      .eq('hikaye_id', storyId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      console.error('[Comments] Load error:', error.message)
      setLoading(false)
      setLoaded(true)
      return
    }

    const comments = rawComments || []

    if (comments.length === 0) {
      setComments([])
      setLoading(false)
      setLoaded(true)
      return
    }

    // Benzersiz yazar ID'lerini topla, tek seferde profil çek
    const authorIds = Array.from(new Set(comments.map((c: any) => c.yazar_id)))
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_verified, verification_badge')
      .in('id', authorIds)

    const profileMap: Record<string, any> = {}
    ;(profiles || []).forEach((p: any) => { profileMap[p.id] = p })

    // Yorumlarla profilleri birleştir
    const enriched = comments.map((c: any) => ({
      ...c,
      profiles: profileMap[c.yazar_id] || { username: 'Silinmiş', display_name: null, avatar_url: null },
    }))

    // Tree yapısı: üst yorumlar + cevaplar
    const top = enriched.filter((c: any) => !c.ust_yorum_id).map((c: any) => ({
      ...c,
      replies: enriched.filter((r: any) => r.ust_yorum_id === c.id),
    }))

    setComments(top)
    setLoading(false)
    setLoaded(true)
  }

  const send = async () => {
    if (!text.trim() || !userId || sending) return
    setSending(true)
    const content = text.trim()

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, content, parentId: replyTo?.id ?? undefined }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Yorum gönderilemedi. Tekrar dene.')
        setSending(false)
        return
      }

      setText('')
      setReplyTo(null)
      logEngagement(storyId, 'comment')
      await loadComments()
    } catch (err) {
      alert('Bağlantı hatası. Tekrar dene.')
    }

    setSending(false)
  }

  const deleteComment = async (commentId: string) => {
    if (!confirm('Yorumu silmek istiyor musun?')) return
    await fetch(`/api/comments?id=${commentId}`, { method: 'DELETE' })
    await loadComments()
  }

  const blockFromComment = async (targetId: string) => {
    if (!confirm('Bu kullanıcıyı engellemek istiyor musun?')) return
    await fetch('/api/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: targetId }),
    })
  }

  const bubbleProps = { myId, userId, lang, locale, onReply: (id: string, name: string) => setReplyTo({ id, name }), onDelete: deleteComment, onBlock: blockFromComment }

  return (
    <div>
      <button
        onClick={() => { if (!loaded) loadComments() }}
        className="font-display text-2xl font-bold text-[var(--fg)] mb-5 flex items-center gap-2 hover:text-[var(--accent)] transition-colors"
      >
        <MessageCircle style={{ width: 22, height: 22 }} />
        {t.comments}
        {loaded && comments.length > 0 && (
          <span className="text-sm font-normal text-[var(--fg-muted)] ml-1">
            ({comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)})
          </span>
        )}
      </button>

      {!loaded ? (
        <button onClick={loadComments}
          className="w-full py-3 rounded-xl border border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--accent)]/50 transition-all">
          {t.loadComments}
        </button>
      ) : (
        <>
          {replyTo && (
            <div className="flex items-center gap-2 px-4 py-2.5 mb-2 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-sm">
              <span className="text-[var(--accent)] font-medium">↩ {replyTo.name} adlı kullanıcıya cevap veriyorsun</span>
              <button onClick={() => setReplyTo(null)} className="ml-auto text-[var(--fg-muted)] hover:text-[var(--fg)] text-xs px-2 py-0.5 rounded">İptal</button>
            </div>
          )}

          {userId ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 mb-6">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={3}
                placeholder={replyTo ? `${replyTo.name} için cevap yaz...` : t.shareThoughts}
                className="w-full resize-none text-sm text-[var(--fg)] bg-transparent placeholder-[var(--fg-muted)] focus:outline-none"
              />
              <div className="flex justify-end mt-2">
                <button onClick={send} disabled={!text.trim() || sending}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white transition-all hover:scale-105 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                  {sending ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <Send style={{ width: 13, height: 13 }} />}
                  {replyTo ? 'Cevapla' : t.post}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)] p-4 mb-5 text-center text-sm text-[var(--fg-muted)]">
              <Link href="/login" className="text-[var(--accent)] hover:underline font-medium">{t.signIn}</Link>{' '}{t.signInComment}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 style={{ width: 20, height: 20 }} className="animate-spin text-[var(--fg-muted)]" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-[var(--fg-muted)] text-sm py-8">{t.noComments}</p>
          ) : (
            <div className="space-y-5">
              {comments.map(c => (
                <div key={c.id}>
                  <CommentBubble c={c} {...bubbleProps} />
                  {c.replies && c.replies.length > 0 && (
                    <div className="space-y-2 mt-2 pl-4 border-l-2 border-[var(--border)] ml-5">
                      {c.replies.map(r => (
                        <CommentBubble key={r.id} c={r} isReply {...bubbleProps} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
