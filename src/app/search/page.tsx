'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StoryCard } from '@/components/hikaye/StoryCard'
import { useLang } from '@/lib/i18n'
import { Search, Loader2, X } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'

const GENRES = {
  en: [
    { emoji: '💕', label: 'Romance',    slug: 'romantik' },
    { emoji: '🧙', label: 'Fantasy',    slug: 'fantastik' },
    { emoji: '👻', label: 'Horror',     slug: 'korku' },
    { emoji: '🔍', label: 'Mystery',    slug: 'gizem' },
    { emoji: '🚀', label: 'Sci-Fi',     slug: 'bilim-kurgu' },
    { emoji: '⚔️', label: 'Adventure',  slug: 'macera' },
    { emoji: '✍️', label: 'Poetry',     slug: 'siir' },
    { emoji: '🏛️', label: 'Historical', slug: 'tarihi' },
  ],
  tr: [
    { emoji: '💕', label: 'Romantik',    slug: 'romantik' },
    { emoji: '🧙', label: 'Fantastik',   slug: 'fantastik' },
    { emoji: '👻', label: 'Korku',       slug: 'korku' },
    { emoji: '🔍', label: 'Gizem',       slug: 'gizem' },
    { emoji: '🚀', label: 'Bilim Kurgu', slug: 'bilim-kurgu' },
    { emoji: '⚔️', label: 'Macera',      slug: 'macera' },
    { emoji: '✍️', label: 'Şiir',        slug: 'siir' },
    { emoji: '🏛️', label: 'Tarihi',      slug: 'tarihi' },
  ],
}

export default function SearchPage() {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<any[]>([])
  const [loading, setLoading]   = useState(false)
  const [searched, setSearched] = useState(false)
  const supabase     = createClient()
  const { t, lang }  = useLang()
  const searchParams = useSearchParams()
  const router       = useRouter()

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) { setQuery(q); doSearch(q) }
  }, [])

  const doSearch = async (q: string) => {
    if (!q.trim()) return
    setLoading(true); setSearched(true)

    const { data } = await supabase
      .from('hikayeler')
      .select('*, profiles(id,username,display_name,avatar_url), kategoriler(id,ad,slug,renk,ikon)')
      .in('durum', ['yayinda', 'tamamlandi'])
      .or(`baslik.ilike.%${q}%,aciklama.ilike.%${q}%`)
      .order('goruntuleme', { ascending: false })
      .limit(24)

    setResults(data || [])
    setLoading(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`)
      doSearch(query)
    }
  }

  const clear = () => { setQuery(''); setResults([]); setSearched(false); router.push('/search') }

  const genres = GENRES[lang]

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl font-bold text-[var(--fg)] mb-3">{t.searchTitle}</h1>
        <p className="text-[var(--fg-muted)]">{t.searchDesc}</p>
      </div>

      {/* Search box */}
      <form onSubmit={handleSubmit} className="relative mb-10">
        <Search style={{ width: 18, height: 18 }} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          autoFocus
          className="w-full pl-14 pr-14 py-4 rounded-2xl border-2 border-[var(--border)] bg-[var(--card)] text-[var(--fg)] text-lg placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] transition-all"
        />
        {query && (
          <button type="button" onClick={clear}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] hover:text-[var(--fg)]">
            <X style={{ width: 18, height: 18 }} />
          </button>
        )}
      </form>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 style={{ width: 28, height: 28 }} className="animate-spin text-[var(--accent)]" />
        </div>
      ) : searched ? (
        results.length > 0 ? (
          <div>
            <p className="text-sm text-[var(--fg-muted)] mb-5">
              <strong className="text-[var(--fg)]">{results.length}</strong> {t.resultsFor} "<em>{query}</em>"
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {results.map(s => <StoryCard key={s.id} story={s} lang={lang} />)}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🔍</p>
            <p className="font-display text-xl text-[var(--fg)]">{t.noResults}</p>
            <p className="text-[var(--fg-muted)] mt-2 text-sm">"{query}" — {t.noResultsDesc}</p>
          </div>
        )
      ) : (
        <div>
          <p className="text-sm text-[var(--fg-muted)] mb-4 font-medium">
            {lang === 'tr' ? 'Türe göre keşfet' : 'Browse by genre'}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {genres.map(({ emoji, label, slug }) => (
              <button key={slug}
                onClick={() => { setQuery(label); doSearch(label) }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/50 hover:bg-[var(--bg-subtle)] transition-all text-sm font-medium text-[var(--fg)]">
                <span className="text-xl">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
