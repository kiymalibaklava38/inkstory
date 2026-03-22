'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Sparkles, BookOpen, Heart, TrendingUp, Clock, Settings } from 'lucide-react'
import { useLang } from '@/lib/i18n'
import { InterestPicker } from '@/components/personalization/InterestPicker'
import { StoryCard } from '@/components/hikaye/StoryCard'
import { getCategoryName, getCategoryBySlug } from '@/lib/categories'
import { createClient } from '@/lib/supabase/client'

interface Story {
  id: string; baslik: string; slug: string; aciklama?: string
  kapak_url?: string; goruntuleme: number; durum: string
  is_featured?: boolean
  profiles: { username: string; display_name: string | null; avatar_url: string | null; is_premium?: boolean }
  kategoriler?: { ad: string; ikon: string; renk: string; slug: string } | null
}

// Loading skeleton
function StoryCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden animate-pulse">
      <div className="h-44 bg-[var(--bg-subtle)]" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-[var(--bg-subtle)] rounded w-3/4" />
        <div className="h-3 bg-[var(--bg-subtle)] rounded w-1/2" />
      </div>
    </div>
  )
}

function Section({ title, icon, stories, lang, loading }: {
  title: string; icon: React.ReactNode; stories: Story[]; lang: 'tr' | 'en'; loading: boolean
}) {
  if (!loading && stories.length === 0) return null
  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-5">
        {icon}
        <h2 className="font-display text-xl font-bold text-[var(--fg)]">{title}</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StoryCardSkeleton key={i} />)
: (stories as any[]).map((s: any) => (
    <StoryCard key={s.id} story={s} lang={lang} />
  ))        }
      </div>
    </section>
  )
}

