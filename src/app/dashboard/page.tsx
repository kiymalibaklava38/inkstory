'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n'
import Link from 'next/link'
import { VerifiedBadge } from '@/components/ui/VerifiedBadge'
import {
  PenLine, BookOpen, Eye, Globe, Lock, CheckCircle,
  ChevronDown, ChevronRight, Trash2, Settings, Loader2, Plus, BarChart3,
  Pencil, TrendingUp, Heart, Users, MessageCircle, List, X, GripVertical
} from 'lucide-react'
import { format } from 'date-fns'
import { tr as dateFnsTr } from 'date-fns/locale'

// ── Basit çizgi grafiği ──────────────────────────────────
function MiniChart({ data }: { data: { date: string; reads: number }[] }) {
  if (!data?.length) return null

  const max = Math.max(...data.map(d => d.reads), 1)
  const hasData = data.some(d => d.reads > 0)

  if (!hasData) {
    return (
      <div className="h-14 flex items-center justify-center">
        <p className="text-xs text-[var(--fg-muted)]">
          Bu dönemde henüz okuma yok.
        </p>
      </div>
    )
  }

  const pts = data.map((d, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * 280 : 140
    const y = 50 - (d.reads / max) * 45
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="relative">
      <svg viewBox="0 0 280 55" className="w-full" style={{ height: 56 }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4840f" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#d4840f" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline fill="none" stroke="#d4840f" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" points={pts} />
        <polygon fill="url(#chartGrad)"
          points={`0,55 ${pts} 280,55`} />
        {/* Max nokta göster */}
        {data.map((d, i) => d.reads === max && max > 0 ? (
          <circle key={i}
            cx={data.length > 1 ? (i / (data.length - 1)) * 280 : 140}
            cy={50 - (d.reads / max) * 45}
            r="3" fill="#d4840f" />
        ) : null)}
      </svg>
    </div>
  )
}

export default function DashboardPage() {
  const [tab, setTab]           = useState<'stories' | 'analytics' | 'series'>('stories')
  const [stories, setStories]   = useState<any[]>([])
  const [chapters, setChapters] = useState<Record<string, any[]>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [confirm, setConfirm]   = useState<string | null>(null)

  // Analytics
  const [analytics, setAnalytics]     = useState<any>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [days, setDays]               = useState(30)

  // Seri
  const [series, setSeries]           = useState<any[]>([])
  const [seriesLoading, setSeriesLoading] = useState(false)
  const [newSerieTitle, setNewSerieTitle] = useState('')
  const [newSerieDesc, setNewSerieDesc]   = useState('')
  const [creatingSerie, setCreatingSerie] = useState(false)
  const [showNewSerie, setShowNewSerie]   = useState(false)
  const [managingSerie, setManagingSerie] = useState<any>(null)

  const router   = useRouter()
  const supabase = createClient()
  const { t, lang } = useLang()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('hikayeler')
        .select('id,baslik,slug,durum,goruntuleme,created_at,updated_at,kategoriler(ad,ikon,renk)')
        .eq('yazar_id', user.id)
        .order('updated_at', { ascending: false })
      setStories(data || [])
      setLoading(false)
    }
    init()
  }, [])

  // Analytics yükle
  useEffect(() => {
    if (tab !== 'analytics') return
    setAnalyticsLoading(true)
    fetch(`/api/analytics?days=${days}`)
      .then(r => r.json())
      .then(d => { setAnalytics(d); setAnalyticsLoading(false) })
      .catch(() => setAnalyticsLoading(false))
  }, [tab, days])

  // Seri yükle
  useEffect(() => {
    if (tab !== 'series') return
    setSeriesLoading(true)
    fetch('/api/series')
      .then(r => r.json())
      .then(d => { setSeries(d.series || []); setSeriesLoading(false) })
      .catch(() => setSeriesLoading(false))
  }, [tab])

  const loadChapters = async (storyId: string) => {
    if (chapters[storyId]) return
    const { data } = await supabase.from('bolumler')
      .select('id,baslik,bolum_no,yayinda,kelime_sayisi,created_at')
      .eq('hikaye_id', storyId).order('bolum_no')
    setChapters(prev => ({ ...prev, [storyId]: data || [] }))
  }

  const toggle = async (id: string) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id); await loadChapters(id)
  }

  const changeStatus = async (id: string, status: string) => {
    await supabase.from('hikayeler').update({ durum: status, updated_at: new Date().toISOString() }).eq('id', id)
    setStories(prev => prev.map(s => s.id === id ? { ...s, durum: status } : s))
  }

  const deleteStory = async (id: string) => {
    await supabase.from('hikayeler').delete().eq('id', id)
    setStories(prev => prev.filter(s => s.id !== id))
    setConfirm(null)
  }

  const toggleChapterPublish = async (storyId: string, chapterId: string, current: boolean) => {
    await supabase.from('bolumler').update({ yayinda: !current }).eq('id', chapterId)
    setChapters(prev => ({
      ...prev,
      [storyId]: prev[storyId].map(c => c.id === chapterId ? { ...c, yayinda: !current } : c)
    }))
  }

  const createSerie = async () => {
    if (!newSerieTitle.trim()) return
    setCreatingSerie(true)
    const res = await fetch('/api/series', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baslik: newSerieTitle, aciklama: newSerieDesc }),
    })
    const data = await res.json()
    if (data.serie) {
      setSeries(prev => [{ ...data.serie, seri_hikayeleri: [] }, ...prev])
      setNewSerieTitle(''); setNewSerieDesc(''); setShowNewSerie(false)
    }
    setCreatingSerie(false)
  }

  const addToSerie = async (serieId: string, storyId: string) => {
    await fetch('/api/series', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serieId, addStoryId: storyId }),
    })
    // Seriler yenile
    const res = await fetch('/api/series')
    const data = await res.json()
    setSeries(data.series || [])
  }

  const removeFromSerie = async (serieId: string, storyId: string) => {
    await fetch('/api/series', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serieId, removeStoryId: storyId }),
    })
    setSeries(prev => prev.map(s =>
      s.id === serieId
        ? { ...s, seri_hikayeleri: s.seri_hikayeleri.filter((sh: any) => sh.hikaye_id !== storyId) }
        : s
    ))
  }

  const deleteSerie = async (serieId: string) => {
    await fetch(`/api/series?id=${serieId}`, { method: 'DELETE' })
    setSeries(prev => prev.filter(s => s.id !== serieId))
  }

  const totalReads = stories.reduce((a, s) => a + (s.goruntuleme || 0), 0)
  const fmt = (n: number) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : n.toString()

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      yayinda:    { label: t.published, cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
      taslak:     { label: t.draft,     cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
      tamamlandi: { label: t.completed, cls: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
    }
    return map[status] || map.taslak
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 style={{ width: 28, height: 28 }} className="animate-spin text-[var(--accent)]" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--fg)]">{t.writerDashboardTitle}</h1>
          <p className="text-[var(--fg-muted)] text-sm mt-1">
            {stories.length} {t.totalStories.toLowerCase()} · {fmt(totalReads)} {t.totalReads.toLowerCase()}
          </p>
        </div>
        <Link href="/write"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white hover:scale-105 transition-all"
          style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
          <Plus style={{ width: 15, height: 15 }} />{t.newStory}
        </Link>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 bg-[var(--bg-subtle)] rounded-2xl mb-6 w-fit">
        {[
          { key: 'stories',   icon: BookOpen,   label: lang === 'tr' ? 'Hikayelerim' : 'My Stories' },
          { key: 'analytics', icon: BarChart3,   label: lang === 'tr' ? 'Analitik' : 'Analytics' },
          { key: 'series',    icon: List,        label: lang === 'tr' ? 'Seriler' : 'Series' },
        ].map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === key ? 'bg-[var(--card)] text-[var(--fg)] shadow-sm' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}>
            <Icon style={{ width: 14, height: 14 }} />{label}
          </button>
        ))}
      </div>

      {/* ── STORIES TAB ─────────────────────────────────── */}
      {tab === 'stories' && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: t.totalStories, value: fmt(stories.length),                               color: '#d4840f', icon: BookOpen },
              { label: t.published,    value: fmt(stories.filter(s=>s.durum==='yayinda').length), color: '#2d9f6a', icon: Globe },
              { label: t.completed,    value: fmt(stories.filter(s=>s.durum==='tamamlandi').length), color: '#5ba3d9', icon: CheckCircle },
              { label: t.totalReads,   value: fmt(totalReads),                                   color: '#7c5cbf', icon: Eye },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5">
                <div className="flex items-center justify-between mb-3">
                  <Icon style={{ width: 18, height: 18, color }} />
                  <BarChart3 style={{ width: 13, height: 13 }} className="text-[var(--fg-muted)] opacity-30" />
                </div>
                <p className="font-display text-3xl font-bold text-[var(--fg)]">{value}</p>
                <p className="text-xs text-[var(--fg-muted)] mt-1">{label}</p>
              </div>
            ))}
          </div>

          {stories.length === 0 ? (
            <div className="text-center py-20 rounded-2xl border border-[var(--border)] bg-[var(--card)]">
              <PenLine style={{ width: 40, height: 40 }} className="text-[var(--border)] mx-auto mb-4" />
              <p className="font-display text-xl text-[var(--fg)]">{t.noStoryYet}</p>
              <Link href="/write"
                className="inline-block mt-5 px-6 py-2.5 rounded-full text-sm font-medium text-white hover:scale-105 transition-all"
                style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                {t.writeFirstStory}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stories.map(story => {
                const badge = statusBadge(story.durum)
                const isOpen = expanded === story.id
                return (
                  <div key={story.id} className="bg-[var(--card)] rounded-2xl border border-[var(--border)]">
                    <div className="flex items-center gap-3 p-4">
                      <button onClick={() => toggle(story.id)} className="text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors flex-shrink-0">
                        {isOpen ? <ChevronDown style={{ width: 18, height: 18 }} /> : <ChevronRight style={{ width: 18, height: 18 }} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display font-semibold text-[var(--fg)] truncate">{story.baslik}</h3>
                          {story.kategoriler && (
                            <span className="text-xs px-2 py-0.5 rounded-full text-[var(--fg-muted)] border border-[var(--border)]">
                              {story.kategoriler.ikon} {story.kategoriler.ad}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                          {format(new Date(story.updated_at), 'd MMM yyyy', { locale: dateFnsTr })} · {fmt(story.goruntuleme)} {t.reads?.toLowerCase() || 'okuma'}
                        </p>
                      </div>
                      <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                      <div className="relative group flex-shrink-0">
                        <button className="p-2 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-all">
                          <Settings style={{ width: 15, height: 15 }} />
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-xl overflow-hidden opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-50">
                          <Link href={`/story/${story.slug}`} className="flex items-center gap-2 px-4 py-2.5 text-xs text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]">
                            <Eye style={{ width: 13, height: 13 }} /> {t.view}
                          </Link>
                          <Link href={`/write/edit?id=${story.id}`} className="flex items-center gap-2 px-4 py-2.5 text-xs text-[var(--accent)] hover:bg-[var(--accent)]/10">
                            <Pencil style={{ width: 13, height: 13 }} /> {lang === 'tr' ? 'Hikayeyi Düzenle' : 'Edit Story'}
                          </Link>
                          <hr className="border-[var(--border)]" />
                          {story.durum !== 'yayinda'    && <button onClick={() => changeStatus(story.id,'yayinda')}    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-emerald-400 hover:bg-emerald-500/10"><Globe style={{width:13,height:13}}/> {t.publish}</button>}
                          {story.durum !== 'taslak'     && <button onClick={() => changeStatus(story.id,'taslak')}     className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-amber-400 hover:bg-amber-500/10"><Lock style={{width:13,height:13}}/> {t.unpublish}</button>}
                          {story.durum !== 'tamamlandi' && <button onClick={() => changeStatus(story.id,'tamamlandi')} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-blue-400 hover:bg-blue-500/10"><CheckCircle style={{width:13,height:13}}/> {t.markComplete}</button>}
                          <hr className="border-[var(--border)]" />
                          <button onClick={() => setConfirm(story.id)} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10">
                            <Trash2 style={{ width: 13, height: 13 }} /> {t.delete}
                          </button>
                        </div>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="border-t border-[var(--border)] p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium text-[var(--fg)]">{t.chapters_label}</p>
                          <Link href={`/write/chapter?story=${story.id}`} className="text-xs text-[var(--accent)] font-medium hover:underline flex items-center gap-1">
                            <Plus style={{ width: 12, height: 12 }} />{t.newChapter}
                          </Link>
                        </div>
                        {!chapters[story.id] ? (
                          <div className="flex justify-center py-4"><Loader2 style={{ width: 18, height: 18 }} className="animate-spin text-[var(--fg-muted)]" /></div>
                        ) : chapters[story.id].length === 0 ? (
                          <p className="text-sm text-[var(--fg-muted)] text-center py-3">{lang === 'tr' ? 'Henüz bölüm yok.' : 'No chapters yet.'}</p>
                        ) : (
                          <div className="space-y-1.5">
                            {chapters[story.id].map(ch => (
                              <div key={ch.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--bg-subtle)] group hover:bg-[var(--border)]/30 transition-colors">
                                <span className="w-6 h-6 rounded-lg bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-xs font-mono font-bold text-[var(--fg-muted)] flex-shrink-0">{ch.bolum_no}</span>
                                <span className="flex-1 text-sm text-[var(--fg)] truncate">{ch.baslik}</span>
                                <span className="text-xs text-[var(--fg-muted)] hidden sm:block">{ch.kelime_sayisi} {t.words}</span>
                                <button onClick={() => toggleChapterPublish(story.id, ch.id, ch.yayinda)}
                                  className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${ch.yayinda ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[var(--border)] text-[var(--fg-muted)]'}`}>
                                  {ch.yayinda ? t.published : t.draft}
                                </button>
                                <Link href={`/write/chapter/edit?id=${ch.id}`} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-[var(--accent)] transition-all">
                                  <PenLine style={{ width: 12, height: 12 }} />
                                </Link>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── ANALYTICS TAB ───────────────────────────────── */}
      {tab === 'analytics' && (
        <div>
          {/* Zaman filtresi */}
          <div className="flex items-center gap-2 mb-6">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  days === d ? 'text-white' : 'bg-[var(--card)] border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
                }`}
                style={days === d ? { background: 'linear-gradient(135deg,#d4840f,#e8a030)' } : {}}>
                {lang === 'tr' ? `Son ${d} gün` : `Last ${d} days`}
              </button>
            ))}
          </div>

          {analyticsLoading ? (
            <div className="flex justify-center py-20"><Loader2 style={{ width: 28, height: 28 }} className="animate-spin text-[var(--accent)]" /></div>
          ) : analytics ? (
            <>
              {/* Özet kartlar */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                {[
                  { label: lang === 'tr' ? 'Toplam Okuma' : 'Total Reads',  value: fmt(analytics.totals?.reads || 0),     color: '#d4840f', icon: Eye },
                  { label: lang === 'tr' ? 'Takipçi'      : 'Followers',    value: fmt(analytics.totals?.followers || 0), color: '#2d9f6a', icon: Users },
                  { label: lang === 'tr' ? 'Beğeni'        : 'Likes',       value: fmt(analytics.totals?.likes || 0),     color: '#e85555', icon: Heart },
                  { label: lang === 'tr' ? 'Yorum'         : 'Comments',    value: fmt(analytics.totals?.comments || 0),  color: '#5ba3d9', icon: MessageCircle },
                  { label: lang === 'tr' ? 'Hikaye'        : 'Stories',     value: fmt(analytics.totals?.stories || 0),   color: '#7c5cbf', icon: BookOpen },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4">
                    <Icon style={{ width: 16, height: 16, color }} className="mb-2" />
                    <p className="font-display text-2xl font-bold text-[var(--fg)]">{value}</p>
                    <p className="text-xs text-[var(--fg-muted)] mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Okuma grafiği */}
              {analytics.chart?.length > 0 && (
                <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-semibold text-[var(--fg)]">
                      {lang === 'tr' ? 'Okuma Trendi' : 'Reading Trend'}
                    </h3>
                    <TrendingUp style={{ width: 16, height: 16 }} className="text-[var(--accent)]" />
                  </div>
                  <MiniChart data={analytics.chart} />
                  <div className="flex justify-between text-[10px] text-[var(--fg-muted)] mt-1">
                    <span>{analytics.chart[0]?.date?.slice(5)}</span>
                    <span>{analytics.chart[analytics.chart.length - 1]?.date?.slice(5)}</span>
                  </div>
                </div>
              )}

              {/* En çok okunan hikayeler */}
              {analytics.topStories?.length > 0 && (
                <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5">
                  <h3 className="font-display font-semibold text-[var(--fg)] mb-4">
                    {lang === 'tr' ? 'En Çok Okunan' : 'Most Read'}
                  </h3>
                  <div className="space-y-3">
                    {analytics.topStories.map((s: any, i: number) => (
                      <div key={s.id} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: i === 0 ? '#d4840f' : i === 1 ? '#6b7280' : '#92400e' }}>
                          {i + 1}
                        </span>
                        <Link href={`/story/${s.slug}`} className="flex-1 text-sm text-[var(--fg)] hover:text-[var(--accent)] transition-colors truncate">
                          {s.baslik}
                        </Link>
                        <div className="flex items-center gap-1 text-xs text-[var(--fg-muted)] flex-shrink-0">
                          <Eye style={{ width: 11, height: 11 }} />
                          {fmt(s.goruntuleme)}
                        </div>
                        {/* Mini bar */}
                        <div className="w-20 h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden flex-shrink-0">
                          <div className="h-full rounded-full" style={{
                            width: `${(s.goruntuleme / (analytics.topStories[0]?.goruntuleme || 1)) * 100}%`,
                            background: 'linear-gradient(135deg,#d4840f,#e8a030)',
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analytics.totals?.reads === 0 && (
                <div className="text-center py-20 rounded-2xl border border-[var(--border)] bg-[var(--card)]">
                  <BarChart3 style={{ width: 40, height: 40 }} className="text-[var(--border)] mx-auto mb-4" />
                  <p className="text-[var(--fg-muted)] text-sm">
                    {lang === 'tr' ? 'Henüz istatistik yok. Hikayeni yayınla!' : 'No stats yet. Publish your story!'}
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ── SERIES TAB ──────────────────────────────────── */}
      {tab === 'series' && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-[var(--fg-muted)]">
              {lang === 'tr' ? 'Hikayelerini serilere grupla.' : 'Group your stories into series.'}
            </p>
            <button onClick={() => setShowNewSerie(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
              <Plus style={{ width: 14, height: 14 }} />
              {lang === 'tr' ? 'Yeni Seri' : 'New Series'}
            </button>
          </div>

          {/* Yeni seri formu */}
          {showNewSerie && (
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--accent)]/30 p-5 mb-5 animate-fade-in">
              <h3 className="font-display font-semibold text-[var(--fg)] mb-4">
                {lang === 'tr' ? 'Yeni Seri Oluştur' : 'Create New Series'}
              </h3>
              <div className="space-y-3">
                <input value={newSerieTitle} onChange={e => setNewSerieTitle(e.target.value)}
                  placeholder={lang === 'tr' ? 'Seri adı...' : 'Series name...'}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] text-sm focus:outline-none focus:border-[var(--accent)]" />
                <textarea value={newSerieDesc} onChange={e => setNewSerieDesc(e.target.value)}
                  placeholder={lang === 'tr' ? 'Açıklama (isteğe bağlı)...' : 'Description (optional)...'}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] text-sm focus:outline-none focus:border-[var(--accent)] resize-none" />
                <div className="flex gap-2">
                  <button onClick={createSerie} disabled={!newSerieTitle.trim() || creatingSerie}
                    className="px-5 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                    {creatingSerie ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : (lang === 'tr' ? 'Oluştur' : 'Create')}
                  </button>
                  <button onClick={() => setShowNewSerie(false)}
                    className="px-5 py-2 rounded-xl text-sm border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]">
                    {lang === 'tr' ? 'İptal' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {seriesLoading ? (
            <div className="flex justify-center py-20"><Loader2 style={{ width: 28, height: 28 }} className="animate-spin text-[var(--accent)]" /></div>
          ) : series.length === 0 ? (
            <div className="text-center py-20 rounded-2xl border border-[var(--border)] bg-[var(--card)]">
              <List style={{ width: 40, height: 40 }} className="text-[var(--border)] mx-auto mb-4" />
              <p className="text-[var(--fg-muted)] text-sm">
                {lang === 'tr' ? 'Henüz seri yok. İlk serini oluştur!' : 'No series yet. Create your first!'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {series.map((serie: any) => {
                const serieStoryIds = serie.seri_hikayeleri?.map((sh: any) => sh.hikaye_id) || []
                const serieStories  = serie.seri_hikayeleri?.sort((a: any, b: any) => a.sira - b.sira) || []
                return (
                  <div key={serie.id} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
                    <div className="flex items-center gap-3 p-4 border-b border-[var(--border)]">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-semibold text-[var(--fg)]">{serie.baslik}</h3>
                        {serie.aciklama && <p className="text-xs text-[var(--fg-muted)] mt-0.5 truncate">{serie.aciklama}</p>}
                        <p className="text-xs text-[var(--accent)] mt-0.5">{serieStories.length} {lang === 'tr' ? 'hikaye' : 'stories'}</p>
                      </div>
                      <button onClick={() => deleteSerie(serie.id)}
                        className="p-2 rounded-lg text-[var(--fg-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </div>

                    {/* Serideki hikayeler */}
                    <div className="p-4">
                      {serieStories.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {serieStories.map((sh: any, idx: number) => {
                            const story = sh.hikayeler
                            if (!story) return null
                            return (
                              <div key={sh.hikaye_id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--bg-subtle)]">
                                <GripVertical style={{ width: 14, height: 14 }} className="text-[var(--fg-muted)] flex-shrink-0" />
                                <span className="text-xs font-mono font-bold text-[var(--fg-muted)] w-5">{idx + 1}</span>
                                <Link href={`/story/${story.slug}`} className="flex-1 text-sm text-[var(--fg)] hover:text-[var(--accent)] truncate">
                                  {story.baslik}
                                </Link>
                                <div className="flex items-center gap-1 text-xs text-[var(--fg-muted)]">
                                  <Eye style={{ width: 10, height: 10 }} />
                                  {fmt(story.goruntuleme || 0)}
                                </div>
                                <button onClick={() => removeFromSerie(serie.id, sh.hikaye_id)}
                                  className="p-1 rounded text-[var(--fg-muted)] hover:text-red-400 transition-colors">
                                  <X style={{ width: 12, height: 12 }} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Hikaye ekle */}
                      <div className="border-t border-[var(--border)] pt-3">
                        <p className="text-xs font-medium text-[var(--fg-muted)] mb-2">
                          {lang === 'tr' ? 'Hikaye ekle:' : 'Add story:'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {stories
                            .filter(s => !serieStoryIds.includes(s.id))
                            .map(s => (
                              <button key={s.id} onClick={() => addToSerie(serie.id, s.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all">
                                <Plus style={{ width: 10, height: 10 }} />
                                {s.baslik.length > 25 ? s.baslik.slice(0, 25) + '…' : s.baslik}
                              </button>
                            ))
                          }
                          {stories.filter(s => !serieStoryIds.includes(s.id)).length === 0 && (
                            <p className="text-xs text-[var(--fg-muted)]">
                              {lang === 'tr' ? 'Tüm hikayeler seride.' : 'All stories added.'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Silme onay modalı */}
      {confirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 max-w-sm w-full shadow-2xl animate-fade-in">
            <h3 className="font-display text-xl font-bold text-[var(--fg)] mb-2">{t.deleteStory}</h3>
            <p className="text-[var(--fg-muted)] text-sm mb-6">{t.deleteWarning}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="flex-1 py-2.5 border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--fg-muted)] hover:border-[var(--fg-muted)] transition-all">{t.cancel}</button>
              <button onClick={() => deleteStory(confirm)} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-all">{t.confirmDelete}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
