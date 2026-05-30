'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight, List, Settings, MessageCircle, X, Send, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ReadingModeToggle, READING_THEMES, ReadMode } from './ReadingModeToggle'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n'
import { VerifiedBadge } from '@/components/ui/VerifiedBadge'
import Link from 'next/link'
import { format } from 'date-fns'
import { tr as dateFnsTr, enUS } from 'date-fns/locale'

interface Props {
  storyId:      string
  chapterId:    string
  storySlug:    string
  chapterNo:    number
  chapterTitle: string
  content:      string
  prevChapter:  { bolum_no: number; baslik: string } | null
  nextChapter:  { bolum_no: number; baslik: string } | null
}

interface Comment {
  id: string
  icerik: string
  created_at: string
  ust_yorum_id: string | null
  yazar_id: string
  paragraph_index: number | null
  profiles: {
    username: string
    display_name: string | null
    avatar_url: string | null
    is_verified?: boolean
    verification_badge?: string
  }
  replies?: Comment[]
}

// Font size options
const FONT_SIZES = [
  { label: 'Küçük',   size: '16px', lineH: '1.8' },
  { label: 'Orta',    size: '18px', lineH: '1.85' },
  { label: 'Büyük',   size: '20px', lineH: '1.9' },
  { label: 'Çok Büyük', size: '23px', lineH: '2.0' },
]
const FONT_FAMILIES = [
  { label: 'Lora',      value: "'Lora', Georgia, serif" },
  { label: 'Georgia',   value: "Georgia, serif" },
  { label: 'Sans',      value: "'DM Sans', system-ui, sans-serif" },
]

