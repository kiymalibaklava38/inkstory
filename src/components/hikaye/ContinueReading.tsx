'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BookOpen, Play } from 'lucide-react'
import { useLang } from '@/lib/i18n'

interface Props {
  storyId:    string
  storySlug:  string
  totalChapters: number
}

export function ContinueReading({ storyId, storySlug, totalChapters }: Props) {
  const [progress, setProgress] = useState<{ bolum_no: number; total_bolum: number } | null>(null)
  const [loading, setLoading]   = useState(true)
  const { lang } = useLang()

  useEffect(() => {
    fetch(`/api/reading-progress?hikaye_id=${storyId}`)
      .then(r => r.json())
      .then(d => { setProgress(d.progress); setLoading(false) })
      .catch(() => setLoading(false))
  }, [storyId])

  if (loading || !progress) return null

  const pct      = Math.round((progress.bolum_no / Math.max(progress.total_bolum, totalChapters)) * 100)
  const isFinished = progress.bolum_no >= totalChapters
  const nextChapter = isFinished ? null : progress.bolum_no + 1
  const continueChapter = isFinished ? progress.bolum_no : progress.bolum_no

  return (
    <div className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4 mb-6">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <BookOpen style={{ width: 15, height: 15 }} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold text-[var(--fg)]">
            {isFinished
              ? (lang === 'tr' ? '✓ Tamamladın' : '✓ You finished this!')
              : (lang === 'tr' ? 'Kaldığın Yer' : 'Continue Reading')}
          </span>
        </div>
        <span className="text-xs font-bold text-[var(--accent)]">
          {lang === 'tr'
            ? `${progress.bolum_no}. Bölüm / ${totalChapters} Bölüm`
            : `Ch. ${progress.bolum_no} of ${totalChapters}`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-[var(--border)] rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(pct, 100)}%`,
            background: isFinished
              ? 'linear-gradient(90deg,#2d9f6a,#3dbd82)'
              : 'linear-gradient(90deg,#d4840f,#e8a030)',
          }}
        />
      </div>

      {!isFinished && (
        <Link
          href={`/story/${storySlug}/chapter/${continueChapter}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}
        >
          <Play style={{ width: 14, height: 14 }} fill="white" />
          {lang === 'tr'
            ? `${progress.bolum_no}. Bölümden Devam Et`
            : `Continue from Chapter ${progress.bolum_no}`}
        </Link>
      )}
    </div>
  )
}
