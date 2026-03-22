'use client'

import { useState, useEffect, useCallback, Suspense } from 'react' // Suspense eklendi
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { DocxImporter } from '@/components/ui/DocxImporter'
import { AiWritingPanel } from '@/components/ai/AiWritingPanel'
import { useLang } from '@/lib/i18n'
import { Save, ArrowLeft, Loader2, PanelRightOpen, PanelRightClose, FileUp, Check } from 'lucide-react'
import Link from 'next/link'

// 1. Mevcut tüm sayfa mantığını buraya taşıyoruz
function EditChapterContent() {
  const [title, setTitle] = useState('')
  const [publish, setPublish] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [showDocxImporter, setShowDocxImporter] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [storySlug, setStorySlug] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const chapterId = searchParams.get('id')
  const supabase = createClient()
  const { t, lang } = useLang()

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: lang === 'tr' ? 'Bölüm içeriği...' : 'Your chapter content...' }),
    ],
    editorProps: { attributes: { class: 'ProseMirror' } },
    onUpdate: ({ editor }) => setWordCount(editor.getText().split(/\s+/).filter(Boolean).length),
  })

  useEffect(() => {
    const init = async () => {
      if (!chapterId || !editor) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('bolumler')
        .select('*, hikayeler(slug)')
        .eq('id', chapterId)
        .eq('yazar_id', user.id)
        .single()
      if (!data) { router.push('/dashboard'); return }
      setTitle(data.baslik)
      setPublish(data.yayinda)
      editor.commands.setContent(data.icerik || '')
      setWordCount(data.kelime_sayisi || 0)
      setStorySlug((data.hikayeler as any)?.slug || '')
      setLoading(false)
    }
    init()
  }, [chapterId, editor])

  const handleAIAccept = useCallback((text: string) => {
    editor?.chain().focus().insertContent('\n\n' + text).run()
  }, [editor])

  const save = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    setError('')
    setSuccess(false)
    const content = editor?.getHTML() || ''
    const wc = editor?.getText().split(/\s+/).filter(Boolean).length || 0
    const { error: err } = await supabase
      .from('bolumler')
      .update({ baslik: title, icerik: content, kelime_sayisi: wc, yayinda: publish })
      .eq('id', chapterId!)
    if (err) { setError(err.message); setSaving(false); return }
    setSuccess(true)
    setSaving(false)
    setTimeout(() => setSuccess(false), 3000)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 style={{ width: 28, height: 28 }} className="animate-spin text-[var(--accent)]" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Sticky toolbar */}
      <div className="sticky top-16 z-40 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={storySlug ? `/story/${storySlug}` : '/dashboard'}
              className="p-2 rounded-xl text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-all flex-shrink-0">
              <ArrowLeft style={{ width: 17, height: 17 }} />
            </Link>
            <div className="min-w-0">
              <p className="text-xs text-[var(--fg-muted)] uppercase tracking-wider">{lang === 'tr' ? 'Bölümü Düzenle' : 'Edit Chapter'}</p>
              <p className="font-display font-semibold text-[var(--fg)] truncate text-sm">{title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-mono text-[var(--fg-muted)] hidden sm:block">{wordCount} {t.words}</span>
            <button
              onClick={() => setShowDocxImporter(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                showDocxImporter
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                  : 'border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--accent)]/40'
              }`}
            >
              <FileUp style={{ width: 12, height: 12 }} />
              Word
            </button>

            <button
              onClick={() => setShowAI(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-all"
            >
              {showAI ? <PanelRightClose style={{ width: 13, height: 13 }} /> : <PanelRightOpen style={{ width: 13, height: 13 }} />}
              {t.aiPanel}
            </button>

            <button
              onClick={save}
              disabled={saving || !title.trim()}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white hover:scale-105 transition-all disabled:opacity-50 ${success ? 'bg-emerald-500' : ''}`}
              style={!success ? { background: 'linear-gradient(135deg,#d4840f,#e8a030)' } : {}}
            >
              {saving ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : success ? <Check style={{ width: 14, height: 14 }} /> : <Save style={{ width: 14, height: 14 }} />}
              {success ? (lang === 'tr' ? 'Kaydedildi!' : 'Saved!') : t.saveChanges}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className={`grid gap-8 ${showAI ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
          <div className={showAI ? 'lg:col-span-2' : ''}>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={lang === 'tr' ? 'Bölüm başlığı...' : 'Chapter title...'}
              className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl px-6 py-4 text-xl font-display font-semibold text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] mb-4 transition-colors"
            />

            {showDocxImporter && (
              <div className="mb-4 p-4 bg-[var(--card)] border border-[var(--accent)]/30 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-[var(--fg)]">
                    📄 {lang === 'tr' ? 'Word Dosyasını İçe Aktar' : 'Import Word File'}
                  </p>
                  <button onClick={() => setShowDocxImporter(false)} className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg)]">✕</button>
                </div>
                <DocxImporter onImport={(html) => {
                  if (editor) { editor.commands.setContent(html); editor.commands.focus(); }
                  setShowDocxImporter(false)
                }} />
              </div>
            )}

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-subtle)]">
                <div className="flex items-center gap-1">
                  {[
                    { label: 'B', action: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive('bold') },
                    { label: 'I', action: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive('italic') },
                    { label: 'H2', action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: editor?.isActive('heading', { level: 2 }) },
                  ].map(btn => (
                    <button key={btn.label} onClick={btn.action} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${btn.active ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-[var(--fg-muted)]'}`}>
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="min-h-[500px]">
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>

          {showAI && (
            <div className="lg:col-span-1">
              <div className="sticky top-32">
                <AiWritingPanel currentText={editor?.getText() || ''} onAccept={handleAIAccept} storyTitle={title} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 2. Ana export bileşeni Suspense sarmalı
export default function EditChapterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <Loader2 className="animate-spin text-[var(--accent)]" size={40} />
      </div>
    }>
      <EditChapterContent />
    </Suspense>
  )
}