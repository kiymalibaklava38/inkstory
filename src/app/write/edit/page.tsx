'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n'
import { Save, ArrowLeft, Loader2, Check } from 'lucide-react'
import Link from 'next/link'
import { ALL_CATEGORIES } from '@/lib/categories'
import { validateImageClient } from '@/lib/upload-security'

function EditStoryForm() {
  const [form, setForm] = useState({
    title: '', description: '', categoryId: '', tags: '', status: 'draft' as 'draft' | 'published' | 'tamamlandi'
  })
  const [coverFile, setCoverFile]     = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [currentCover, setCurrentCover] = useState<string | null>(null)
  const [storySlug, setStorySlug]     = useState('')
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [success, setSuccess]         = useState(false)
  const [error, setError]             = useState('')

  const router       = useRouter()
  const searchParams = useSearchParams()
  const storyId      = searchParams.get('id')
  const supabase     = createClient()
  const { lang }     = useLang()

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
        taslak:       'draft',
        yayinda:      'published',
        tamamlandi:   'tamamlandi',
      }

      setForm({
        title:       data.baslik || '',
        description: data.aciklama || '',
        categoryId:  data.kategoriler?.slug || '',
        tags:        (data.etiketler || []).join(', '),
        status:      statusMap[data.durum] || 'draft',
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
      draft:        'taslak',
      published:    'yayinda',
      tamamlandi:   'tamamlandi',
    }

    const { error: updateErr } = await supabase
      .from('hikayeler')
      .update({
        baslik:      form.title,
        aciklama:    form.description || null,
        kategori_id: numericCategoryId,
        etiketler:   tags,
        durum:       durumMap[form.status],
        updated_at:  new Date().toISOString(),
      })
      .eq('id', storyId!)

    if (updateErr) { setError(updateErr.message); setSaving(false); return }

    // Upload new cover if selected
    if (coverFile) {
      const fd = new FormData()
      fd.append('file', coverFile)
      fd.append('storyId', storyId!)
      await fetch('/api/upload/cover', { method: 'POST', body: fd })
    }

    // Remove cover if cleared
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
        <Link href="/dashboard"
          className="p-2 rounded-xl text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-all">
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
          <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">
            {lang === 'tr' ? 'Kapak Resmi' : 'Cover Image'}
          </label>
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
                <p className="text-xs opacity-60">JPG, PNG, WebP · Max 5MB</p>
              </div>
            )}
          </div>
          <input id="cover-edit-input" type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={async e => {
              const f = e.target.files?.[0]
              if (!f) return
              const result = await validateImageClient(f, 'cover')
              if (!result.ok) { alert(result.error); return }
              setCoverFile(f)
              setCoverPreview(URL.createObjectURL(f))
            }}
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">
            {lang === 'tr' ? 'Başlık' : 'Title'} *
          </label>
          <input type="text" value={form.title} onChange={set('title')}
            className="w-full px-4 py-3.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] font-display text-lg transition-all"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">
            {lang === 'tr' ? 'Açıklama' : 'Description'}
          </label>
          <textarea value={form.description} onChange={set('description')} rows={4}
            placeholder={lang === 'tr' ? 'Hikayeni anlat...' : 'Tell your story...'}
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] resize-none transition-all"
          />
        </div>

        {/* Genre + Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">
              {lang === 'tr' ? 'Kategori' : 'Genre'}
            </label>
            <select value={form.categoryId} onChange={set('categoryId')}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] focus:outline-none focus:border-[var(--accent)] transition-all">
              <option value="">{lang === 'tr' ? 'Seç...' : 'Select...'}</option>
              {ALL_CATEGORIES.map(cat => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.ikon} {lang === 'tr' ? cat.tr : cat.en}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">
              {lang === 'tr' ? 'Durum' : 'Status'}
            </label>
            <select value={form.status} onChange={set('status')}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] focus:outline-none focus:border-[var(--accent)] transition-all">
              <option value="draft">{lang === 'tr' ? 'Taslak' : 'Draft'}</option>
              <option value="published">{lang === 'tr' ? 'Yayında' : 'Published'}</option>
              <option value="tamamlandi">{lang === 'tr' ? 'Tamamlandı' : 'Completed'}</option>
            </select>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">
            {lang === 'tr' ? 'Etiketler' : 'Tags'}
            <span className="text-[var(--fg-muted)] font-normal ml-1">({lang === 'tr' ? 'virgülle ayır' : 'comma separated'})</span>
          </label>
          <input type="text" value={form.tags} onChange={set('tags')}
            placeholder={lang === 'tr' ? 'aşk, macera, gizem...' : 'romance, adventure, mystery...'}
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] transition-all"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 px-1">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Link href="/dashboard"
            className="flex-1 text-center py-3 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] transition-all">
            {lang === 'tr' ? 'İptal' : 'Cancel'}
          </Link>
          <button
            onClick={save}
            disabled={saving || !form.title.trim()}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50 ${success ? 'bg-emerald-500' : ''}`}
            style={!success ? { background: 'linear-gradient(135deg,#d4840f,#e8a030)' } : {}}
          >
            {saving
              ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
              : success
                ? <Check style={{ width: 16, height: 16 }} />
                : <Save style={{ width: 16, height: 16 }} />}
            {success
              ? (lang === 'tr' ? 'Kaydedildi!' : 'Saved!')
              : (lang === 'tr' ? 'Değişiklikleri Kaydet' : 'Save Changes')}
          </button>
        </div>
      </div>
    </div>
  )
}

import { Suspense } from 'react'
export default function EditStoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 style={{ width: 28, height: 28 }} className="animate-spin text-[var(--accent)]" /></div>}>
      <EditStoryForm />
    </Suspense>
  )
}
