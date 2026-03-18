'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { AiWritingPanel } from '@/components/ai/AiWritingPanel'
import { useLang } from '@/lib/i18n'
import { Save, ArrowLeft, Loader2, ChevronRight, PanelRightOpen, PanelRightClose } from 'lucide-react'
import Link from 'next/link'
import slugify from 'slugify'

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

type Step = 'meta' | 'write'

export default function WritePage() {
  const [step, setStep]             = useState<Step>('meta')
  const [categories, setCategories] = useState<any[]>([])
  const [showAI, setShowAI]         = useState(true)
  const [saving, setSaving]         = useState(false)
  const [storyId, setStoryId]       = useState<string | null>(null)
  const [storySlug, setStorySlug]   = useState<string | null>(null)
  const [wordCount, setWordCount]   = useState(0)
  const [meta, setMeta] = useState({ title: '', description: '', categoryId: '', tags: '', status: 'draft' as 'draft' | 'published' })
  const [chapter, setChapter] = useState({ title: '', publish: false })

  const router   = useRouter()
  const supabase = createClient()
  const { t, lang } = useLang()

  const editorPlaceholder = lang === 'tr' ? 'Hikayene buradan başla...' : 'Your story begins here...'

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: editorPlaceholder }),
    ],
    editorProps: { attributes: { class: 'ProseMirror' } },
    onUpdate: ({ editor }) => setWordCount(editor.getText().split(/\s+/).filter(Boolean).length),
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login?redirect=/write')
    })
    supabase.from('kategoriler').select('*').order('id').then(({ data }) => setCategories(data || []))
  }, [])

  const handleAIAccept = useCallback((text: string) => {
    editor?.chain().focus().insertContent('\n\n' + text).run()
  }, [editor])

  const saveMeta = async () => {
    if (!meta.title.trim()) return alert(lang === 'tr' ? 'Başlık gerekli' : 'Title is required')
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const slug = `${slugify(meta.title, { lower: true, strict: true })}-${Date.now()}`
    const tags = meta.tags.split(',').map(t2 => t2.trim()).filter(Boolean)
    const { data, error } = await supabase.from('hikayeler').insert({
      yazar_id: user.id, baslik: meta.title, slug,
      aciklama: meta.description || null,
      kategori_id: meta.categoryId ? parseInt(meta.categoryId) : null,
      etiketler: tags,
      durum: meta.status === 'published' ? 'yayinda' : 'taslak',
    }).select().single()
    if (error) { alert(error.message); setSaving(false); return }
    setStoryId(data.id); setStorySlug(data.slug); setStep('write'); setSaving(false)
  }

  const saveChapter = async () => {
    if (!chapter.title.trim()) return alert(lang === 'tr' ? 'Bölüm başlığı gerekli' : 'Chapter title is required')
    if (!storyId) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const content = editor?.getHTML() || ''
    const wc = editor?.getText().split(/\s+/).filter(Boolean).length || 0
    const { data: lastChapter } = await supabase.from('bolumler').select('bolum_no')
      .eq('hikaye_id', storyId).order('bolum_no', { ascending: false }).limit(1).single()
    const { error } = await supabase.from('bolumler').insert({
      hikaye_id: storyId, yazar_id: user.id, baslik: chapter.title,
      icerik: content, bolum_no: (lastChapter?.bolum_no || 0) + 1,
      kelime_sayisi: wc, yayinda: chapter.publish,
    })
    if (error) { alert(error.message); setSaving(false); return }
    router.push(`/story/${storySlug}`)
  }

  const setM = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setMeta(m => ({ ...m, [k]: e.target.value }))

  // Step labels
  const step1Label = lang === 'tr' ? '1 Hikaye Bilgileri' : '1 Story Info'
  const step2Label = lang === 'tr' ? '2 Bölüm Yaz'       : '2 Write Chapter'

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Top bar */}
      <div className="sticky top-16 z-40 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 rounded-xl text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-all">
              <ArrowLeft style={{ width: 18, height: 18 }} />
            </Link>
            <div className="flex items-center gap-2 text-sm">
              <span className={`px-3 py-1 rounded-full font-medium ${step === 'meta' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]'}`}>
                {step1Label}
              </span>
              <ChevronRight style={{ width: 14, height: 14 }} className="text-[var(--fg-muted)]" />
              <span className={`px-3 py-1 rounded-full font-medium ${step === 'write' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]'}`}>
                {step2Label}
              </span>
            </div>
          </div>

          {step === 'write' && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--fg-muted)] font-mono">{wordCount} {t.words}</span>
              <button onClick={() => setShowAI(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-all">
                {showAI ? <PanelRightClose style={{ width: 14, height: 14 }} /> : <PanelRightOpen style={{ width: 14, height: 14 }} />}
                {t.aiPanel}
              </button>
              <button onClick={saveChapter} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                {saving ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Save style={{ width: 14, height: 14 }} />}
                {t.saveChanges}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Step 1: Meta */}
      {step === 'meta' && (
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-[var(--fg)]">{t.newStoryTitle}</h1>
            <p className="text-[var(--fg-muted)] mt-1">{t.setupStory}</p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">{t.storyTitle} *</label>
              <input type="text" value={meta.title} onChange={setM('title')}
                placeholder={t.titlePlaceholder}
                className="w-full px-4 py-3.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 font-display text-lg transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">{t.description}</label>
              <textarea value={meta.description} onChange={setM('description')} rows={3}
                placeholder={t.descPlaceholder}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] resize-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">{t.genre}</label>
                <select value={meta.categoryId} onChange={setM('categoryId')}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] focus:outline-none focus:border-[var(--accent)] transition-all">
                  <option value="">{t.selectGenre}</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.ikon} {CATEGORY_NAMES[c.slug]?.[lang] ?? c.ad}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">{t.status}</label>
                <select value={meta.status} onChange={setM('status')}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] focus:outline-none focus:border-[var(--accent)] transition-all">
                  <option value="draft">{t.statusDraft}</option>
                  <option value="published">{t.statusPublished}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">{t.tags}</label>
              <input type="text" value={meta.tags} onChange={setM('tags')}
                placeholder={t.tagsPlaceholder}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] transition-all"
              />
            </div>

            <button onClick={saveMeta} disabled={saving || !meta.title.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
              {saving
                ? <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" />
                : <>{t.continueWrite} <ChevronRight style={{ width: 18, height: 18 }} /></>}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Write */}
      {step === 'write' && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className={`grid gap-6 ${showAI ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
            <div className={showAI ? 'lg:col-span-2' : ''}>
              <input type="text" value={chapter.title}
                onChange={e => setChapter(c => ({ ...c, title: e.target.value }))}
                placeholder={t.chapterTitle}
                className="w-full px-4 py-3 mb-4 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] font-display text-xl transition-all"
              />

              {/* Toolbar */}
              <div className="flex items-center gap-1 px-3 py-2 border border-[var(--border)] border-b-0 rounded-t-xl bg-[var(--bg-subtle)]">
                {[
                  { label: 'B', title: lang === 'tr' ? 'Kalın'   : 'Bold',    action: () => editor?.chain().focus().toggleBold().run(),             active: editor?.isActive('bold') },
                  { label: 'I', title: lang === 'tr' ? 'İtalik'  : 'Italic',  action: () => editor?.chain().focus().toggleItalic().run(),           active: editor?.isActive('italic') },
                  { label: 'H2',title: lang === 'tr' ? 'Başlık'  : 'Heading', action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: editor?.isActive('heading') },
                  { label: '—', title: lang === 'tr' ? 'Ayraç'   : 'Divider', action: () => editor?.chain().focus().setHorizontalRule().run(),       active: false },
                ].map((btn, i) => (
                  <button key={i} title={btn.title} onClick={btn.action}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold font-mono transition-colors ${btn.active ? 'bg-[var(--accent)] text-white' : 'text-[var(--fg-muted)] hover:bg-[var(--border)] hover:text-[var(--fg)]'}`}>
                    {btn.label}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-3 text-xs text-[var(--fg-muted)]">
                  <span className="font-mono">{wordCount} {t.words}</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={chapter.publish}
                      onChange={e => setChapter(c => ({ ...c, publish: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded accent-[var(--accent)]" />
                    {t.publishNow}
                  </label>
                </div>
              </div>

              <div className="border border-[var(--border)] rounded-b-xl bg-[var(--card)] min-h-[500px] overflow-hidden">
                <EditorContent editor={editor} />
              </div>
            </div>

            {showAI && (
              <div className="lg:col-span-1">
                <div className="sticky top-32">
                  <AiWritingPanel currentText={editor?.getText() || ''} onAccept={handleAIAccept} storyTitle={meta.title} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
