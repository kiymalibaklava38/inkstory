'use client'

import { useEffect, useRef } from 'react'
import { BookOpen } from 'lucide-react'
import { useLang } from '@/lib/i18n'

interface Props {
  storyId:    string
  storySlug:  string
  storyTitle: string
  chapterNo:  number
  totalChapters: number
}

export function ReadingProgressTracker({
  storyId, storySlug, storyTitle, chapterNo, totalChapters
}: Props) {
  const { lang } = useLang()
  const saved = useRef(false)

  // Save progress after 5 seconds (real read)
  useEffect(() => {
    if (saved.current) return
    const timer = setTimeout(async () => {
      try {
        await fetch('/api/reading-progress', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            hikaye_id:   storyId,
            bolum_no:    chapterNo,
            total_bolum: totalChapters,
          }),
        })
        saved.current = true
      } catch {}
    }, 5000)
    return () => clearTimeout(timer)
  }, [storyId, chapterNo, totalChapters])

  const pct = Math.round((chapterNo / totalChapters) * 100)
  const isFinished = chapterNo >= totalChapters

  return (
    <div className="sticky top-0 z-30 bg-[var(--bg)]/95 backdrop-blur-sm border-b border-[var(--border)]">
      {/* Progress bar */}
      <div className="h-0.5 w-full bg-[var(--border)]">
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: isFinished
              ? 'linear-gradient(90deg,#2d9f6a,#3dbd82)'
              : 'linear-gradient(90deg,#d4840f,#e8a030)',
          }}
        />
      </div>

      {/* Chapter info */}
      <div className="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen style={{ width: 14, height: 14 }} className="text-[var(--accent)] flex-shrink-0" />
          <span className="text-xs text-[var(--fg-muted)] truncate hidden sm:block max-w-[200px]">
            {storyTitle}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Chapter dots */}
          <div className="flex items-center gap-1 hidden md:flex">
            {Array.from({ length: Math.min(totalChapters, 10) }).map((_, i) => {
              const dotChapter = Math.round((i / Math.min(totalChapters - 1, 9)) * (totalChapters - 1)) + 1
              const isRead = dotChapter <= chapterNo
              const isCurrent = dotChapter === chapterNo
              return (
                <div
                  key={i}
                  className={`rounded-full transition-all ${isCurrent ? 'w-3 h-3' : 'w-2 h-2'}`}
                  style={{
                    background: isCurrent
                      ? '#d4840f'
                      : isRead
                        ? '#d4840f60'
                        : 'var(--border)',
                  }}
                />
              )
            })}
          </div>

          {/* Text info */}
          <span className="text-xs font-medium text-[var(--fg)]">
            {lang === 'tr'
              ? `${chapterNo}/${totalChapters} Bölüm`
              : `Chapter ${chapterNo}/${totalChapters}`}
          </span>

          {/* Percentage */}
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background: isFinished ? 'rgba(45,159,106,0.15)' : 'rgba(212,132,15,0.15)',
              color: isFinished ? '#3dbd82' : '#d4840f',
            }}
          >
            {isFinished ? (lang === 'tr' ? '✓ Tamamlandı' : '✓ Done') : `%${pct}`}
          </span>
        </div>
      </div>
    </div>
  )
}
