'use client'

import Link from 'next/link'
import type { Lang } from '@/lib/i18n'

// Category name translations keyed by slug
const CATEGORY_NAMES: Record<string, Record<Lang, string>> = {
  romantik:    { en: 'Romance',    tr: 'Romantik' },
  fantastik:   { en: 'Fantasy',    tr: 'Fantastik' },
  korku:       { en: 'Horror',     tr: 'Korku' },
  gizem:       { en: 'Mystery',    tr: 'Gizem' },
  'bilim-kurgu': { en: 'Sci-Fi',   tr: 'Bilim Kurgu' },
  macera:      { en: 'Adventure',  tr: 'Macera' },
  siir:        { en: 'Poetry',     tr: 'Şiir' },
  tarihi:      { en: 'Historical', tr: 'Tarihi' },
}

interface Category {
  id: number; ad: string; slug: string; renk: string; ikon: string
}

interface Props {
  categories: Category[]
  lang: Lang
  selected?: string
  showAll?: boolean
  urlBase?: string
}

export function CategoryPills({
  categories,
  lang,
  selected,
  showAll = true,
  urlBase = '/stories',
}: Props) {
  const getName = (cat: Category) =>
    CATEGORY_NAMES[cat.slug]?.[lang] ?? (lang === 'en' ? cat.ad : cat.ad)

  return (
    <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
      {showAll && (
        <Link
          href={urlBase}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
            !selected
              ? 'bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)]'
              : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent)]/50 hover:text-[var(--fg)]'
          }`}
        >
          {lang === 'tr' ? 'Tümü' : 'All'}
        </Link>
      )}

      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`${urlBase}?category=${cat.slug}`}
          className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all whitespace-nowrap ${
            selected === cat.slug
              ? 'text-white border-transparent'
              : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent)]/50 hover:text-[var(--fg)]'
          }`}
          style={selected === cat.slug ? { backgroundColor: cat.renk } : {}}
        >
          <span>{cat.ikon}</span>
          {getName(cat)}
        </Link>
      ))}
    </div>
  )
}