function CommentAvatar({ p, size = 32 }: { p: Comment['profiles']; size?: number }) {
  if (p.avatar_url)
    return <img src={p.avatar_url} alt="" className="rounded-full object-cover flex-shrink-0 animate-fade-in" style={{ width: size, height: size }} />
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-xs animate-fade-in"
      style={{ width: size, height: size, background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
      {(p.display_name || p.username)[0].toUpperCase()}
    </div>
  )
}

export function PageTurnReader({ storyId, chapterId, storySlug, chapterNo, chapterTitle, content, prevChapter, nextChapter }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { t, lang } = useLang()
  const locale = lang === 'tr' ? dateFnsTr : enUS

  const [theme, setTheme]         = useState<ReadMode>('dark')
  const [fontSizeIdx, setFontSizeIdx]   = useState(1) // default: Orta
  const [fontFamilyIdx, setFontFamilyIdx] = useState(0) // default: Lora
  const [showSettings, setShowSettings]   = useState(false)
  const [anim, setAnim]                   = useState<'left' | 'right' | null>(null)
  const [entered, setEntered]             = useState(false)
  const contentRef                        = useRef<HTMLDivElement>(null)

  // --- Inline Comments States ---
  const [comments, setComments]                     = useState<Comment[]>([])
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number | null>(null)
  const [replyTo, setReplyTo]                       = useState<{ id: string; name: string } | null>(null)
  const [text, setText]                             = useState('')
  const [myId, setMyId]                             = useState<string | null>(null)
  const [loadingComments, setLoadingComments]       = useState(false)
  const [sendingComment, setSendingComment]         = useState(false)

  const themeConfig = READING_THEMES[theme]

  // Dynamic DOM parsing for paragraph indexing
  const paragraphs = useMemo(() => {
    if (typeof window === 'undefined') return []
    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'text/html')
    return Array.from(doc.body.children).map(child => child.outerHTML)
  }, [content])

  // Load saved preferences and current user
  useEffect(() => {
    const savedTheme  = localStorage.getItem('inkstory-read-mode') as ReadMode | null
    const savedFontSz = localStorage.getItem('inkstory-font-size')
    const savedFontFm = localStorage.getItem('inkstory-font-family')
    if (savedTheme  && READING_THEMES[savedTheme]) setTheme(savedTheme)
    if (savedFontSz) setFontSizeIdx(Number(savedFontSz))
    if (savedFontFm) setFontFamilyIdx(Number(savedFontFm))
    
    // Get current user ID
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setMyId(data.user.id)
    })

    setTimeout(() => setEntered(true), 30)
  }, [supabase])

  // Load Comments
  const loadComments = useCallback(async () => {
    setLoadingComments(true)
    const { data: rawComments, error } = await supabase
      .from('yorumlar')
      .select('id, icerik, created_at, yazar_id, paragraph_index, ust_yorum_id')
      .eq('bolum_id', chapterId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[Inline Comments] Failed to load comments:', error.message)
      setLoadingComments(false)
      return
    }

    const comms = rawComments || []
    if (comms.length === 0) {
      setComments([])
      setLoadingComments(false)
      return
    }

    // Batch fetch user profiles for speed
    const authorIds = Array.from(new Set(comms.map(c => c.yazar_id)))
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_verified, verification_badge')
      .in('id', authorIds)

    const profileMap: Record<string, any> = {}
    ;(profiles || []).forEach(p => { profileMap[p.id] = p })

    const enriched = comms.map(c => ({
      ...c,
      profiles: profileMap[c.yazar_id] || { username: 'Silinmiş', display_name: null, avatar_url: null }
    }))

    setComments(enriched)
    setLoadingComments(false)
  }, [chapterId, supabase])

  // Load comments initially
  useEffect(() => {
    loadComments()
  }, [loadComments])

  // Map paragraphs to comment counts
  const paragraphCommentCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    comments.forEach(c => {
      if (c.paragraph_index !== null && c.paragraph_index !== undefined) {
        counts[c.paragraph_index] = (counts[c.paragraph_index] || 0) + 1
      }
    })
    return counts
  }, [comments])

  // Get active paragraph comments in nested tree structure
  const activeParagraphComments = useMemo(() => {
    if (activeParagraphIndex === null) return []
    const filtered = comments.filter(c => c.paragraph_index === activeParagraphIndex)

    const top = filtered.filter(c => !c.ust_yorum_id).map(c => ({
      ...c,
      replies: filtered.filter(r => r.ust_yorum_id === c.id)
    }))

    return top
  }, [comments, activeParagraphIndex])

  // Submit comment
  const send = async () => {
    if (!text.trim() || !myId || sendingComment || activeParagraphIndex === null) return
    setSendingComment(true)
    const contentText = text.trim()

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          chapterId,
          content: contentText,
          parentId: replyTo?.id ?? undefined,
          paragraphIndex: activeParagraphIndex,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Yorum gönderilemedi. Tekrar dene.')
        setSendingComment(false)
        return
      }

      setText('')
      setReplyTo(null)
      await loadComments()
    } catch (err) {
      alert('Bağlantı hatası. Tekrar dene.')
    }
    setSendingComment(false)
  }

  // Delete Comment
  const deleteComment = async (commentId: string) => {
    if (!confirm('Yorumu silmek istiyor musun?')) return
    await fetch(`/api/comments?id=${commentId}`, { method: 'DELETE' })
    await loadComments()
  }

  const saveFontSize = (idx: number) => {
    setFontSizeIdx(idx)
    localStorage.setItem('inkstory-font-size', String(idx))
  }
  const saveFontFamily = (idx: number) => {
    setFontFamilyIdx(idx)
    localStorage.setItem('inkstory-font-family', String(idx))
  }

  const navigate = useCallback((href: string, dir: 'left' | 'right') => {
    setAnim(dir)
    setTimeout(() => router.push(href), 320)
  }, [router])

  // Keyboard navigation (Ignore if comment drawer is open!)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (activeParagraphIndex !== null) return // Ignore if drawer open
      if (e.key === 'ArrowRight' && nextChapter)
        navigate(`/story/${storySlug}/chapter/${nextChapter.bolum_no}`, 'left')
      if (e.key === 'ArrowLeft' && prevChapter)
        navigate(`/story/${storySlug}/chapter/${prevChapter.bolum_no}`, 'right')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [navigate, nextChapter, prevChapter, storySlug, activeParagraphIndex])

  // Touch swipe (Ignore if comment drawer is open!)
  useEffect(() => {
    let startX = 0
    const el = contentRef.current
    if (!el) return
    const onStart = (e: TouchEvent) => { startX = e.touches[0].clientX }
    const onEnd   = (e: TouchEvent) => {
      if (activeParagraphIndex !== null) return // Ignore if drawer open
      const dx = e.changedTouches[0].clientX - startX
      if (Math.abs(dx) < 60) return
      if (dx < 0 && nextChapter) navigate(`/story/${storySlug}/chapter/${nextChapter.bolum_no}`, 'left')
      if (dx > 0 && prevChapter) navigate(`/story/${storySlug}/chapter/${prevChapter.bolum_no}`, 'right')
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => { el.removeEventListener('touchstart', onStart); el.removeEventListener('touchend', onEnd) }
  }, [navigate, nextChapter, prevChapter, storySlug, activeParagraphIndex])

  const fs = FONT_SIZES[fontSizeIdx]
  const ff = FONT_FAMILIES[fontFamilyIdx]

  return (
    <>
      <style>{`
        @keyframes pageLeft  { 0%{transform:translateX(0);opacity:1} 100%{transform:translateX(-4%);opacity:0} }
        @keyframes pageRight { 0%{transform:translateX(0);opacity:1} 100%{transform:translateX(4%);opacity:0} }
        @keyframes pageEnter { 0%{transform:translateX(2%);opacity:0} 100%{transform:translateX(0);opacity:1} }
        @keyframes drawerIn  { 0%{transform:translateX(100%)} 100%{transform:translateX(0)} }
        @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
        
        .anim-left  { animation: pageLeft  0.32s ease forwards; }
        .anim-right { animation: pageRight 0.32s ease forwards; }
        .anim-enter { animation: pageEnter 0.38s ease forwards; }
        .animate-slide-in { animation: drawerIn 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in  { animation: fadeIn 0.25s ease-out forwards; }

        .story-prose p {
          margin-bottom: 1.4em;
          text-indent: 1.5em;
        }
        .story-prose p:first-child { text-indent: 0; }
        .story-prose h1,.story-prose h2,.story-prose h3 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-weight: 700;
          margin: 1.5em 0 0.6em;
        }
        .story-prose blockquote {
          border-left: 3px solid currentColor;
          opacity: 0.7;
          padding: 0.5em 0 0.5em 1.2em;
          margin: 1.5em 0;
          font-style: italic;
        }
        .story-prose strong { font-weight: 700; }
        .story-prose em     { font-style: italic; }
      `}</style>

      {/* Fullscreen reading area */}
      <div
        ref={contentRef}
        style={{ backgroundColor: themeConfig.bg, minHeight: '100vh' }}
        className="transition-colors duration-300"
      >
        {/* Top toolbar */}
        <div
          className="sticky top-0 z-50 px-4 py-3 border-b flex items-center justify-between gap-3"
          style={{ backgroundColor: themeConfig.surface, borderColor: themeConfig.border }}
        >
          {/* Back to story */}
          <button
            onClick={() => router.push(`/story/${storySlug}`)}
            className="flex items-center gap-2 text-sm font-medium transition-colors min-w-0 flex-1"
            style={{ color: themeConfig.muted }}
          >
            <List style={{ width: 16, height: 16, flexShrink: 0 }} />
            <span className="truncate text-xs sm:text-sm">{chapterNo}. Bölüm</span>
          </button>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ReadingModeToggle onModeChange={setTheme} />
            <button
              onClick={() => setShowSettings(v => !v)}
              className="p-1.5 rounded-xl border text-xs transition-all"
              style={{ borderColor: themeConfig.border, backgroundColor: showSettings ? `${themeConfig.accent}20` : themeConfig.surface, color: showSettings ? themeConfig.accent : themeConfig.muted }}
              title="Yazı ayarları"
            >
              <Settings style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div
            className="border-b px-4 py-4"
            style={{ backgroundColor: themeConfig.surface, borderColor: themeConfig.border }}
          >
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Font size */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: themeConfig.muted }}>Yazı Boyutu</p>
                <div className="flex gap-2">
                  {FONT_SIZES.map((f, i) => (
                    <button key={i} onClick={() => saveFontSize(i)}
                      className="flex-1 py-2 rounded-lg text-xs font-medium border transition-all"
                      style={{
                        borderColor: fontSizeIdx === i ? themeConfig.accent : themeConfig.border,
                        backgroundColor: fontSizeIdx === i ? `${themeConfig.accent}15` : 'transparent',
                        color: fontSizeIdx === i ? themeConfig.accent : themeConfig.muted,
                        fontSize: ['13px','14px','15px','16px'][i],
                      }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Font family */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: themeConfig.muted }}>Yazı Tipi</p>
                <div className="flex gap-2">
                  {FONT_FAMILIES.map((f, i) => (
                    <button key={i} onClick={() => saveFontFamily(i)}
                      className="flex-1 py-2 rounded-lg text-xs font-medium border transition-all"
                      style={{
                        borderColor: fontFamilyIdx === i ? themeConfig.accent : themeConfig.border,
                        backgroundColor: fontFamilyIdx === i ? `${themeConfig.accent}15` : 'transparent',
                        color: fontFamilyIdx === i ? themeConfig.accent : themeConfig.muted,
                        fontFamily: f.value,
                      }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div
          className={`max-w-2xl mx-auto px-4 sm:px-8 py-10 sm:py-16 ${
            anim === 'left' ? 'anim-left' : anim === 'right' ? 'anim-right' : entered ? 'anim-enter' : 'opacity-0'
          }`}
        >
          {/* Chapter header */}
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.25em] mb-5"
              style={{ color: themeConfig.accent }}>
              Bölüm {chapterNo}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-8"
              style={{ color: themeConfig.text, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              {chapterTitle}
            </h1>
            <div className="flex items-center justify-center gap-4" style={{ color: themeConfig.muted }}>
              <div className="h-px w-16" style={{ backgroundColor: themeConfig.border }} />
              <span className="text-lg opacity-60">✦</span>
              <div className="h-px w-16" style={{ backgroundColor: themeConfig.border }} />
            </div>
          </div>

          {/* Story text */}
          <div
            className="story-prose"
            style={{
              fontSize:   fs.size,
              lineHeight: fs.lineH,
              fontFamily: ff.value,
              color:      themeConfig.text,
            }}
          >
            {paragraphs.length === 0 ? (
              <div dangerouslySetInnerHTML={{ __html: content }} />
            ) : (
              paragraphs.map((pHTML, idx) => {
                const count = paragraphCommentCounts[idx] || 0
                return (
                  <div key={idx} className="relative group flex items-start justify-between gap-4 py-1">
                    <div className="flex-1" dangerouslySetInnerHTML={{ __html: pHTML }} />
                    
                    {/* Inline Comment bubble button */}
                    <button
                      onClick={() => {
                        setActiveParagraphIndex(idx)
                        setReplyTo(null)
                      }}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all duration-200 ${
                        count > 0 
                          ? 'opacity-100 scale-100 shadow-sm pointer-events-auto' 
                          : 'opacity-25 scale-100 pointer-events-auto md:opacity-0 md:scale-95 md:pointer-events-none md:group-hover:opacity-60 md:group-hover:scale-100 md:group-hover:pointer-events-auto hover:!opacity-100 hover:scale-105'
                      }`}
                      style={{
                        borderColor: count > 0 ? themeConfig.accent : themeConfig.border,
                        backgroundColor: count > 0 ? `${themeConfig.accent}15` : themeConfig.surface,
                        color: count > 0 ? themeConfig.accent : themeConfig.muted,
                      }}
                      title={count > 0 ? `${count} Yorum` : 'Yorum Ekle'}
                    >
                      <MessageCircle style={{ width: 13, height: 13 }} className={count > 0 ? 'fill-current' : ''} />
                      {count > 0 && <span>{count}</span>}
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* End ornament */}
          <div className="text-center mt-16 sm:mt-24 mb-12">
            <div className="flex items-center justify-center gap-4" style={{ color: themeConfig.muted, opacity: 0.4 }}>
              <div className="h-px w-20" style={{ backgroundColor: 'currentColor' }} />
              <span className="text-2xl">✦</span>
              <div className="h-px w-20" style={{ backgroundColor: 'currentColor' }} />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-stretch gap-3 mt-8 pt-6 border-t" style={{ borderColor: themeConfig.border }}>
            {prevChapter ? (
              <button
                onClick={() => navigate(`/story/${storySlug}/chapter/${prevChapter.bolum_no}`, 'right')}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl border text-sm font-medium transition-all flex-1 group"
                style={{ borderColor: themeConfig.border, backgroundColor: themeConfig.surface, color: themeConfig.text }}
              >
                <ChevronLeft style={{ width: 16, height: 16, flexShrink: 0 }}
                  className="group-hover:-translate-x-0.5 transition-transform" />
                <div className="min-w-0 text-left">
                  <p className="text-xs mb-0.5" style={{ color: themeConfig.muted }}>Önceki</p>
                  <p className="truncate text-sm">{prevChapter.baslik}</p>
                </div>
              </button>
            ) : <div className="flex-1" />}

            <button
              onClick={() => router.push(`/story/${storySlug}`)}
              className="flex-shrink-0 p-3 rounded-2xl border transition-all"
              style={{ borderColor: themeConfig.border, backgroundColor: themeConfig.surface, color: themeConfig.muted }}
              title="İçindekiler"
            >
              <List style={{ width: 18, height: 18 }} />
            </button>

            {nextChapter ? (
              <button
                onClick={() => navigate(`/story/${storySlug}/chapter/${nextChapter.bolum_no}`, 'left')}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium text-white transition-all hover:opacity-90 flex-1 justify-end group"
                style={{ background: `linear-gradient(135deg,${themeConfig.accent},${themeConfig.accent}cc)` }}
              >
                <div className="min-w-0 text-right">
                  <p className="text-xs mb-0.5 opacity-70">Sonraki</p>
                  <p className="truncate text-sm">{nextChapter.baslik}</p>
                </div>
                <ChevronRight style={{ width: 16, height: 16, flexShrink: 0 }}
                  className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : (
              <button
                onClick={() => router.push(`/story/${storySlug}`)}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium text-white transition-all hover:opacity-90 flex-1 justify-end"
                style={{ background: 'linear-gradient(135deg,#2d9f6a,#3dbd82)' }}
              >
                <span>Hikayeye Dön</span>
                <ChevronRight style={{ width: 16, height: 16, flexShrink: 0 }} />
              </button>
            )}
          </div>

          {/* Hint */}
          <p className="text-center text-[10px] mt-5 opacity-30" style={{ color: themeConfig.muted }}>
            ← → tuşları veya sola/sağa kaydır
          </p>
        </div>
      </div>

      {/* --- WATT-STYLE INLINE COMMENTS SIDEBAR DRAWER --- */}
      {activeParagraphIndex !== null && (
        <div className="fixed inset-0 z-[100] flex justify-end animate-fade-in">
          {/* Backdrop Overlay */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setActiveParagraphIndex(null)}
          />

          {/* Drawer Body Panel */}
          <div
            style={{
              backgroundColor: themeConfig.surface,
              color:           themeConfig.text,
              borderColor:     themeConfig.border,
            }}
            className="relative w-full max-w-md h-full flex flex-col shadow-2xl border-l z-10 animate-slide-in"
          >
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: themeConfig.border }}>
              <div className="flex items-center gap-2">
                <MessageCircle style={{ width: 18, height: 18 }} className="text-[var(--accent)]" />
                <h3 className="font-display text-lg font-bold">Satır Yorumları</h3>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${themeConfig.accent}15`, color: themeConfig.accent }}>
                  #{activeParagraphIndex + 1}
                </span>
              </div>
              <button
                onClick={() => setActiveParagraphIndex(null)}
                className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                style={{ color: themeConfig.muted }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Scrollable Comments Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingComments ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                  <Loader2 style={{ width: 24, height: 24 }} className="animate-spin text-[var(--accent)]" />
                  <p className="text-xs" style={{ color: themeConfig.muted }}>Yorumlar yükleniyor...</p>
                </div>
              ) : activeParagraphComments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                  <MessageCircle style={{ width: 36, height: 36 }} className="opacity-20" />
                  <div>
                    <p className="text-sm font-semibold">Bu satırda henüz yorum yok</p>
                    <p className="text-xs mt-1" style={{ color: themeConfig.muted }}>İlk yorumu sen yazarak okuma deneyimini paylaş!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {activeParagraphComments.map(c => {
                    const isOwn = c.yazar_id === myId
                    return (
                      <div key={c.id} className="space-y-3">
                        {/* Parent Comment */}
                        <div className="flex gap-3">
                          <CommentAvatar p={c.profiles} size={32} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className="text-xs font-bold truncate">
                                {c.profiles.display_name || c.profiles.username}
                              </span>
                              {c.profiles.is_verified && (
                                <VerifiedBadge size={10} badge={c.profiles.verification_badge || 'author'} />
                              )}
                              <span className="text-[10px] opacity-60">
                                {format(new Date(c.created_at), lang === 'tr' ? 'd MMM, HH:mm' : 'MMM d, h:mm a', { locale })}
                              </span>
                            </div>
                            <p className="text-xs leading-relaxed" style={{ color: themeConfig.muted }}>
                              {c.icerik}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              {myId && (
                                <button
                                  onClick={() => setReplyTo({ id: c.id, name: c.profiles.display_name || c.profiles.username })}
                                  className="text-[10px] font-semibold opacity-60 hover:opacity-100 hover:text-[var(--accent)] transition-all"
                                >
                                  ↩ Cevapla
                                </button>
                              )}
                              {isOwn && (
                                <button
                                  onClick={() => deleteComment(c.id)}
                                  className="text-[10px] font-semibold text-red-400 opacity-60 hover:opacity-100 transition-all ml-auto"
                                >
                                  🗑 Sil
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Child Replies */}
                        {c.replies && c.replies.length > 0 && (
                          <div className="pl-4 border-l ml-4 space-y-3" style={{ borderColor: themeConfig.border }}>
                            {c.replies.map(r => {
                              const isOwnReply = r.yazar_id === myId
                              return (
                                <div key={r.id} className="flex gap-2">
                                  <CommentAvatar p={r.profiles} size={24} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                      <span className="text-[10px] font-bold truncate">
                                        {r.profiles.display_name || r.profiles.username}
                                      </span>
                                      {r.profiles.is_verified && (
                                        <VerifiedBadge size={9} badge={r.profiles.verification_badge || 'author'} />
                                      )}
                                      <span className="text-[9px] opacity-60">
                                        {format(new Date(r.created_at), lang === 'tr' ? 'd MMM' : 'MMM d', { locale })}
                                      </span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed" style={{ color: themeConfig.muted }}>
                                      {r.icerik}
                                    </p>
                                    {isOwnReply && (
                                      <button
                                        onClick={() => deleteComment(r.id)}
                                        className="text-[9px] text-red-400 opacity-60 hover:opacity-100 transition-all"
                                      >
                                        🗑 Sil
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Input Form at Bottom */}
            <div className="p-4 border-t" style={{ borderColor: themeConfig.border }}>
              {replyTo && (
                <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-lg text-xs font-semibold" style={{ backgroundColor: `${themeConfig.accent}15`, color: themeConfig.accent }}>
                  <span>↩ {replyTo.name} için yanıt yazılıyor...</span>
                  <button onClick={() => setReplyTo(null)} className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              )}

              {myId ? (
                <div className="flex items-end gap-2 border rounded-2xl p-2" style={{ borderColor: themeConfig.border }}>
                  <textarea
                    rows={1}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={replyTo ? 'Yanıtınızı yazın...' : 'Bu satıra bir yorum ekle...'}
                    className="flex-1 resize-none bg-transparent text-xs outline-none placeholder:opacity-50 max-h-24 p-1"
                    style={{ color: themeConfig.text }}
                  />
                  <button
                    onClick={send}
                    disabled={!text.trim() || sendingComment}
                    className="p-2 rounded-xl text-white hover:scale-105 transition-all disabled:opacity-40 disabled:scale-100 flex-shrink-0"
                    style={{ background: `linear-gradient(135deg,#d4840f,#e8a030)` }}
                  >
                    {sendingComment ? (
                      <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                    ) : (
                      <Send style={{ width: 14, height: 14 }} />
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center py-2 text-xs" style={{ color: themeConfig.muted }}>
                  Yorum yapmak için{' '}
                  <Link href="/login" className="font-semibold underline" style={{ color: themeConfig.accent }}>
                    giriş yapmalısınız
                  </Link>
                  .
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
