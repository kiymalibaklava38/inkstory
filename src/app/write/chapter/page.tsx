'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { DocxImporter } from '@/components/ui/DocxImporter'
import { AiWritingPanel } from '@/components/ai/AiWritingPanel'
import { useLang } from '@/lib/i18n'
import { Save, ArrowLeft, Loader2, PanelRightOpen, PanelRightClose, FileUp, Cloud, CloudOff } from 'lucide-react'
import Link from 'next/link'

function NewChapterForm() {
  const [storyTitle, setStoryTitle]         = useState('')
  const [storySlug,  setStorySlug]          = useState('')
  const [title, setTitle]                   = useState('')
  const [publish, setPublish]               = useState(false)
  const [showAI, setShowAI]                 = useState(true)
  const [showDocxImporter, setShowDocxImporter] = useState(false)
  const [loading, setLoading]               = useState(true)
  const [saving, setSaving]                 = useState(false)
  const [wordCount, setWordCount]           = useState(0)
  const [error, setError]                   = useState('')
  const [savedChapterId, setSavedChapterId] = useState<string | null>(null)
  // Otomatik kayıt
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle'|'saving'|'saved'|'error'>('idle')
  const [autoSaveTime, setAutoSaveTime]     = useState<string|null>(null)
  const autoSaveTimer = useRef<NodeJS.Timeout|null>(null)
  const isDirty = useRef(false)

  const router       = useRouter()
  const searchParams = useSearchParams()
  const storyId      = searchParams.get('story')
  const supabase     = createClient()
  const { t, lang }  = useLang()

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: lang === 'tr' ? 'Bölümün burada başlıyor...' : 'Your chapter begins here...' }),
    ],
    editorProps: { attributes: { class: 'ProseMirror' } },
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      setWordCount(editor.getText().split(/\s+/).filter(Boolean).length)
      isDirty.current = true
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      autoSaveTimer.current = setTimeout(() => triggerDraftSave(), 3000)
    },
  })

  // Yeni bölümde autosave: localStorage'a kaydet (bölüm henüz DB'de yok)
  const triggerDraftSave = useCallback(() => {
    if (!isDirty.current || !storyId) return
    try {
      const draft = {
        title,
        content: editor?.getHTML() || '',
        savedAt: new Date().toISOString(),
        storyId,
      }
      localStorage.setItem(`chapter_draft_${storyId}`, JSON.stringify(draft))
      isDirty.current = false
      setAutoSaveStatus('saved')
      setAutoSaveTime(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }))
      setTimeout(() => setAutoSaveStatus('idle'), 3000)
    } catch {
      setAutoSaveStatus('error')
    }
  }, [storyId, title, editor])

  useEffect(() => {
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [])

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
    const bolumNo = (last?.bolum_no || 0) + 1
    const { data: newBolum, error: err } = await supabase.from('bolumler').insert({
      hikaye_id: storyId!, yazar_id: user.id, baslik: title,
      icerik: content, bolum_no: bolumNo, kelime_sayisi: wc, yayinda: publish,
    }).select('id').single()
    if (err) { setError(err.message); setSaving(false); return }

    // Yayınlandıysa abonelere bildirim gönder (non-blocking)
    if (publish && newBolum?.id) {
      fetch('/api/notify/chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hikayeId: storyId, bolumId: newBolum.id, bolumNo, bolumBaslik: title }),
      }).catch(() => {})
    }

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

            {/* Otomatik kayıt */}
            {autoSaveStatus === 'saving' && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-[var(--fg-muted)]">
                <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" /> Kaydediliyor...
              </span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-emerald-400">
                <Cloud style={{ width: 11, height: 11 }} /> {autoSaveTime}
              </span>
            )}
            {autoSaveStatus === 'error' && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-red-400">
                <CloudOff style={{ width: 11, height: 11 }} /> Kaydedilemedi
              </span>
            )}

            {/* Word import button */}
            <button
              onClick={() => setShowDocxImporter(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                showDocxImporter
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                  : 'border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--accent)]/40'
              }`}
            >
              <FileUp style={{ width: 12, height: 12 }} />
              {lang === 'tr' ? 'Word' : 'Word'}
            </button>

            {/* AI Panel button */}
            <button
              onClick={() => setShowAI(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-all"
            >
              {showAI ? <PanelRightClose style={{ width: 13, height: 13 }} /> : <PanelRightOpen style={{ width: 13, height: 13 }} />}
              {t.aiPanel}
            </button>

            {/* Save button */}
            <button
              onClick={save}
              disabled={saving || !title.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white hover:scale-105 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}
            >
              {saving ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Save style={{ width: 14, height: 14 }} />}
              {t.saveChanges}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className={`grid gap-8 ${showAI ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
          <div className={showAI ? 'lg:col-span-2' : ''}>

            {/* Title input */}
            <input
              type="text"
              value={title}
              onChange={e => {
                setTitle(e.target.value)
                isDirty.current = true
                if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
                autoSaveTimer.current = setTimeout(() => triggerDraftSave(), 3000)
              }}
              placeholder={lang === 'tr' ? 'Bölüm başlığı...' : 'Chapter title...'}
              className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl px-6 py-4 text-xl font-display font-semibold text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] mb-4 transition-colors"
            />

            {/* Word import panel */}
            {showDocxImporter && (
              <div className="mb-4 p-4 bg-[var(--card)] border border-[var(--accent)]/30 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-[var(--fg)]">
                    📄 {lang === 'tr' ? 'Word Dosyasını İçe Aktar' : 'Import Word File'}
                  </p>
                  <button
                    onClick={() => setShowDocxImporter(false)}
                    className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] px-2 py-1 rounded-lg hover:bg-[var(--bg-subtle)] transition-all"
                  >
                    ✕ {lang === 'tr' ? 'Kapat' : 'Close'}
                  </button>
                </div>
                <DocxImporter onImport={(html) => {
                  if (editor) {
                    editor.commands.setContent(html)
                    editor.commands.focus()
                  }
                  setShowDocxImporter(false)
                }} />
              </div>
            )}

            {/* Editor */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-subtle)]">
                <div className="flex items-center gap-1">
                  {[
                    { label: 'B', action: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive('bold') },
                    { label: 'I', action: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive('italic') },
                    { label: 'H2', action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: editor?.isActive('heading', { level: 2 }) },
                    { label: '—', action: () => editor?.chain().focus().setHorizontalRule().run(), active: false },
                  ].map(btn => (
                    <button key={btn.label}
                      onClick={btn.action}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${btn.active ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]'}`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-3 text-xs text-[var(--fg-muted)]">
                  <span className="font-mono">{wordCount} {t.words}</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)} className="w-3.5 h-3.5 accent-[var(--accent)]" />
                    {t.publishNow}
                  </label>
                </div>
              </div>
              <div className="min-h-[500px]">
                <EditorContent editor={editor} />
              </div>
            </div>

            {error && (
              <div className="mt-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* AI Panel */}
          {showAI && (
            <div className="lg:col-span-1">
              <div className="sticky top-32">
                <AiWritingPanel
                  currentText={editor?.getText() || ''}
                  onAccept={handleAIAccept}
                  storyTitle={storyTitle}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { Suspense } from 'react'
export default function NewChapterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full w-8 h-8 border-2 border-[var(--accent)] border-t-transparent" /></div>}>
      <NewChapterForm />
    </Suspense>
  )
}
