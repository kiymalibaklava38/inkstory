'use client'

import { useState, useEffect, Suspense } from 'react' // Suspense eklendi
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n'
import { Save, ArrowLeft, Loader2, Check } from 'lucide-react'
import Link from 'next/link'
import { ALL_CATEGORIES } from '@/lib/categories'

// 1. Ana içeriği yeni bir bileşene (EditStoryContent) taşıyoruz
function EditStoryContent() {
  const [form, setForm] = useState({
    title: '', description: '', categoryId: '', tags: '', status: 'draft' as 'draft' | 'published' | 'tamamlandi'
  })
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [currentCover, setCurrentCover] = useState<string | null>(null)
  const [storySlug, setStorySlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()
  const searchParams = useSearchParams() // Suspense gerektiren hook
  const storyId = searchParams.get('id')
  const supabase = createClient()
  const { lang } = useLang()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      if (!storyId) { router.push('/dashboard'); return }

      const { data } = await supabase
        .from('hikayeler')
        .select('*, kategoriler(id,slug)')
        .eq('id', storyId)
        .eq('yazar_id', user.id)
        .single()

      if (!data) { router.push('/dashboard'); return }

      const statusMap: Record<string, 'draft' | 'published' | 'tamamlandi'> = {
        taslak: 'draft',
        yayinda: 'published',
        tamamlandi: 'tamamlandi',
      }

      setForm({
        title: data.baslik || '',
        description: data.aciklama || '',
        categoryId: data.kategoriler?.slug || '',
        tags: (data.etiketler || []).join(', '),
        status: statusMap[data.durum] || 'draft',
      })
      setCurrentCover(data.kapak_url || null)
      setStorySlug(data.slug)
      setLoading(false)
    }
    init()
  }, [storyId])

  const save = async () => {
    if (!form.title.trim()) { setError(lang === 'tr' ? 'Başlık gerekli' : 'Title is required'); return }
    setSaving(true); setError(''); setSuccess(false)

    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)

    let numericCategoryId: number | null = null
    if (form.categoryId) {
      const { data: catRow } = await supabase.from('kategoriler').select('id').eq('slug', form.categoryId).single()
      numericCategoryId = catRow?.id || null
    }

    const durumMap: Record<string, string> = {
      draft: 'taslak',
      published: 'yayinda',
      tamamlandi: 'tamamlandi',
    }

    const { error: updateErr } = await supabase
      .from('hikayeler')
      .update({
        baslik: form.title,
        aciklama: form.description || null,
        kategori_id: numericCategoryId,
        etiketler: tags,
        durum: durumMap[form.status],
        updated_at: new Date().toISOString(),
      })
      .eq('id', storyId!)

    if (updateErr) { setError(updateErr.message); setSaving(false); return }

    if (coverFile) {
      const fd = new FormData()
      fd.append('file', coverFile)
      fd.append('storyId', storyId!)
      await fetch('/api/upload/cover', { method: 'POST', body: fd })
    }

    if (!currentCover && !coverFile) {
      await supabase.from('hikayeler').update({ kapak_url: null }).eq('id', storyId!)
    }

    setSuccess(true)
    setSaving(false)
    setTimeout(() => router.push(`/story/${storySlug}`), 1500)
  }

  const set = (k: string) => (e: { target: { value: string } }) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 style={{ width: 28, height: 28 }} className="animate-spin text-[var(--accent)]" />
    </div>
  )

  const coverSrc = coverPreview || currentCover

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="p-2 rounded-xl text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-all">
          <ArrowLeft style={{ width: 18, height: 18 }} />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--fg)]">
            {lang === 'tr' ? 'Hikayeyi Düzenle' : 'Edit Story'}
          </h1>
          <p className="text-[var(--fg-muted)] text-sm mt-0.5">{form.title}</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Cover image */}
        <div>
          <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">{lang === 'tr' ? 'Kapak Resmi' : 'Cover Image'}</label>
          <div
            onClick={() => document.getElementById('cover-edit-input')?.click()}
            className={`relative rounded-2xl border-2 border-dashed cursor-pointer overflow-hidden transition-all hover:border-[var(--accent)]/60 ${coverSrc ? 'border-[var(--accent)]/40' : 'border-[var(--border)]'}`}
            style={{ height: 200 }}
          >
            {coverSrc ? (
              <>
                <img src={coverSrc} alt="cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <p className="text-white text-sm font-semibold">📷 {lang === 'tr' ? 'Değiştir' : 'Change'}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setCoverFile(null); setCoverPreview(null); setCurrentCover(null) }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white text-xs hover:bg-black/80"
                >✕</button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--fg-muted)]">
                <span className="text-3xl">🖼️</span>
                <p className="text-sm font-medium">{lang === 'tr' ? 'Kapak resmi ekle' : 'Add cover image'}</p>
              </div>
            )}
          </div>
          <input id="cover-edit-input" type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              if (!f) return
              if (f.size > 5 * 1024 * 1024) { alert(lang === 'tr' ? 'Maksimum 5MB' : 'Max 5MB'); return }
              setCoverFile(f)
              setCoverPreview(URL.createObjectURL(f))
            }}
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">{lang === 'tr' ? 'Başlık' : 'Title'} *</label>
          <input type="text" value={form.title} onChange={set('title')} className="w-full px-4 py-3.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] focus:outline-none focus:border-[var(--accent)] transition-all" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">{lang === 'tr' ? 'Açıklama' : 'Description'}</label>
          <textarea value={form.description} onChange={set('description')} rows={4} className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] focus:outline-none focus:border-[var(--accent)] transition-all" />
        </div>

        {/* Genre + Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">{lang === 'tr' ? 'Kategori' : 'Genre'}</label>
            <select value={form.categoryId} onChange={set('categoryId')} className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] focus:outline-none focus:border-[var(--accent)]">
              <option value="">{lang === 'tr' ? 'Seç...' : 'Select...'}</option>
              {ALL_CATEGORIES.map(cat => (
                <option key={cat.slug} value={cat.slug}>{cat.ikon} {lang === 'tr' ? cat.tr : cat.en}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">{lang === 'tr' ? 'Durum' : 'Status'}</label>
            <select value={form.status} onChange={set('status')} className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] focus:outline-none focus:border-[var(--accent)]">
              <option value="draft">{lang === 'tr' ? 'Taslak' : 'Draft'}</option>
              <option value="published">{lang === 'tr' ? 'Yayında' : 'Published'}</option>
              <option value="tamamlandi">{lang === 'tr' ? 'Tamamlandı' : 'Completed'}</option>
            </select>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">{lang === 'tr' ? 'Etiketler' : 'Tags'}</label>
          <input type="text" value={form.tags} onChange={set('tags')} className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] focus:outline-none focus:border-[var(--accent)]" />
        </div>

        {error && <p className="text-sm text-red-400 px-1">{error}</p>}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Link href="/dashboard" className="flex-1 text-center py-3 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)]">
            {lang === 'tr' ? 'İptal' : 'Cancel'}
          </Link>
          <button
            onClick={save}
            disabled={saving || !form.title.trim()}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 ${success ? 'bg-emerald-500' : ''}`}
            style={!success ? { background: 'linear-gradient(135deg,#d4840f,#e8a030)' } : {}}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : success ? <Check size={16} /> : <Save size={16} />}
            {success ? (lang === 'tr' ? 'Kaydedildi!' : 'Saved!') : (lang === 'tr' ? 'Değişiklikleri Kaydet' : 'Save Changes')}
          </button>
        </div>
      </div>
    </div>
  )
}

// 2. Ana bileşeni Suspense ile dışa aktarıyoruz
export default function EditStoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <Loader2 className="animate-spin text-[var(--accent)]" size={40} />
      </div>
    }>
      <EditStoryContent />
    </Suspense>
  )
}