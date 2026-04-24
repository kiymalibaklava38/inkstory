'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLang } from '@/lib/i18n'
import {
  BookMarked, Plus, Folder, FolderOpen, Trash2, Pencil,
  MoreVertical, X, Check, Loader2, Grid3x3, List as ListIcon,
  Eye, BookOpen, ChevronRight, Inbox
} from 'lucide-react'

interface Story {
  id: string; baslik: string; slug: string; kapak_url: string | null
  goruntuleme: number; klasor_id: string | null
  profiles: { username: string; display_name: string; avatar_url: string | null }
  kategoriler: { ad: string; ikon: string; renk: string } | null
}
interface SavedItem { id: string; hikaye_id: string; klasor_id: string | null; hikayeler: Story }
interface Folder { id: string; ad: string; renk: string; ikon: string; sira: number }

const PRESET_FOLDERS = [
  { ad: 'Okumak İstediklerim', ikon: '🔖', renk: '#3b82f6' },
  { ad: 'Okuduklarım',         ikon: '✅', renk: '#10b981' },
  { ad: 'Favorilerim',         ikon: '❤️', renk: '#ef4444' },
  { ad: 'Devam Edeceklerim',   ikon: '⏳', renk: '#f59e0b' },
]

function StoryMini({ story, onMove, onRemove, folders }: {
  story: Story; folders: Folder[]
  onMove: (hikayeId: string, klasorId: string | null) => void
  onRemove: (hikayeId: string) => void
}) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="group relative flex items-center gap-3 p-3 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)]/30 transition-all">
      {/* Kapak */}
      <Link href={`/story/${story.slug}`} className="flex-shrink-0">
        {story.kapak_url
          ? <img src={story.kapak_url} alt="" className="w-12 h-16 rounded-xl object-cover" />
          : <div className="w-12 h-16 rounded-xl flex items-center justify-center text-lg font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
              {story.baslik[0]}
            </div>
        }
      </Link>

      {/* Bilgi */}
      <div className="flex-1 min-w-0">
        <Link href={`/story/${story.slug}`}
          className="font-semibold text-sm text-[var(--fg)] hover:text-[var(--accent)] transition-colors line-clamp-2">
          {story.baslik}
        </Link>
        <p className="text-xs text-[var(--fg-muted)] mt-0.5">
          {story.profiles?.display_name || story.profiles?.username}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          {story.kategoriler && (
            <span className="text-[10px] text-[var(--fg-muted)]">
              {story.kategoriler.ikon} {story.kategoriler.ad}
            </span>
          )}
          <span className="text-[10px] text-[var(--fg-muted)] flex items-center gap-0.5 ml-auto">
            <Eye style={{ width: 9, height: 9 }} />
            {story.goruntuleme >= 1000 ? `${(story.goruntuleme/1000).toFixed(1)}K` : story.goruntuleme}
          </span>
        </div>
      </div>

      {/* Menü */}
      <div className="relative flex-shrink-0">
        <button onClick={() => setShowMenu(v => !v)}
          className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-colors">
          <MoreVertical style={{ width: 14, height: 14 }} />
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden z-50">
              <p className="px-3 py-2 text-[10px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider border-b border-[var(--border)]">
                Klasöre Taşı
              </p>
              <button onClick={() => { onMove(story.id, null); setShowMenu(false) }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[var(--bg-subtle)] transition-colors ${!story.klasor_id ? 'text-[var(--accent)]' : 'text-[var(--fg-muted)]'}`}>
                <Inbox style={{ width: 12, height: 12 }} />
                Sınıflandırılmamış
                {!story.klasor_id && <Check style={{ width: 10, height: 10 }} className="ml-auto" />}
              </button>
              {folders.map(f => (
                <button key={f.id} onClick={() => { onMove(story.id, f.id); setShowMenu(false) }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[var(--bg-subtle)] transition-colors ${story.klasor_id === f.id ? 'text-[var(--accent)]' : 'text-[var(--fg)]'}`}>
                  <span>{f.ikon}</span> {f.ad}
                  {story.klasor_id === f.id && <Check style={{ width: 10, height: 10 }} className="ml-auto text-[var(--accent)]" />}
                </button>
              ))}
              <div className="border-t border-[var(--border)]">
                <button onClick={() => { onRemove(story.id); setShowMenu(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 style={{ width: 12, height: 12 }} /> Kütüphaneden Çıkar
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function LibraryClient({ initialStories, initialFolders }: {
  initialStories: SavedItem[]
  initialFolders: Folder[]
}) {
  const { lang } = useLang()
  const [stories, setStories]     = useState<SavedItem[]>(initialStories)
  const [folders, setFolders]     = useState<Folder[]>(initialFolders)
  const [activeFolder, setActiveFolder] = useState<string | null | 'all'>('all')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderIcon, setNewFolderIcon] = useState('📚')
  const [newFolderColor, setNewFolderColor] = useState('#d4840f')
  const [creating, setCreating]   = useState(false)
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)
  const [viewMode, setViewMode]   = useState<'grid' | 'list'>('list')

  const visibleStories = stories.filter(s => {
    if (activeFolder === 'all') return true
    if (activeFolder === null) return !s.klasor_id
    return s.klasor_id === activeFolder
  }).map(s => ({ ...s.hikayeler, id: s.hikaye_id, klasor_id: s.klasor_id }))

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    setCreating(true)
    const res = await fetch('/api/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_folder', ad: newFolderName, ikon: newFolderIcon, renk: newFolderColor }),
    })
    const data = await res.json()
    if (data.folder) {
      setFolders(prev => [...prev, data.folder])
      setActiveFolder(data.folder.id)
    }
    setNewFolderName(''); setShowNewFolder(false); setCreating(false)
  }

  const deleteFolder = async (folderId: string) => {
    if (!confirm('Klasörü sil? İçindeki hikayeler silinmez, sadece sınıflandırmasız olur.')) return
    await fetch('/api/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_folder', klasorId: folderId }),
    })
    setFolders(prev => prev.filter(f => f.id !== folderId))
    setStories(prev => prev.map(s => s.klasor_id === folderId ? { ...s, klasor_id: null } : s))
    if (activeFolder === folderId) setActiveFolder('all')
  }

  const moveToFolder = async (hikayeId: string, klasorId: string | null) => {
    await fetch('/api/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'move_to_folder', hikayeId, klasorId }),
    })
    setStories(prev => prev.map(s =>
      s.hikaye_id === hikayeId ? { ...s, klasor_id: klasorId } : s
    ))
  }

  const removeFromLibrary = async (hikayeId: string) => {
    await fetch(`/api/library?hikayeId=${hikayeId}`, { method: 'DELETE' })
    setStories(prev => prev.filter(s => s.hikaye_id !== hikayeId))
  }

  const ICONS = ['📚', '🔖', '❤️', '⭐', '✅', '⏳', '🔥', '🌙', '🎭', '🗡️', '💕', '🌿']
  const COLORS = ['#d4840f', '#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280']

  const activeLabel = activeFolder === 'all'
    ? `Tümü (${stories.length})`
    : activeFolder === null
      ? `Sınıflandırılmamış (${stories.filter(s => !s.klasor_id).length})`
      : (() => {
          const f = folders.find(f => f.id === activeFolder)
          const count = stories.filter(s => s.klasor_id === activeFolder).length
          return f ? `${f.ikon} ${f.ad} (${count})` : ''
        })()

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
            <BookMarked style={{ width: 18, height: 18 }} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-[var(--fg)]">
              {lang === 'tr' ? 'Kütüphanem' : 'My Library'}
            </h1>
            <p className="text-[var(--fg-muted)] text-sm">{stories.length} hikaye · {folders.length} klasör</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
            className="p-2 rounded-xl border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors">
            {viewMode === 'grid' ? <ListIcon style={{ width: 16, height: 16 }} /> : <Grid3x3 style={{ width: 16, height: 16 }} />}
          </button>
          <button onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
            <Plus style={{ width: 14, height: 14 }} />
            {lang === 'tr' ? 'Klasör' : 'Folder'}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar — Klasörler */}
        <div className="w-56 flex-shrink-0 hidden md:block">
          <div className="space-y-1 sticky top-24">
            {/* Tümü */}
            <button onClick={() => setActiveFolder('all')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${
                activeFolder === 'all' ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-semibold' : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
              }`}>
              <BookOpen style={{ width: 15, height: 15 }} />
              <span className="flex-1">Tümü</span>
              <span className="text-[10px] font-mono">{stories.length}</span>
            </button>

            {/* Sınıflandırılmamış */}
            {stories.some(s => !s.klasor_id) && (
              <button onClick={() => setActiveFolder(null)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${
                  activeFolder === null ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-semibold' : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
                }`}>
                <Inbox style={{ width: 15, height: 15 }} />
                <span className="flex-1">Sınıflandırılmamış</span>
                <span className="text-[10px] font-mono">{stories.filter(s => !s.klasor_id).length}</span>
              </button>
            )}

            {folders.length > 0 && (
              <div className="pt-2 mt-2 border-t border-[var(--border)]">
                <p className="px-3 text-[10px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-1">Klasörler</p>
                {folders.map(f => {
                  const count = stories.filter(s => s.klasor_id === f.id).length
                  const isActive = activeFolder === f.id
                  return (
                    <div key={f.id} className="group relative flex items-center">
                      <button onClick={() => setActiveFolder(f.id)}
                        className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${
                          isActive ? 'text-[var(--accent)] font-semibold' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                        }`}
                        style={isActive ? { background: `${f.renk}15` } : {}}>
                        <span className="text-base">{f.ikon}</span>
                        <span className="flex-1 truncate">{f.ad}</span>
                        <span className="text-[10px] font-mono">{count}</span>
                      </button>
                      <button onClick={() => deleteFolder(f.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 mr-1 rounded text-[var(--fg-muted)] hover:text-red-400 transition-all flex-shrink-0">
                        <X style={{ width: 10, height: 10 }} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Preset klasörler - henüz oluşturulmamışsa öner */}
            {folders.length === 0 && (
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <p className="px-3 text-[10px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-2">Hızlı Oluştur</p>
                {PRESET_FOLDERS.map(p => (
                  <button key={p.ad} onClick={async () => {
                    const res = await fetch('/api/library', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'create_folder', ad: p.ad, ikon: p.ikon, renk: p.renk }),
                    })
                    const data = await res.json()
                    if (data.folder) setFolders(prev => [...prev, data.folder])
                  }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-colors text-left">
                    <Plus style={{ width: 10, height: 10 }} className="flex-shrink-0" />
                    <span>{p.ikon} {p.ad}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mobile folder tabs */}
        <div className="md:hidden w-full mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
           {[
                { key: 'all', label: `Tümü`, count: stories.length, ikon: '📚' },
                ...(stories.some(s => !s.klasor_id) 
                  ? [{ key: null as (string | null), label: 'Diğer', count: stories.filter(s => !s.klasor_id).length, ikon: '📋' }] 
                  : []),
                ...folders.map(f => ({ key: f.id, label: f.ad, count: stories.filter(s => s.klasor_id === f.id).length, ikon: f.ikon }))
              ].map(item => (
                <button key={String(item.key)} onClick={() => setActiveFolder(item.key as (string | null))}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${
                  activeFolder === item.key
                    ? 'text-white'
                    : 'bg-[var(--card)] border border-[var(--border)] text-[var(--fg-muted)]'
                }`}
                style={activeFolder === item.key ? { background: 'linear-gradient(135deg,#d4840f,#e8a030)' } : {}}>
                {item.ikon} {item.label} ({item.count})
              </button>
            ))}
          </div>
        </div>

        {/* Ana içerik */}
        <div className="flex-1 min-w-0">
          {/* Aktif klasör başlığı */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-[var(--fg)]">{activeLabel}</h2>
          </div>

          {visibleStories.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-[var(--border)] bg-[var(--card)]">
              <BookMarked style={{ width: 40, height: 40 }} className="text-[var(--border)] mx-auto mb-4" />
              <p className="font-display text-lg text-[var(--fg)] mb-1">
                {activeFolder === 'all' ? 'Kütüphanen boş' : 'Bu klasör boş'}
              </p>
              <p className="text-[var(--fg-muted)] text-sm">
                {activeFolder === 'all'
                  ? 'Beğendiğin hikayeleri kütüphanene ekle.'
                  : 'Hikayeleri yer imi ikonundan bu klasöre ekleyebilirsin.'}
              </p>
              {activeFolder === 'all' && (
                <Link href="/stories" className="inline-block mt-4 px-5 py-2.5 rounded-xl text-sm font-medium text-white"
                  style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                  Hikayeleri Keşfet
                </Link>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-2">
              {visibleStories.map(story => (
                <StoryMini key={story.id} story={story} folders={folders}
                  onMove={moveToFolder} onRemove={removeFromLibrary} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {visibleStories.map(story => (
                <div key={story.id} className="group relative">
                  <Link href={`/story/${story.slug}`} className="block">
                    {story.kapak_url
                      ? <img src={story.kapak_url} alt="" className="w-full aspect-[2/3] rounded-2xl object-cover mb-2" />
                      : <div className="w-full aspect-[2/3] rounded-2xl flex items-center justify-center text-3xl font-bold text-white mb-2"
                          style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                          {story.baslik[0]}
                        </div>
                    }
                    <p className="font-semibold text-sm text-[var(--fg)] line-clamp-2">{story.baslik}</p>
                    <p className="text-xs text-[var(--fg-muted)]">{story.profiles?.display_name || story.profiles?.username}</p>
                  </Link>
                  <button onClick={() => removeFromLibrary(story.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Yeni klasör modal */}
      {showNewFolder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-bold text-[var(--fg)]">Yeni Klasör</h3>
              <button onClick={() => setShowNewFolder(false)} className="text-[var(--fg-muted)] hover:text-[var(--fg)]">
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Klasör Adı</label>
                <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                  placeholder="Örn: Okumak İstediklerim"
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] text-sm focus:outline-none focus:border-[var(--accent)]" />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">İkon</label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map(icon => (
                    <button key={icon} onClick={() => setNewFolderIcon(icon)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all ${
                        newFolderIcon === icon ? 'bg-[var(--accent)]/20 ring-2 ring-[var(--accent)]' : 'bg-[var(--bg-subtle)] hover:bg-[var(--border)]'
                      }`}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Renk</label>
                <div className="flex gap-2">
                  {COLORS.map(color => (
                    <button key={color} onClick={() => setNewFolderColor(color)}
                      className={`w-7 h-7 rounded-full transition-all ${newFolderColor === color ? 'ring-2 ring-offset-2 ring-offset-[var(--card)] ring-white scale-110' : ''}`}
                      style={{ background: color }} />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-subtle)]">
                <span className="text-xl">{newFolderIcon}</span>
                <span className="font-medium text-sm text-[var(--fg)]">{newFolderName || 'Klasör Adı'}</span>
                <div className="ml-auto w-3 h-3 rounded-full" style={{ background: newFolderColor }} />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowNewFolder(false)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
                İptal
              </button>
              <button onClick={createFolder} disabled={!newFolderName.trim() || creating}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                {creating ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin mx-auto" /> : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
