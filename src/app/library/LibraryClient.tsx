'use client'
import Link from 'next/link'
import { StoryCard } from '@/components/hikaye/StoryCard'
import { BookMarked } from 'lucide-react'
import { useLang } from '@/lib/i18n'

export function LibraryClient({ stories }: { stories: any[] }) {
  const { t, lang } = useLang()
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
          <BookMarked style={{ width: 18, height: 18 }} className="text-white" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--fg)]">{t.myLibraryTitle}</h1>
          <p className="text-[var(--fg-muted)] text-sm">{stories.length} {t.savedStories}</p>
        </div>
      </div>

      {stories.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {stories.map((s: any) => <StoryCard key={s.id} story={s} lang={lang} />)}
        </div>
      ) : (
        <div className="text-center py-20 rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <BookMarked style={{ width: 40, height: 40 }} className="text-[var(--border)] mx-auto mb-4" />
          <p className="font-display text-xl text-[var(--fg)]">{t.libraryEmpty}</p>
          <p className="text-[var(--fg-muted)] mt-2 text-sm">{t.libraryEmptyDesc}</p>
          <Link href="/stories"
            className="inline-block mt-6 px-6 py-2.5 rounded-full text-sm font-medium text-white hover:scale-105 transition-all"
            style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
            {t.exploreStories}
          </Link>
        </div>
      )}
    </div>
  )
}
