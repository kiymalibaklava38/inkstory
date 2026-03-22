'use client'

import { useState, useEffect, Suspense } from 'react' // 1. Suspense eklendi
import { createClient } from '@/lib/supabase/client'
import { StoryCard } from '@/components/hikaye/StoryCard'
import { VerifiedBadge } from '@/components/ui/VerifiedBadge'
import { useLang } from '@/lib/i18n'
import { Search, Loader2, TrendingUp, Flame, Sparkles, BadgeCheck, Zap, Star } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ALL_CATEGORIES } from '@/lib/categories'

// 2. Tüm ana içeriği yeni bir iç bileşene taşıyoruz
function DiscoverContent() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [discovery, setDiscovery] = useState<any>(null)
  const [discLoading, setDiscLoading] = useState(true)
  
  const searchParams = useSearchParams()
  const router = useRouter()
  const { lang } = useLang()

  const catParam = searchParams.get('category')

  useEffect(() => {
    fetch('/api/discovery')
      .then(r => r.json())
      .then(d => { setDiscovery(d); setDiscLoading(false) })
      .catch(() => setDiscLoading(false))
  }, [])

  useEffect(() => {
    const q = searchParams.get('q') || ''
    setQuery(q)
    if (!q && !catParam) return

    setSearching(true)
    const supabase = createClient()

    const run = async () => {
      let query2 = supabase
        .from('hikayeler')
        .select('*, profiles(id,username,display_name,avatar_url,is_premium,is_verified,verification_badge), kategoriler(id,ad,slug,renk,ikon)')
        .in('durum', ['yayinda', 'tamamlandi'])
        .limit(20)

      if (q) query2 = query2.ilike('baslik', `%${q}%`)
      if (catParam) {
        const { data: cat } = await supabase.from('kategoriler').select('id').eq('slug', catParam).single()
        if (cat) query2 = query2.eq('kategori_id', cat.id)
      }

      const { data } = await query2.order('goruntuleme', { ascending: false })
      setResults(data || [])
      setSearching(false)
    }
    run()
  }, [searchParams])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  const isSearchMode = !!(searchParams.get('q') || catParam)
  const genres = ALL_CATEGORIES.slice(0, 11)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Search bar */}
      <div className="mb-8">
        <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
          <Search style={{ width: 18, height: 18 }} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={lang === 'tr' ? 'Hikaye, yazar veya kategori ara...' : 'Search stories, authors or categories...'}
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] text-sm transition-all"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(''); router.push('/search') }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] hover:text-[var(--fg)]">✕</button>
          )}
        </form>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {genres.map(cat => (
          <Link key={cat.slug} href={`/search?category=${cat.slug}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              catParam === cat.slug
                ? 'text-white border-transparent'
                : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent)]/40 hover:text-[var(--fg)]'
            }`}
            style={catParam === cat.slug ? { background: `linear-gradient(135deg,${cat.renk}dd,${cat.renk}99)` } : {}}
          >
            {cat.ikon} {lang === 'tr' ? cat.tr : cat.en}
          </Link>
        ))}
      </div>

      {isSearchMode ? (
        <div>
          <h2 className="font-display text-xl font-bold text-[var(--fg)] mb-5">
            {catParam
              ? `${ALL_CATEGORIES.find(c => c.slug === catParam)?.ikon} ${ALL_CATEGORIES.find(c => c.slug === catParam)?.[lang] || catParam}`
              : `"${searchParams.get('q')}" ${lang === 'tr' ? 'için sonuçlar' : 'results'}`}
          </h2>
          {searching ? (
            <div className="flex justify-center py-16"><Loader2 style={{ width: 24, height: 24 }} className="animate-spin text-[var(--accent)]" /></div>
          ) : results.length === 0 ? (
            <div className="text-center py-16 text-[var(--fg-muted)]">
              <p className="text-4xl mb-3">🔍</p>
              <p>{lang === 'tr' ? 'Sonuç bulunamadı.' : 'No results found.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {results.map(s => <StoryCard key={s.id} story={s} lang={lang} />)}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-12">
          {/* Discovery sections (Daily Pick, Verified, etc.) - Mevcut kodunun devamı buraya gelecek */}
          {!discLoading && discovery?.dailyPick && (
            <section>
              <h2 className="font-display text-2xl font-bold text-[var(--fg)] flex items-center gap-2 mb-5">
                <Star style={{ width: 22, height: 22 }} className="text-amber-400" />
                {lang === 'tr' ? 'Günün Seçimi' : "Editor's Pick Today"}
              </h2>
              {/* ... DailyPick Kartı ... */}
              <div className="relative rounded-2xl overflow-hidden border border-amber-500/30"
                style={{ background: 'linear-gradient(135deg,rgba(212,132,15,0.08),rgba(212,132,15,0.03))' }}>
                <div className="flex flex-col md:flex-row gap-6 p-6">
                  {discovery.dailyPick.kapak_url && (
                    <img src={discovery.dailyPick.kapak_url} alt=""
                      className="w-full md:w-48 h-48 md:h-auto rounded-xl object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                        style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                        ⭐ {lang === 'tr' ? 'Günün Seçimi' : "Today's Pick"}
                      </span>
                    </div>
                    <Link href={`/story/${discovery.dailyPick.slug}`}
                      className="font-display text-2xl font-bold text-[var(--fg)] hover:text-[var(--accent)] transition-colors block mb-2">
                      {discovery.dailyPick.baslik}
                    </Link>
                    {discovery.dailyPick.aciklama && (
                      <p className="text-[var(--fg-muted)] text-sm mb-4 line-clamp-2">{discovery.dailyPick.aciklama}</p>
                    )}
                    <div className="flex items-center gap-2">
                      {discovery.dailyPick.profiles?.avatar_url ? (
                        <img src={discovery.dailyPick.profiles.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                          {(discovery.dailyPick.profiles?.display_name || discovery.dailyPick.profiles?.username || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm text-[var(--fg-muted)]">
                        {discovery.dailyPick.profiles?.display_name || discovery.dailyPick.profiles?.username}
                      </span>
                      {discovery.dailyPick.profiles?.is_verified && (
                        <VerifiedBadge size={14} badge={discovery.dailyPick.profiles.verification_badge} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {!discLoading && discovery?.verifiedStories?.length > 0 && (
            <section>
              <h2 className="font-display text-2xl font-bold text-[var(--fg)] flex items-center gap-2 mb-5">
                <BadgeCheck style={{ width: 22, height: 22 }} className="text-[var(--accent)]" fill="#d4840f" color="white" />
                {lang === 'tr' ? 'Doğrulanmış Yazarların Eserleri' : 'From Verified Authors'}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {discovery.verifiedStories.map((s: any) => <StoryCard key={s.id} story={s} lang={lang} />)}
              </div>
            </section>
          )}

          {!discLoading && discovery?.risingStories?.length > 0 && (
            <section>
              <h2 className="font-display text-2xl font-bold text-[var(--fg)] flex items-center gap-2 mb-5">
                <Zap style={{ width: 22, height: 22 }} className="text-yellow-400" />
                {lang === 'tr' ? 'Yükselen Kalemler' : 'Rising Writers'}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {discovery.risingStories.map((s: any) => (
                  <div key={s.id} className="relative">
                    <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold text-white flex items-center gap-1"
                      style={{ background: 'linear-gradient(135deg,#f59e0b,#fbbf24)' }}>
                      <Zap style={{ width: 9, height: 9 }} />
                      {lang === 'tr' ? 'Yükselen' : 'Rising'}
                    </div>
                    <StoryCard story={s} lang={lang} />
                  </div>
                ))}
              </div>
            </section>
          )}
          
          {discLoading && (
            <div className="flex justify-center py-20">
              <Loader2 style={{ width: 28, height: 28 }} className="animate-spin text-[var(--accent)]" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// 3. Ana export bileşeni Suspense ile sarmalıyoruz
export default function DiscoverPage() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto px-4 py-20 flex justify-center">
        <Loader2 className="animate-spin text-[var(--accent)]" size={40} />
      </div>
    }>
      <DiscoverContent />
    </Suspense>
  )
}