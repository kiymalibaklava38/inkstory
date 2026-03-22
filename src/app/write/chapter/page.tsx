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
import { Save, ArrowLeft, Loader2, PanelRightOpen, PanelRightClose, FileUp } from 'lucide-react'
import Link from 'next/link'

// 1. Tüm sayfa mantığını içeren iç bileşen
function NewChapterContent() {
  const [storyTitle, setStoryTitle] = useState('')
  const [storySlug, setStorySlug] = useState('')
  const [title, setTitle] = useState('')
  const [publish, setPublish] = useState(false)
  const [showAI, setShowAI] = useState(true)
  const [showDocxImporter, setShowDocxImporter] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [error, setError] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const storyId = searchParams.get('story')
  const supabase = createClient()
  const { t, lang } = useLang()

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: lang === 'tr' ? 'Bölümün burada başlıyor...' : 'Your chapter begins here...' }),
    ],
    editorProps: { attributes: { class: 'ProseMirror' } },
    onUpdate: ({ editor }) => setWordCount(editor.getText().split(/\s+/).filter(Boolean).length),
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      if (!storyId) { router.push('/dashboard'); return }
      const { data } = await supabase.from('hikayeler').select('baslik,slug,yazar_id').eq('id', storyId).single()
      if (!data || data.yazar_id !== user.id) { router.push('/dashboard'); return }
      setStoryTitle(data.baslik)
      setStorySlug(data.slug)
      setLoading(false)
    }
    init()
  }, [storyId])

  const handleAIAccept = useCallback((text: string) => {
    editor?.chain().focus().insertContent('\n\n' + text).run()
  }, [editor])

  const save = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const content = editor?.getHTML() || ''
    const wc = editor?.getText().split(/\s+/).filter(Boolean).length || 0
    const { data: last } = await supabase.from('bolumler').select('bolum_no').eq('hikaye_id', storyId!).order('bolum_no', { ascending: false }).limit(1).single()
    const { error: err } = await supabase.from('bolumler').insert({
      hikaye_id: storyId!, yazar_id: user.id, baslik: title,
      icerik: content, bolum_no: (last?.bolum_no || 0) + 1, kelime_sayisi: wc, yayinda: publish,
    })
    if (err) { setError(err.message); setSaving(false); return }
    router.push(`/story/${storySlug}`)
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
            <Link href="/dashboard" className="p-2 rounded-xl text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-all flex-shrink-0">
              <ArrowLeft style={{ width: 17, height: 17 }} />
            </Link>
            <div className="min-w-0">
              <p className="text-xs text-[var(--fg-muted)] uppercase tracking-wider">{lang === 'tr' ? 'Yeni Bölüm' : 'New Chapter'}</p>
              <p className="font-display font-semibold text-[var(--fg)] truncate text-sm">{storyTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-mono text-[var(--fg-muted)] hidden sm:block">{wordCount} {t.words}</span>
            <button
              onClick={() => setShowDocxImporter(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                showDocxImporter ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)]'
              }`}
            >
              <FileUp style={{ width: 12, height: 12 }} />
              {lang === 'tr' ? 'Word' : 'Word'}
            </button>

            <button
              onClick={() => setShowAI(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs text-[var(--fg-muted)]"
            >
              {showAI ? <PanelRightClose style={{ width: 13, height: 13 }} /> : <PanelRightOpen style={{ width: 13, height: 13 }} />}
              {t.aiPanel}
            </button>

            <button
              onClick={save}
              disabled={saving || !title.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}
            >
              {saving ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Save style={{ width: 14, height: 14 }} />}
              {t.saveChanges}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className={`grid gap-8 ${showAI ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
          <div className={showAI ? 'lg:col-span-2' : ''}>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={lang === 'tr' ? 'Bölüm başlığı...' : 'Chapter title...'}
              className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl px-6 py-4 text-xl font-display font-semibold transition-colors"
            />
            {showDocxImporter && (
              <div className="mb-4 p-4 bg-[var(--card)] border border-[var(--accent)]/30 rounded-2xl">
                <DocxImporter onImport={(html) => {
                  if (editor) { editor.commands.setContent(html); editor.commands.focus(); }
                  setShowDocxImporter(false)
                }} />
              </div>
            )}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden min-h-[500px]">
              <EditorContent editor={editor} />
            </div>
          </div>

          {showAI && (
            <div className="lg:col-span-1">
              <div className="sticky top-32">
                <AiWritingPanel currentText={editor?.getText() || ''} onAccept={handleAIAccept} storyTitle={storyTitle} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 2. Ana export fonksiyonu Suspense sarmalıyla
export default function NewChapterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <Loader2 className="animate-spin text-[var(--accent)]" size={40} />
      </div>
    }>
      <NewChapterContent />
    </Suspense>
  )
}