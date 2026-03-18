'use client'

import Link from 'next/link'
import { StoryCard } from '@/components/hikaye/StoryCard'
import { CategoryPills } from '@/components/ui/CategoryPills'
import { Search } from 'lucide-react'
import { useLang } from '@/lib/i18n'

interface Props {
  stories: any[]
  categories: any[]
  count: number
  category?: string
  sort: string
  pageNo: number
  totalPages: number
}

export function StoriesClient({ stories, categories, count, category, sort, pageNo, totalPages }: Props) {
  const { t, lang } = useLang()
  const activeCategory = categories.find(c => c.slug === category)

  const CATEGORY_NAMES: Record<string, Record<string, string>> = {
    romantik:      { en: 'Romance',    tr: 'Romantik' },
    fantastik:     { en: 'Fantasy',    tr: 'Fantastik' },
    korku:         { en: 'Horror',     tr: 'Korku' },
    gizem:         { en: 'Mystery',    tr: 'Gizem' },
    'bilim-kurgu': { en: 'Sci-Fi',     tr: 'Bilim Kurgu' },
    macera:        { en: 'Adventure',  tr: 'Macera' },
    siir:          { en: 'Poetry',     tr: 'Şiir' },
    tarihi:        { en: 'Historical', tr: 'Tarihi' },
  }

  const catLabel = activeCategory
    ? `${activeCategory.ikon} ${CATEGORY_NAMES[activeCategory.slug]?.[lang] ?? activeCategory.ad}`
    : t.discoverStories

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-4xl font-bold text-[var(--fg)]">{catLabel}</h1>
          <p className="text-[var(--fg-muted)] mt-1">{count} {t.storiesFound}</p>
        </div>
        <Link href="/search"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--accent)]/50 transition-all">
          <Search style={{ width: 15, height: 15 }} />
          {t.searchStories}
        </Link>
      </div>

      {/* Category pills */}
      <div className="mb-6">
        <CategoryPills categories={categories} lang={lang} selected={category} />
      </div>

      {/* Sort tabs */}
      <div className="flex gap-1 mb-8 border-b border-[var(--border)]">
        {[
          { id: 'new',     label: t.newest },
          { id: 'popular', label: t.popular },
        ].map(s => (
          <Link key={s.id}
            href={`/stories?${category ? `category=${category}&` : ''}sort=${s.id}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
              sort === s.id
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}>
            {s.label}
          </Link>
        ))}
      </div>

      {/* Grid */}
      {stories && stories.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 stagger">
          {stories.map((s: any) => <StoryCard key={s.id} story={s} lang={lang} />)}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">📭</p>
          <p className="font-display text-xl text-[var(--fg)]">{t.noStories}</p>
          <p className="text-[var(--fg-muted)] mt-2">{t.beFirst}</p>
          <Link href="/write"
            className="inline-block mt-6 px-6 py-2.5 rounded-full text-sm font-medium text-white hover:scale-105 transition-all"
            style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
            {t.startWriting}
          </Link>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-12">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Link key={p}
              href={`/stories?${category ? `category=${category}&` : ''}sort=${sort}&page=${p}`}
              className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium border transition-all ${
                p === pageNo
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent)]/50 hover:text-[var(--fg)]'
              }`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
