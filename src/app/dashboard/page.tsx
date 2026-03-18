'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n'
import Link from 'next/link'
import {
  PenLine, BookOpen, Eye, Globe, Lock, CheckCircle,
  ChevronDown, ChevronRight, Trash2, Settings, Loader2, Plus, BarChart3
} from 'lucide-react'
import { format } from 'date-fns'

export default function DashboardPage() {
  const [stories, setStories]   = useState<any[]>([])
  const [chapters, setChapters] = useState<Record<string, any[]>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [confirm, setConfirm]   = useState<string | null>(null)
  const router   = useRouter()
  const supabase = createClient()
  const { t } = useLang()

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

  const totalReads = stories.reduce((a, s) => a + (s.goruntuleme || 0), 0)
  const fmt = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : n.toString()

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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: t.totalStories, value: fmt(stories.length),                                    color: '#d4840f', icon: BookOpen },
          { label: t.published,    value: fmt(stories.filter(s=>s.durum==='yayinda').length),     color: '#2d9f6a', icon: Globe },
          { label: t.completed,    value: fmt(stories.filter(s=>s.durum==='tamamlandi').length),  color: '#5ba3d9', icon: CheckCircle },
          { label: t.totalReads,   value: fmt(totalReads),                                        color: '#7c5cbf', icon: Eye },
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

      {/* Story list */}
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
              <div key={story.id} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
                {/* Story row */}
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
                      {format(new Date(story.updated_at), 'MMM d, yyyy')} · {story.goruntuleme.toLocaleString()} {t.reads?.toLowerCase() || 'reads'}
                    </p>
                  </div>

                  <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${badge.cls}`}>
                    {badge.label}
                  </span>

                  {/* Actions dropdown */}
                  <div className="relative group flex-shrink-0">
                    <button className="p-2 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-all">
                      <Settings style={{ width: 15, height: 15 }} />
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-xl overflow-hidden opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-10">
                      <Link href={`/story/${story.slug}`}
                        className="flex items-center gap-2 px-4 py-2.5 text-xs text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]">
                        <Eye style={{ width: 13, height: 13 }} /> {t.view}
                      </Link>
                      {story.durum !== 'yayinda' && (
                        <button onClick={() => changeStatus(story.id, 'yayinda')}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-emerald-400 hover:bg-emerald-500/10">
                          <Globe style={{ width: 13, height: 13 }} /> {t.publish}
                        </button>
                      )}
                      {story.durum !== 'taslak' && (
                        <button onClick={() => changeStatus(story.id, 'taslak')}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-amber-400 hover:bg-amber-500/10">
                          <Lock style={{ width: 13, height: 13 }} /> {t.unpublish}
                        </button>
                      )}
                      {story.durum !== 'tamamlandi' && (
                        <button onClick={() => changeStatus(story.id, 'tamamlandi')}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-blue-400 hover:bg-blue-500/10">
                          <CheckCircle style={{ width: 13, height: 13 }} /> {t.markComplete}
                        </button>
                      )}
                      <hr className="border-[var(--border)]" />
                      <button onClick={() => setConfirm(story.id)}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10">
                        <Trash2 style={{ width: 13, height: 13 }} /> {t.delete}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Chapters accordion */}
                {isOpen && (
                  <div className="border-t border-[var(--border)] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-[var(--fg)]">{t.chapters_label}</p>
                      <Link href={`/write/chapter?story=${story.id}`}
                        className="text-xs text-[var(--accent)] font-medium hover:underline flex items-center gap-1">
                        <Plus style={{ width: 12, height: 12 }} />{t.newChapter}
                      </Link>
                    </div>

                    {!chapters[story.id] ? (
                      <div className="flex justify-center py-4">
                        <Loader2 style={{ width: 18, height: 18 }} className="animate-spin text-[var(--fg-muted)]" />
                      </div>
                    ) : chapters[story.id].length === 0 ? (
                      <p className="text-sm text-[var(--fg-muted)] text-center py-3">lang === 'tr' ? 'Henüz bölüm yok.' : 'No chapters yet.'</p>
                    ) : (
                      <div className="space-y-1.5">
                        {chapters[story.id].map(ch => (
                          <div key={ch.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--bg-subtle)] group hover:bg-[var(--border)]/30 transition-colors">
                            <span className="w-6 h-6 rounded-lg bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-xs font-mono font-bold text-[var(--fg-muted)] flex-shrink-0">
                              {ch.bolum_no}
                            </span>
                            <span className="flex-1 text-sm text-[var(--fg)] truncate">{ch.baslik}</span>
                            <span className="text-xs text-[var(--fg-muted)] hidden sm:block">{ch.kelime_sayisi} {t.words}</span>
                            <button
                              onClick={() => toggleChapterPublish(story.id, ch.id, ch.yayinda)}
                              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${ch.yayinda ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[var(--border)] text-[var(--fg-muted)]'}`}>
                              {ch.yayinda ? t.published : t.draft}
                            </button>
                            <Link href={`/write/chapter/edit?id=${ch.id}`}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-[var(--accent)] transition-all">
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

      {/* Delete confirm modal */}
      {confirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 max-w-sm w-full shadow-2xl animate-fade-in">
            <h3 className="font-display text-xl font-bold text-[var(--fg)] mb-2">{t.deleteStory}</h3>
            <p className="text-[var(--fg-muted)] text-sm mb-6">{t.deleteWarning}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)}
                className="flex-1 py-2.5 border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--fg-muted)] hover:border-[var(--fg-muted)] transition-all">
                {t.cancel}
              </button>
              <button onClick={() => deleteStory(confirm)}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-all">
                {t.confirmDelete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
