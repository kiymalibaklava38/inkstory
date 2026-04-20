'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, List, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ReadingModeToggle, READING_THEMES, ReadMode } from './ReadingModeToggle'

interface Props {
  storySlug:    string
  chapterNo:    number
  chapterTitle: string
  content:      string
  prevChapter:  { bolum_no: number; baslik: string } | null
  nextChapter:  { bolum_no: number; baslik: string } | null
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

export function PageTurnReader({ storySlug, chapterNo, chapterTitle, content, prevChapter, nextChapter }: Props) {
  const router = useRouter()

  const [theme, setTheme]         = useState<ReadMode>('dark')
  const [fontSizeIdx, setFontSizeIdx]   = useState(1) // default: Orta
  const [fontFamilyIdx, setFontFamilyIdx] = useState(0) // default: Lora
  const [showSettings, setShowSettings]   = useState(false)
  const [anim, setAnim]                   = useState<'left' | 'right' | null>(null)
  const [entered, setEntered]             = useState(false)
  const contentRef                        = useRef<HTMLDivElement>(null)

  const t = READING_THEMES[theme]

  // Load saved preferences
  useEffect(() => {
    const savedTheme  = localStorage.getItem('inkstory-read-mode') as ReadMode | null
    const savedFontSz = localStorage.getItem('inkstory-font-size')
    const savedFontFm = localStorage.getItem('inkstory-font-family')
    if (savedTheme  && READING_THEMES[savedTheme]) setTheme(savedTheme)
    if (savedFontSz) setFontSizeIdx(Number(savedFontSz))
    if (savedFontFm) setFontFamilyIdx(Number(savedFontFm))
    setTimeout(() => setEntered(true), 30)
  }, [])

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

  // Keyboard nav
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && nextChapter)
        navigate(`/story/${storySlug}/chapter/${nextChapter.bolum_no}`, 'left')
      if (e.key === 'ArrowLeft' && prevChapter)
        navigate(`/story/${storySlug}/chapter/${prevChapter.bolum_no}`, 'right')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [navigate, nextChapter, prevChapter, storySlug])

  // Touch swipe
  useEffect(() => {
    let startX = 0
    const el = contentRef.current
    if (!el) return
    const onStart = (e: TouchEvent) => { startX = e.touches[0].clientX }
    const onEnd   = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX
      if (Math.abs(dx) < 60) return
      if (dx < 0 && nextChapter) navigate(`/story/${storySlug}/chapter/${nextChapter.bolum_no}`, 'left')
      if (dx > 0 && prevChapter) navigate(`/story/${storySlug}/chapter/${prevChapter.bolum_no}`, 'right')
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => { el.removeEventListener('touchstart', onStart); el.removeEventListener('touchend', onEnd) }
  }, [navigate, nextChapter, prevChapter, storySlug])

  const fs = FONT_SIZES[fontSizeIdx]
  const ff = FONT_FAMILIES[fontFamilyIdx]

  return (
    <>
      <style>{`
        @keyframes pageLeft  { 0%{transform:translateX(0);opacity:1} 100%{transform:translateX(-4%);opacity:0} }
        @keyframes pageRight { 0%{transform:translateX(0);opacity:1} 100%{transform:translateX(4%);opacity:0} }
        @keyframes pageEnter { 0%{transform:translateX(2%);opacity:0} 100%{transform:translateX(0);opacity:1} }
        .anim-left  { animation: pageLeft  0.32s ease forwards; }
        .anim-right { animation: pageRight 0.32s ease forwards; }
        .anim-enter { animation: pageEnter 0.38s ease forwards; }

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
        style={{ backgroundColor: t.bg, minHeight: '100vh' }}
        className="transition-colors duration-300"
      >
        {/* Top toolbar */}
        <div
          className="sticky top-0 z-50 px-4 py-3 border-b flex items-center justify-between gap-3"
          style={{ backgroundColor: t.surface, borderColor: t.border }}
        >
          {/* Back to story */}
          <button
            onClick={() => router.push(`/story/${storySlug}`)}
            className="flex items-center gap-2 text-sm font-medium transition-colors min-w-0 flex-1"
            style={{ color: t.muted }}
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
              style={{ borderColor: t.border, backgroundColor: showSettings ? `${t.accent}20` : t.surface, color: showSettings ? t.accent : t.muted }}
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
            style={{ backgroundColor: t.surface, borderColor: t.border }}
          >
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Font size */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: t.muted }}>Yazı Boyutu</p>
                <div className="flex gap-2">
                  {FONT_SIZES.map((f, i) => (
                    <button key={i} onClick={() => saveFontSize(i)}
                      className="flex-1 py-2 rounded-lg text-xs font-medium border transition-all"
                      style={{
                        borderColor: fontSizeIdx === i ? t.accent : t.border,
                        backgroundColor: fontSizeIdx === i ? `${t.accent}15` : 'transparent',
                        color: fontSizeIdx === i ? t.accent : t.muted,
                        fontSize: ['13px','14px','15px','16px'][i],
                      }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Font family */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: t.muted }}>Yazı Tipi</p>
                <div className="flex gap-2">
                  {FONT_FAMILIES.map((f, i) => (
                    <button key={i} onClick={() => saveFontFamily(i)}
                      className="flex-1 py-2 rounded-lg text-xs font-medium border transition-all"
                      style={{
                        borderColor: fontFamilyIdx === i ? t.accent : t.border,
                        backgroundColor: fontFamilyIdx === i ? `${t.accent}15` : 'transparent',
                        color: fontFamilyIdx === i ? t.accent : t.muted,
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
              style={{ color: t.accent }}>
              Bölüm {chapterNo}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-8"
              style={{ color: t.text, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              {chapterTitle}
            </h1>
            <div className="flex items-center justify-center gap-4" style={{ color: t.muted }}>
              <div className="h-px w-16" style={{ backgroundColor: t.border }} />
              <span className="text-lg opacity-60">✦</span>
              <div className="h-px w-16" style={{ backgroundColor: t.border }} />
            </div>
          </div>

          {/* Story text */}
          <div
            className="story-prose"
            style={{
              fontSize:   fs.size,
              lineHeight: fs.lineH,
              fontFamily: ff.value,
              color:      t.text,
            }}
            dangerouslySetInnerHTML={{ __html: content }}
          />

          {/* End ornament */}
          <div className="text-center mt-16 sm:mt-24 mb-12">
            <div className="flex items-center justify-center gap-4" style={{ color: t.muted, opacity: 0.4 }}>
              <div className="h-px w-20" style={{ backgroundColor: 'currentColor' }} />
              <span className="text-2xl">✦</span>
              <div className="h-px w-20" style={{ backgroundColor: 'currentColor' }} />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-stretch gap-3 mt-8 pt-6 border-t" style={{ borderColor: t.border }}>
            {prevChapter ? (
              <button
                onClick={() => navigate(`/story/${storySlug}/chapter/${prevChapter.bolum_no}`, 'right')}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl border text-sm font-medium transition-all flex-1 group"
                style={{ borderColor: t.border, backgroundColor: t.surface, color: t.text }}
              >
                <ChevronLeft style={{ width: 16, height: 16, flexShrink: 0 }}
                  className="group-hover:-translate-x-0.5 transition-transform" />
                <div className="min-w-0 text-left">
                  <p className="text-xs mb-0.5" style={{ color: t.muted }}>Önceki</p>
                  <p className="truncate text-sm">{prevChapter.baslik}</p>
                </div>
              </button>
            ) : <div className="flex-1" />}

            <button
              onClick={() => router.push(`/story/${storySlug}`)}
              className="flex-shrink-0 p-3 rounded-2xl border transition-all"
              style={{ borderColor: t.border, backgroundColor: t.surface, color: t.muted }}
              title="İçindekiler"
            >
              <List style={{ width: 18, height: 18 }} />
            </button>

            {nextChapter ? (
              <button
                onClick={() => navigate(`/story/${storySlug}/chapter/${nextChapter.bolum_no}`, 'left')}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium text-white transition-all hover:opacity-90 flex-1 justify-end group"
                style={{ background: `linear-gradient(135deg,${t.accent},${t.accent}cc)` }}
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
          <p className="text-center text-[10px] mt-5 opacity-30" style={{ color: t.muted }}>
            ← → tuşları veya sola/sağa kaydır
          </p>
        </div>
      </div>
    </>
  )
}
