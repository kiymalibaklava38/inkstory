'use client'

import Link from 'next/link'
import { StoryCard } from '@/components/hikaye/StoryCard'
import { TrendingStories } from '@/components/hikaye/TrendingStories'
import { InkLogo } from '@/components/ui/InkLogo'
import { CategoryPills } from '@/components/ui/CategoryPills'
import { PenLine, BookOpen, Sparkles, ArrowRight, Feather, Check } from 'lucide-react'
import { useLang } from '@/lib/i18n'

interface Props {
  storyCount: number
  writerCount: number
  totalReads: number
  topStories: any[]
  newStories: any[]
  categories: any[]
  featuredStories: any[]
}

export function HomeClient({
  storyCount, writerCount, totalReads, topStories, newStories, categories, featuredStories,
}: Props) {
  const { t, lang } = useLang()

  const fmt = (n: number) => {
    if (n === 0) return '0'
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return n.toString()
  }

  const stats = [
    { label: t.statStories, value: fmt(storyCount), icon: BookOpen },
    { label: t.statWriters, value: fmt(writerCount), icon: Feather },
    { label: t.statReads,   value: fmt(totalReads),  icon: BookOpen },
  ]

  return (
    <div className="overflow-x-hidden">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-ink-gradient" />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 20% 50%, rgba(100,160,220,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(212,132,15,0.1) 0%, transparent 50%)'
        }} />

        {/* Floating nib */}
        <div className="absolute right-[10%] top-[15%] opacity-10 animate-nib-float hidden lg:block">
          <InkLogo size={200} />
        </div>

        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)] text-sm font-medium mb-8 animate-fade-up">
            <Sparkles style={{ width: 14, height: 14 }} />
            {t.aiPowered}
          </div>

          <h1 className="font-display text-6xl md:text-8xl font-bold text-white leading-[0.95] mb-6 animate-fade-up"
            style={{ animationDelay: '0.1s', opacity: 0 }}>
            {t.heroTitle}
            <span className="block gradient-nib italic">{t.heroTitleAccent}</span>
          </h1>

          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up"
            style={{ animationDelay: '0.2s', opacity: 0 }}>
            {t.heroDesc}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up"
            style={{ animationDelay: '0.3s', opacity: 0 }}>
            <Link href="/register"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-white font-semibold text-lg transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(212,132,15,0.4)]"
              style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
              <PenLine style={{ width: 20, height: 20 }} />
              {t.startWriting}
            </Link>
            <Link href="/stories"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-semibold text-lg text-white/80 border border-white/20 hover:border-white/40 hover:bg-white/5 transition-all">
              <BookOpen style={{ width: 20, height: 20 }} />
              {t.browseStories}
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-8 md:gap-16 justify-center mt-16 pt-10 border-t border-white/10 stagger animate-fade-up"
            style={{ animationDelay: '0.4s', opacity: 0 }}>
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="text-center">
                <p className="font-display text-4xl font-bold text-white">{value}</p>
                <p className="text-white/50 text-sm mt-1 flex items-center gap-1 justify-center">
                  <Icon style={{ width: 13, height: 13 }} />{label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--bg)] to-transparent" />
      </section>

      {/* ── AI Feature highlight ─────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="relative rounded-3xl overflow-hidden border border-[var(--accent)]/20 p-8 md:p-12"
          style={{ background: 'linear-gradient(135deg, rgba(212,132,15,0.05), rgba(100,160,220,0.05))' }}>
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5"
            style={{ background: 'radial-gradient(circle,#d4840f,transparent)', transform: 'translate(30%,-30%)' }} />
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 text-[var(--accent)] text-sm font-medium mb-4">
                <Sparkles style={{ width: 14, height: 14 }} />
                {lang === 'tr' ? 'AI Yazma Asistanı' : 'AI Writing Assistant'}
              </div>
              <h2 className="font-display text-4xl font-bold text-[var(--fg)] mb-4 leading-tight">
                {t.neverBlank}
              </h2>
              <p className="text-[var(--fg-muted)] leading-relaxed mb-6">{t.aiDesc}</p>
              <div className="grid grid-cols-2 gap-3">
                {(lang === 'tr'
                  ? ['AI ile Devam Et', 'Yazıyı Geliştir', 'Daha Duygusal Yap', 'Olay Örgüsü Öner']
                  : ['Continue with AI', 'Improve writing', 'Add emotion', 'Suggest plot twist']
                ).map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Mock editor */}
            <div className="w-full md:w-80 flex-shrink-0">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-lg">
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[var(--border)]">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <span className="ml-2 text-xs text-[var(--fg-muted)] font-mono">chapter-1.ink</span>
                </div>
                <div className="p-4 font-reading text-sm text-[var(--fg)] leading-relaxed">
                  <p className="mb-3">
                    {lang === 'tr'
                      ? 'Fırtına günlerdir birikiyordu ama Elena fark etmemişti...'
                      : "The storm had been building for days, but Elena hadn't noticed..."}
                  </p>
                  <div className="border-l-2 border-[var(--accent)] pl-3 text-[var(--accent)] opacity-80 italic text-xs">
                    <span className="text-[10px] font-sans font-semibold not-italic block mb-1 opacity-60">
                      {lang === 'tr' ? 'AI önerisi' : 'AI suggestion'}
                    </span>
                    {lang === 'tr'
                      ? 'Ufku izlemekle meşguldü; kara bulutlar söylenmemiş bir tehdit gibi toplanıyordu...'
                      : 'She was too busy watching the horizon, where dark clouds gathered like an unspoken threat...'}
                  </div>
                  <div className="flex gap-2 mt-3">
                    {(lang === 'tr'
                      ? ['Kabul Et', 'Tekrar', 'Reddet']
                      : ['Accept', 'Retry', 'Reject']
                    ).map((a, i) => (
                      <button key={a} className={`text-[10px] px-2 py-1 rounded-md font-medium ${
                        i === 0 ? 'bg-[var(--accent)] text-white' : 'border border-[var(--border)] text-[var(--fg-muted)]'
                      }`}>{a}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trending Stories ─────────────────────────────── */}
      <TrendingStories />

      {/* ── Categories ───────────────────────────────────── */}
      {categories && categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-8">
          <h2 className="font-display text-2xl font-bold text-[var(--fg)] mb-5">{t.browseGenre}</h2>
          <CategoryPills categories={categories} lang={lang} />
        </section>
      )}

      {/* ── Featured Stories ─────────────────────────────── */}
      {featuredStories && featuredStories.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-bold text-[var(--fg)] flex items-center gap-2">
              <span className="text-xl">⭐</span>
              {lang === 'tr' ? 'Öne Çıkan Hikayeler' : 'Featured Stories'}
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {featuredStories.map((s: any) => <StoryCard key={s.id} story={s} lang={lang} />)}
          </div>
        </section>
      )}



      {/* ── New Releases ─────────────────────────────────── */}
      {newStories && newStories.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-8 pb-24">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-bold text-[var(--fg)]">{t.newReleases}</h2>
            <Link href="/stories?sort=new" className="text-[var(--accent)] text-sm font-medium hover:underline flex items-center gap-1">
              {t.viewAll} <ArrowRight style={{ width: 14, height: 14 }} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5 stagger">
            {newStories.map((s: any) => <StoryCard key={s.id} story={s} lang={lang} />)}
          </div>
        </section>
      )}

    </div>
  )
}
