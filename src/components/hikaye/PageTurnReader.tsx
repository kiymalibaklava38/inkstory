'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, List } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  storySlug:   string
  chapterNo:   number
  chapterTitle: string
  content:     string
  prevChapter: { bolum_no: number; baslik: string } | null
  nextChapter: { bolum_no: number; baslik: string } | null
}

type AnimDir = 'left' | 'right' | null

export function PageTurnReader({
  storySlug, chapterNo, chapterTitle, content, prevChapter, nextChapter
}: Props) {
  const router   = useRouter()
  const [anim, setAnim]         = useState<AnimDir>(null)
  const [shadow, setShadow]     = useState(false)
  const contentRef              = useRef<HTMLDivElement>(null)

  // Navigate with page-turn effect
  const navigate = useCallback((href: string, dir: AnimDir) => {
    setAnim(dir)
    setShadow(true)
    setTimeout(() => {
      router.push(href)
    }, 380)
  }, [router])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && nextChapter) {
        navigate(`/story/${storySlug}/chapter/${nextChapter.bolum_no}`, 'left')
      }
      if (e.key === 'ArrowLeft' && prevChapter) {
        navigate(`/story/${storySlug}/chapter/${prevChapter.bolum_no}`, 'right')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate, nextChapter, prevChapter, storySlug])

  // Swipe gesture
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
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchend', onEnd)
    }
  }, [navigate, nextChapter, prevChapter, storySlug])

  // Entry animation on mount
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 20)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      {/* CSS for page turn */}
      <style>{`
        @keyframes pageFlipLeft {
          0%   { transform: perspective(1200px) rotateY(0deg);   opacity: 1; }
          50%  { transform: perspective(1200px) rotateY(-25deg); opacity: 0.7; box-shadow: -20px 0 40px rgba(0,0,0,0.4); }
          100% { transform: perspective(1200px) rotateY(-90deg); opacity: 0; }
        }
        @keyframes pageFlipRight {
          0%   { transform: perspective(1200px) rotateY(0deg);  opacity: 1; }
          50%  { transform: perspective(1200px) rotateY(25deg); opacity: 0.7; box-shadow: 20px 0 40px rgba(0,0,0,0.4); }
          100% { transform: perspective(1200px) rotateY(90deg); opacity: 0; }
        }
        @keyframes pageEnter {
          0%   { transform: perspective(1200px) rotateY(8deg) translateX(30px); opacity: 0; }
          100% { transform: perspective(1200px) rotateY(0deg) translateX(0);    opacity: 1; }
        }
        .page-flip-left  { animation: pageFlipLeft  0.38s cubic-bezier(0.4,0,0.2,1) forwards; transform-origin: left center; }
        .page-flip-right { animation: pageFlipRight 0.38s cubic-bezier(0.4,0,0.2,1) forwards; transform-origin: right center; }
        .page-enter      { animation: pageEnter     0.45s cubic-bezier(0.2,0,0.1,1) forwards; transform-origin: left center; }
      `}</style>

      <div
        ref={contentRef}
        className={`relative ${
          anim === 'left'  ? 'page-flip-left'  :
          anim === 'right' ? 'page-flip-right' :
          !entered         ? 'opacity-0'       : 'page-enter'
        }`}
        style={{ willChange: 'transform, opacity' }}
      >
        {/* Book shadow effect */}
        {shadow && (
          <div className="absolute inset-0 bg-black/20 pointer-events-none z-10 rounded-2xl" />
        )}

        {/* Chapter header */}
        <div className="text-center mb-12">
          <p className="text-xs font-medium text-[var(--accent)] uppercase tracking-[0.2em] mb-4">
            Bölüm {chapterNo}
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--fg)] leading-tight mb-6">
            {chapterTitle}
          </h1>
          <div className="flex items-center justify-center gap-3 text-[var(--fg-muted)]">
            <div className="w-12 h-px bg-[var(--border)]" />
            <span className="text-lg opacity-50">✦</span>
            <div className="w-12 h-px bg-[var(--border)]" />
          </div>
        </div>

        {/* Story content */}
        <div
          className="story-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* Chapter end ornament */}
        <div className="text-center mt-20 mb-12">
          <div className="flex items-center justify-center gap-4 text-[var(--fg-muted)] opacity-30">
            <div className="w-20 h-px bg-current" />
            <span className="text-2xl">✦</span>
            <div className="w-20 h-px bg-current" />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4 pt-8 border-t border-[var(--border)]">
          {prevChapter ? (
            <button
              onClick={() => navigate(`/story/${storySlug}/chapter/${prevChapter.bolum_no}`, 'right')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/50 text-sm font-medium text-[var(--fg)] transition-all flex-1 group"
            >
              <ChevronLeft style={{width:16,height:16}} className="flex-shrink-0 group-hover:-translate-x-0.5 transition-transform" />
              <div className="min-w-0">
                <p className="text-xs text-[var(--fg-muted)] mb-0.5">Önceki</p>
                <p className="truncate">{prevChapter.baslik}</p>
              </div>
            </button>
          ) : <div className="flex-1" />}

          <button
            onClick={() => router.push(`/story/${storySlug}`)}
            className="flex-shrink-0 p-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/50 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-all"
            title="İçindekiler"
          >
            <List style={{width:18,height:18}} />
          </button>

          {nextChapter ? (
            <button
              onClick={() => navigate(`/story/${storySlug}/chapter/${nextChapter.bolum_no}`, 'left')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-white transition-all hover:scale-[1.02] flex-1 justify-end group"
              style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}
            >
              <div className="min-w-0 text-right">
                <p className="text-xs text-white/60 mb-0.5">Sonraki</p>
                <p className="truncate">{nextChapter.baslik}</p>
              </div>
              <ChevronRight style={{width:16,height:16}} className="flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ) : (
            <button
              onClick={() => router.push(`/story/${storySlug}`)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-white transition-all hover:scale-[1.02] flex-1 justify-end"
              style={{ background: 'linear-gradient(135deg,#2d9f6a,#3dbd82)' }}
            >
              <span>Hikayeye Dön</span>
              <ChevronRight style={{width:16,height:16}} className="flex-shrink-0" />
            </button>
          )}
        </div>

        {/* Keyboard hint */}
        <p className="text-center text-[10px] text-[var(--fg-muted)] mt-6 opacity-40">
          ← → tuşları veya kaydırarak sayfa çevir
        </p>
      </div>
    </>
  )
}
