'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Send, Search, ArrowLeft, MoreVertical, Trash2, ShieldOff, Loader2, MessageCircle, ChevronLeft } from 'lucide-react'
import { format } from 'date-fns'
import { tr as dateFnsTr } from 'date-fns/locale'

interface Profile { id: string; username: string; display_name: string; avatar_url: string | null; is_verified?: boolean }
interface Message  { id: string; icerik: string; gonderen_id: string; okundu: boolean; silinmis: boolean; created_at: string; profiles: Profile }
interface Conversation {
  id: string; other: Profile; lastMsg?: { icerik: string; gonderen_id: string; silinmis: boolean } | null; unread: number; son_mesaj_at: string
}

function Avatar({ p, size = 36 }: { p: Profile; size?: number }) {
  if (p.avatar_url) return <img src={p.avatar_url} alt="" className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
      {(p.display_name || p.username)[0].toUpperCase()}
    </div>
  )
}

export default function MessagesPage() {
  const router     = useRouter()
  const supabase   = createClient()
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  const [me, setMe]               = useState<Profile | null>(null)
  const [convos, setConvos]       = useState<Conversation[]>([])
  const [active, setActive]       = useState<Conversation | null>(null)
  const [messages, setMessages]   = useState<Message[]>([])
  const [text, setText]           = useState('')
  const [sending, setSending]     = useState(false)
  const [loadingConvos, setLoadingConvos] = useState(true)
  const [loadingMsgs, setLoadingMsgs]     = useState(false)
  const [search, setSearch]       = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [showMenu, setShowMenu]   = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')

  // Load current user
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('id, username, display_name, avatar_url').eq('id', user.id).single()
      setMe(data as Profile)
    })
  }, [])

  const loadConversations = useCallback(async () => {
    setLoadingConvos(true)
    const res  = await fetch('/api/dm/conversations')
    const data = await res.json()
    setConvos(data.conversations || [])
    setLoadingConvos(false)
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true)
    const res  = await fetch(`/api/dm/messages?conversationId=${convId}`)
    const data = await res.json()
    setMessages(data.messages || [])
    setLoadingMsgs(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    // Mark as read in UI
    setConvos(prev => prev.map(c => c.id === convId ? { ...c, unread: 0 } : c))
  }, [])

  const openConversation = useCallback((conv: Conversation) => {
    setActive(conv)
    setMobileView('chat')
    loadMessages(conv.id)
  }, [loadMessages])

  // Realtime subscription
  useEffect(() => {
    if (!active) return
    const channel = supabase
      .channel(`messages:${active.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mesajlar',
        filter: `konusma_id=eq.${active.id}`,
      }, async (payload: any) => {
        if (payload.new.gonderen_id === me?.id) return // already added optimistically
        const { data: profile } = await supabase.from('profiles').select('id, username, display_name, avatar_url').eq('id', payload.new.gonderen_id).single()
        setMessages(prev => [...prev, { ...payload.new, profiles: profile }])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [active?.id, me?.id])

  const sendMessage = async () => {
    if (!text.trim() || !active || sending || !me) return
    setSending(true)
    const content = text.trim()
    setText('')

    // Optimistic update
    const optimistic: Message = {
      id: crypto.randomUUID(), icerik: content, gonderen_id: me.id,
      okundu: false, silinmis: false, created_at: new Date().toISOString(), profiles: me,
    }
    setMessages(prev => [...prev, optimistic])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

    const res = await fetch('/api/dm/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: active.id, content }),
    })

    if (!res.ok) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      alert('Mesaj gönderilemedi.')
    } else {
      const { message } = await res.json()
      setMessages(prev => prev.map(m => m.id === optimistic.id ? message : m))
      setConvos(prev => prev.map(c => c.id === active.id ? { ...c, lastMsg: message, son_mesaj_at: message.created_at } : c))
    }
    setSending(false)
    inputRef.current?.focus()
  }

  const deleteMessage = async (msgId: string) => {
    await fetch(`/api/dm/messages?id=${msgId}`, { method: 'DELETE' })
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, silinmis: true, icerik: 'Bu mesaj silindi.' } : m))
  }

  const blockUser = async (userId: string) => {
    if (!confirm('Bu kullanıcıyı engellemek istiyor musun?')) return
    await fetch('/api/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: userId }),
    })
    setActive(null)
    setMobileView('list')
    await loadConversations()
  }

  // User search
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
        .neq('id', me?.id || '')
        .limit(8)
      setSearchResults((data as Profile[]) || [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [search, me?.id])

  const startConversation = async (targetUserId: string) => {
    const res  = await fetch('/api/dm/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId }),
    })
    const data = await res.json()
    if (data.error) { alert(data.error); return }
    setSearch(''); setSearchResults([])
    await loadConversations()
    // Find and open the conversation
    const freshRes   = await fetch('/api/dm/conversations')
    const freshData  = await freshRes.json()
    const fresh      = (freshData.conversations || []) as Conversation[]
    setConvos(fresh)
    const target = fresh.find(c => c.id === data.conversationId)
    if (target) openConversation(target)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-[var(--bg)]" style={{ maxHeight: '100dvh' }}>

      {/* Mobile header */}
      <div className="md:hidden sticky top-0 z-50 glass border-b border-[var(--border)] px-4 py-3 flex items-center gap-3">
        {mobileView === 'chat' && active ? (
          <>
            <button onClick={() => { setMobileView('list'); setActive(null) }} className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)]">
              <ChevronLeft style={{ width: 20, height: 20 }} />
            </button>
            <Avatar p={active.other} size={32} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-[var(--fg)] truncate">{active.other.display_name || active.other.username}</p>
              <p className="text-xs text-[var(--fg-muted)] truncate">@{active.other.username}</p>
            </div>
            <Link href={`/profile/${active.other.username}`} className="text-xs text-[var(--accent)] font-medium">Profil</Link>
            <button onClick={() => blockUser(active.other.id)} className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-red-400">
              <ShieldOff style={{ width: 16, height: 16 }} />
            </button>
          </>
        ) : (
          <>
            <Link href="/" className="p-1.5"><ArrowLeft style={{ width: 20, height: 20 }} className="text-[var(--fg-muted)]" /></Link>
            <h1 className="font-display font-bold text-lg text-[var(--fg)] flex-1">Mesajlar</h1>
          </>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col border-r border-[var(--border)] bg-[var(--bg-subtle)] ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>

          {/* Desktop header */}
          <div className="hidden md:flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
            <Link href="/" className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)]">
              <ArrowLeft style={{ width: 18, height: 18 }} />
            </Link>
            <h1 className="font-display font-bold text-xl text-[var(--fg)] flex-1">Mesajlar</h1>
            <MessageCircle style={{ width: 18, height: 18 }} className="text-[var(--fg-muted)]" />
          </div>

          {/* Search / new convo */}
          <div className="px-4 py-3 border-b border-[var(--border)] relative">
            <div className="relative">
              <Search style={{ width: 14, height: 14 }} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Kullanıcı ara veya yeni mesaj..."
                className="w-full pl-8 pr-4 py-2 rounded-xl text-sm bg-[var(--card)] border border-[var(--border)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)]/50"
              />
            </div>
            {(searchResults.length > 0 || searching) && (
              <div className="absolute left-4 right-4 top-full mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden">
                {searching && <div className="flex justify-center py-3"><Loader2 style={{ width: 14, height: 14 }} className="animate-spin text-[var(--fg-muted)]" /></div>}
                {searchResults.map(u => (
                  <button key={u.id} onClick={() => startConversation(u.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-subtle)] transition-colors text-left">
                    <Avatar p={u} size={32} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--fg)] truncate">{u.display_name || u.username}</p>
                      <p className="text-xs text-[var(--fg-muted)] truncate">@{u.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loadingConvos ? (
              <div className="flex justify-center py-12"><Loader2 style={{ width: 20, height: 20 }} className="animate-spin text-[var(--fg-muted)]" /></div>
            ) : convos.length === 0 ? (
              <div className="text-center py-16 px-6">
                <MessageCircle style={{ width: 40, height: 40 }} className="mx-auto text-[var(--fg-muted)] opacity-30 mb-3" />
                <p className="text-sm text-[var(--fg-muted)]">Henüz mesajın yok.</p>
                <p className="text-xs text-[var(--fg-muted)] mt-1 opacity-70">Yukarıdan kullanıcı ara ve mesaj gönder.</p>
              </div>
            ) : convos.map(conv => (
              <button key={conv.id} onClick={() => openConversation(conv)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left border-b border-[var(--border)]/50 ${active?.id === conv.id ? 'bg-[var(--accent)]/8' : 'hover:bg-[var(--card)]'}`}>
                <div className="relative flex-shrink-0">
                  <Avatar p={conv.other} size={42} />
                  {conv.unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                      style={{ background: '#d4840f' }}>{conv.unread > 9 ? '9+' : conv.unread}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={`text-sm truncate ${conv.unread > 0 ? 'font-bold text-[var(--fg)]' : 'font-medium text-[var(--fg)]'}`}>
                      {conv.other.display_name || conv.other.username}
                    </p>
                    <span className="text-[10px] text-[var(--fg-muted)] flex-shrink-0 ml-2">
                      {format(new Date(conv.son_mesaj_at), 'd MMM', { locale: dateFnsTr })}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${conv.unread > 0 ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)]'}`}>
                    {conv.lastMsg?.silinmis ? '🗑 Mesaj silindi'
                      : conv.lastMsg
                        ? (conv.lastMsg.gonderen_id === me?.id ? 'Sen: ' : '') + conv.lastMsg.icerik
                        : 'Henüz mesaj yok'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Chat panel ── */}
        <div className={`flex-1 flex flex-col ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
          {!active ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <MessageCircle style={{ width: 56, height: 56 }} className="text-[var(--fg-muted)] opacity-20 mb-4" />
              <p className="font-display text-xl font-bold text-[var(--fg)] mb-2">Mesajlarını seç</p>
              <p className="text-sm text-[var(--fg-muted)]">Soldan bir konuşma seç ya da yeni birini başlat.</p>
            </div>
          ) : (
            <>
              {/* Chat header — desktop only */}
              <div className="hidden md:flex items-center gap-3 px-5 py-4 border-b border-[var(--border)] bg-[var(--card)]">
                <Link href={`/profile/${active.other.username}`}>
                  <Avatar p={active.other} size={36} />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${active.other.username}`} className="font-semibold text-[var(--fg)] hover:text-[var(--accent)] transition-colors truncate block">
                    {active.other.display_name || active.other.username}
                  </Link>
                  <p className="text-xs text-[var(--fg-muted)]">@{active.other.username}</p>
                </div>
                <Link href={`/profile/${active.other.username}`}
                  className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors">
                  Profil
                </Link>
                <div className="relative">
                  <button onClick={() => setShowMenu(showMenu ? null : active.other.id)}
                    className="p-2 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-colors">
                    <MoreVertical style={{ width: 18, height: 18 }} />
                  </button>
                  {showMenu === active.other.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMenu(null)} />
                      <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden">
                        <button onClick={() => { blockUser(active.other.id); setShowMenu(null) }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                          <ShieldOff style={{ width: 14, height: 14 }} /> Engelle
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
                {loadingMsgs ? (
                  <div className="flex justify-center py-8"><Loader2 style={{ width: 20, height: 20 }} className="animate-spin text-[var(--fg-muted)]" /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-[var(--fg-muted)]">Henüz mesaj yok. İlk mesajı sen gönder! 👋</p>
                  </div>
                ) : messages.map((msg, i) => {
                  const isMe   = msg.gonderen_id === me?.id
                  const showDate = i === 0 || format(new Date(messages[i-1].created_at), 'yyyy-MM-dd') !== format(new Date(msg.created_at), 'yyyy-MM-dd')
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex items-center gap-3 my-3">
                          <div className="flex-1 h-px bg-[var(--border)]" />
                          <span className="text-[10px] text-[var(--fg-muted)]">
                            {format(new Date(msg.created_at), 'd MMMM yyyy', { locale: dateFnsTr })}
                          </span>
                          <div className="flex-1 h-px bg-[var(--border)]" />
                        </div>
                      )}
                      <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                        {!isMe && <Avatar p={msg.profiles} size={26} />}
                        <div className={`group relative max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            msg.silinmis ? 'opacity-50 italic' :
                            isMe
                              ? 'text-white rounded-br-md'
                              : 'bg-[var(--card)] border border-[var(--border)] text-[var(--fg)] rounded-bl-md'
                          }`}
                            style={isMe && !msg.silinmis ? { background: 'linear-gradient(135deg,#d4840f,#e8a030)' } : {}}>
                            {msg.icerik}
                          </div>
                          <div className={`flex items-center gap-1.5 mt-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <span className="text-[10px] text-[var(--fg-muted)]">
                              {format(new Date(msg.created_at), 'HH:mm')}
                            </span>
                            {isMe && !msg.silinmis && (
                              <button onClick={() => deleteMessage(msg.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-[var(--fg-muted)] hover:text-red-400">
                                <Trash2 style={{ width: 10, height: 10 }} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--card)]">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder="Mesaj yaz..."
                    className="flex-1 resize-none text-sm text-[var(--fg)] bg-[var(--bg-subtle)] border border-[var(--border)] rounded-2xl px-4 py-3 focus:outline-none focus:border-[var(--accent)]/50 placeholder-[var(--fg-muted)] max-h-32"
                    style={{ scrollbarWidth: 'none' }}
                  />
                  <button onClick={sendMessage} disabled={!text.trim() || sending}
                    className="p-3 rounded-2xl text-white transition-all hover:scale-105 disabled:opacity-40 flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                    {sending
                      ? <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" />
                      : <Send style={{ width: 18, height: 18 }} />
                    }
                  </button>
                </div>
                <p className="text-[10px] text-[var(--fg-muted)] mt-1.5 text-center opacity-50">Enter ile gönder · Shift+Enter yeni satır</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