export default function SanaOzelPage() {
  const { lang } = useLang()
  const [userPrefs, setUserPrefs]     = useState<string[]>([])
  const [loading, setLoading]         = useState(true)
  const [showPicker, setShowPicker]   = useState(false)
  const [hasUser, setHasUser]         = useState(false)

  const [forYou,    setForYou]    = useState<Story[]>([])
  const [poems,     setPoems]     = useState<Story[]>([])
  const [newest,    setNewest]    = useState<Story[]>([])
  const [popular,   setPopular]   = useState<Story[]>([])

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) { setLoading(false); return }
      setHasUser(true)

      // Tercihleri çek
      const res = await fetch('/api/preferences')
      const data = await res.json()
      const prefs: string[] = data.categories || []

      setUserPrefs(prefs)

      if (prefs.length === 0) {
        setShowPicker(true)
        setLoading(false)
        return
      }

      await loadContent(prefs)
      setLoading(false)
    }
    init()
  }, [])

  const loadContent = async (prefs: string[]) => {
    const supabase = createClient()

    // Kategori ID'lerini bul
    const { data: cats } = await supabase
      .from('kategoriler')
      .select('id, slug')
      .in('slug', prefs)

    const catIds = (cats || []).map(c => c.id)

    // Senin için - tercihlerinle eşleşen, en popüler
    if (catIds.length > 0) {
      const { data } = await supabase
        .from('hikayeler')
        .select('*, profiles(id,username,display_name,avatar_url,is_premium), kategoriler(id,ad,slug,renk,ikon)')
        .in('durum', ['yayinda', 'tamamlandi'])
        .in('kategori_id', catIds)
        .order('goruntuleme', { ascending: false })
        .limit(8)
      setForYou(data || [])
    }

    // Şiirler - tercihlerinde 'siir' varsa veya her zaman göster
    const { data: poemCat } = await supabase
      .from('kategoriler').select('id').eq('slug', 'siir').single()
    if (poemCat) {
      const { data } = await supabase
        .from('hikayeler')
        .select('*, profiles(id,username,display_name,avatar_url,is_premium), kategoriler(id,ad,slug,renk,ikon)')
        .in('durum', ['yayinda', 'tamamlandi'])
        .eq('kategori_id', poemCat.id)
        .order('goruntuleme', { ascending: false })
        .limit(4)
      setPoems(data || [])
    }

    // Yeni eklenenler - tercihlerle eşleşen
    if (catIds.length > 0) {
      const { data } = await supabase
        .from('hikayeler')
        .select('*, profiles(id,username,display_name,avatar_url,is_premium), kategoriler(id,ad,slug,renk,ikon)')
        .in('durum', ['yayinda', 'tamamlandi'])
        .in('kategori_id', catIds)
        .order('created_at', { ascending: false })
        .limit(4)
      setNewest(data || [])
    }

    // Popüler — genel (tercih bağımsız)
    const { data: pop } = await supabase
      .from('hikayeler')
      .select('*, profiles(id,username,display_name,avatar_url,is_premium), kategoriler(id,ad,slug,renk,ikon)')
      .in('durum', ['yayinda', 'tamamlandi'])
      .order('goruntuleme', { ascending: false })
      .limit(4)
    setPopular(pop || [])
  }

  const handlePrefsaved = async (cats: string[]) => {
    setUserPrefs(cats)
    setShowPicker(false)
    setLoading(true)
    await loadContent(cats)
    setLoading(false)
  }

  // Giriş yapmamış
  if (!hasUser && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">✨</div>
          <h1 className="font-display text-2xl font-bold text-[var(--fg)] mb-3">
            {lang === 'tr' ? 'Sana Özel' : 'For You'}
          </h1>
          <p className="text-[var(--fg-muted)] mb-6">
            {lang === 'tr'
              ? 'Kişiselleştirilmiş içerikler için giriş yap.'
              : 'Sign in to see personalized content.'}
          </p>
          <Link href="/login"
            className="inline-block px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
            {lang === 'tr' ? 'Giriş Yap' : 'Sign In'}
          </Link>
        </div>
      </div>
    )
  }

  // Tercih seçme ekranı
  if (showPicker) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <InterestPicker
          isModal={false}
          onSave={handlePrefsaved}
          onSkip={() => {
            localStorage.setItem('inkstory-onboarding-skipped', '1')
            setShowPicker(false)
          }}
        />
      </div>
    )
  }

  const prefLabels = userPrefs.slice(0, 4).map(s => getCategoryName(s, lang)).join(', ')
  const moreCount  = Math.max(0, userPrefs.length - 4)

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-[var(--fg)] flex items-center gap-3">
            <Sparkles style={{ width: 28, height: 28 }} className="text-[var(--accent)]" />
            {lang === 'tr' ? 'Sana Özel' : 'For You'}
          </h1>
          {userPrefs.length > 0 && (
            <p className="text-sm text-[var(--fg-muted)] mt-1">
              {lang === 'tr' ? 'İlgi alanların:' : 'Your interests:'}{' '}
              <span className="text-[var(--fg)]">{prefLabels}{moreCount > 0 ? ` +${moreCount}` : ''}</span>
            </p>
          )}
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--accent)]/50 transition-all"
        >
          <Settings style={{ width: 14, height: 14 }} />
          {lang === 'tr' ? 'Düzenle' : 'Edit'}
        </button>
      </div>

      {/* Interest pills */}
      {userPrefs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-10">
          {userPrefs.map(slug => {
            const cat = getCategoryBySlug(slug)
            if (!cat) return null
            return (
              <Link key={slug} href={`/stories?category=${slug}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-medium transition-all hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${cat.renk}dd, ${cat.renk}99)` }}>
                {cat.ikon} {lang === 'tr' ? cat.tr : cat.en}
              </Link>
            )
          })}
        </div>
      )}

      {/* Sections */}
      <Section
        title={lang === 'tr' ? '✨ Senin İçin Seçtiklerimiz' : '✨ Picked for You'}
        icon={<Sparkles style={{ width: 20, height: 20 }} className="text-[var(--accent)]" />}
        stories={forYou}
        lang={lang}
        loading={loading}
      />

      {(poems.length > 0 || loading) && (
        <Section
          title={lang === 'tr' ? '✍️ İlgi Alanlarına Göre Şiirler' : '✍️ Poetry for You'}
          icon={<span className="text-xl">✍️</span>}
          stories={poems}
          lang={lang}
          loading={loading}
        />
      )}

      <Section
        title={lang === 'tr' ? '🆕 Yeni Eklenenler' : '🆕 New Releases'}
        icon={<Clock style={{ width: 20, height: 20 }} className="text-blue-400" />}
        stories={newest}
        lang={lang}
        loading={loading}
      />

      <Section
        title={lang === 'tr' ? '🔥 Popüler İçerikler' : '🔥 Popular Content'}
        icon={<TrendingUp style={{ width: 20, height: 20 }} className="text-orange-400" />}
        stories={popular}
        lang={lang}
        loading={loading}
      />

      {/* Empty state */}
      {!loading && forYou.length === 0 && newest.length === 0 && popular.length === 0 && (
        <div className="text-center py-20 rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <div className="text-5xl mb-4">📚</div>
          <p className="font-display text-xl text-[var(--fg)] mb-2">
            {lang === 'tr' ? 'Henüz içerik yok' : 'No content yet'}
          </p>
          <p className="text-[var(--fg-muted)] text-sm mb-6">
            {lang === 'tr'
              ? 'Seçtiğin kategorilerde henüz hikaye yok. İlk sen yaz!'
              : "No stories in your categories yet. Be the first to write one!"}
          </p>
          <Link href="/write"
            className="inline-block px-6 py-3 rounded-xl font-semibold text-white hover:scale-105 transition-all"
            style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
            {lang === 'tr' ? 'Hikaye Yaz' : 'Write a Story'}
          </Link>
        </div>
      )}

      {/* Edit interests modal */}
      {showPicker && (
        <InterestPicker
          isModal
          initial={userPrefs}
          onSave={handlePrefsaved}
          onSkip={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
