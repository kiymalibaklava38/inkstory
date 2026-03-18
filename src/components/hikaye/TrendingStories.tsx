'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Eye, Heart, MessageCircle, BookMarked, TrendingUp, Flame, Loader2 } from 'lucide-react'
import { useLang } from '@/lib/i18n'

interface TrendingStory {
  id:            string
  baslik:        string
  slug:          string
  kapak_url:     string | null
  goruntuleme:   number
  trending_score: number
  reads_24h:     number
  likes_24h:     number
  comments_24h:  number
  bookmarks_24h: number
  profiles:      { username: string; display_name: string | null; avatar_url: string | null; is_premium?: boolean }
  kategoriler?:  { ad: string; ikon: string; renk: string; slug: string } | null
}

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

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

// Rank badge colors
const RANK_STYLES = [
  'bg-amber-500 text-white shadow-lg shadow-amber-500/30',   // #1
  'bg-zinc-400  text-white shadow-lg shadow-zinc-400/30',    // #2
  'bg-orange-600 text-white shadow-lg shadow-orange-600/30', // #3
]

export function TrendingStories() {
  const [stories, setStories]   = useState<TrendingStory[]>([])
  const [loading, setLoading]   = useState(true)
  const [fallback, setFallback] = useState(false)
  const { t, lang } = useLang()

  useEffect(() => {
    fetch('/api/stories/trending?limit=10')
      .then(r => r.json())
      .then(d => {
        setStories(d.stories || [])
        setFallback(!!d.fallback)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 style={{ width: 24, height: 24 }} className="animate-spin text-[var(--accent)]" />
      </div>
    )
  }

  if (!stories.length) return null

  const heading = lang === 'tr' ? '🔥 Şu An Trend' : '🔥 Trending Now'
  const subheading = fallback
    ? (lang === 'tr' ? 'En Yeni Hikayeler' : 'Latest Stories')
    : (lang === 'tr' ? 'Son 24 saatin en çok ilgi gören hikayeleri' : 'Most engaging stories in the last 24 hours')

  // Top 3 → big cards, rest → list rows
  const topThree  = stories.slice(0, 3)
  const restStories = stories.slice(3)

  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      {/* Section header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-[var(--fg)] flex items-center gap-2">
            <Flame style={{ width: 24, height: 24 }} className="text-orange-500" />
            {heading}
          </h2>
          <p className="text-sm text-[var(--fg-muted)] mt-1">{subheading}</p>
        </div>
        <Link href="/stories?sort=popular"
          className="text-sm text-[var(--accent)] hover:underline hidden md:flex items-center gap-1">
          {lang === 'tr' ? 'Tümünü Gör' : 'View all'}
        </Link>
      </div>

      {/* Top 3 — big cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {topThree.map((story, i) => {
          const cat = story.kategoriler
          const catName = cat ? (CATEGORY_NAMES[cat.slug]?.[lang] ?? cat.ad) : null

          return (
            <Link key={story.id} href={`/story/${story.slug}`} className="group">
              <article className="relative rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/40 transition-all hover:shadow-lg hover:shadow-[var(--accent)]/5 hover:-translate-y-0.5">

                {/* Cover */}
                <div className="relative h-44 overflow-hidden bg-[var(--bg-subtle)]">
                  {story.kapak_url ? (
                    <img src={story.kapak_url} alt={story.baslik}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${cat?.renk || '#d4840f'}18, ${cat?.renk || '#d4840f'}35)` }}>
                      <span className="text-4xl opacity-30">{cat?.ikon || '📖'}</span>
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Rank badge */}
                  <div className={`absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${RANK_STYLES[i] || 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]'}`}>
                    {i + 1}
                  </div>

                  {/* Category */}
                  {cat && catName && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-medium backdrop-blur-md"
                      style={{ backgroundColor: `${cat.renk}cc` }}>
                      {cat.ikon} {catName}
                    </div>
                  )}

                  {/* 24h engagement bar */}
                  <div className="absolute bottom-0 inset-x-0 px-3 pb-3">
                    <div className="flex items-center gap-3 text-white/80 text-xs">
                      {story.reads_24h > 0 && (
                        <span className="flex items-center gap-1">
                          <Eye style={{ width: 11, height: 11 }} /> {fmt(story.reads_24h)}
                        </span>
                      )}
                      {story.likes_24h > 0 && (
                        <span className="flex items-center gap-1">
                          <Heart style={{ width: 11, height: 11 }} /> {story.likes_24h}
                        </span>
                      )}
                      {story.comments_24h > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageCircle style={{ width: 11, height: 11 }} /> {story.comments_24h}
                        </span>
                      )}
                      <span className="ml-auto flex items-center gap-1 text-amber-300">
                        <TrendingUp style={{ width: 11, height: 11 }} />
                        {(Number(story.trending_score) || 0).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-display font-semibold text-[var(--fg)] text-sm leading-tight mb-2 line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
                    {story.baslik}
                  </h3>
                  <div className="flex items-center gap-2">
                    {story.profiles.avatar_url ? (
                      <img src={story.profiles.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                        {(story.profiles.display_name || story.profiles.username)[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-[var(--fg-muted)] truncate">
                      {story.profiles.display_name || story.profiles.username}
                    </span>
                    {story.profiles.is_premium && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>⭐</span>
                    )}
                  </div>
                </div>
              </article>
            </Link>
          )
        })}
      </div>

      {/* #4–10 — compact list rows */}
      {restStories.length > 0 && (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
          {restStories.map((story, i) => {
            const cat = story.kategoriler
            return (
              <Link key={story.id} href={`/story/${story.slug}`}
                className={`flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg-subtle)] transition-colors group ${i < restStories.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>

                {/* Rank */}
                <span className="text-sm font-black text-[var(--fg-muted)] w-5 text-center flex-shrink-0">
                  {i + 4}
                </span>

                {/* Mini cover */}
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-[var(--bg-subtle)]">
                  {story.kapak_url ? (
                    <img src={story.kapak_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-base"
                      style={{ background: `linear-gradient(135deg, ${cat?.renk || '#d4840f'}18, ${cat?.renk || '#d4840f'}35)` }}>
                      {cat?.ikon || '📖'}
                    </div>
                  )}
                </div>

                {/* Title + author */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--fg)] truncate group-hover:text-[var(--accent)] transition-colors">
                    {story.baslik}
                  </p>
                  <p className="text-xs text-[var(--fg-muted)] truncate">
                    @{story.profiles.username}
                    {story.profiles.is_premium && ' ⭐'}
                  </p>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-4 text-xs text-[var(--fg-muted)] flex-shrink-0">
                  {story.reads_24h > 0 && (
                    <span className="flex items-center gap-1">
                      <Eye style={{ width: 12, height: 12 }} />{fmt(story.reads_24h)}
                    </span>
                  )}
                  {story.likes_24h > 0 && (
                    <span className="flex items-center gap-1">
                      <Heart style={{ width: 12, height: 12 }} />{story.likes_24h}
                    </span>
                  )}
                </div>

                {/* Score */}
                <div className="flex items-center gap-1 text-xs text-amber-500 font-semibold flex-shrink-0">
                  <TrendingUp style={{ width: 12, height: 12 }} />
                  {(Number(story.trending_score) || 0).toFixed(1)}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
