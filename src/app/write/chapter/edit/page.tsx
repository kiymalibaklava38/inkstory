'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { DocxImporter } from '@/components/ui/DocxImporter'
import { AiWritingPanel } from '@/components/ai/AiWritingPanel'
import { useLang } from '@/lib/i18n'
import { Save, ArrowLeft, Loader2, PanelRightOpen, PanelRightClose, FileUp, Check, Cloud, CloudOff } from 'lucide-react'
import Link from 'next/link'

// 1. Dışa aktarılan ana bileşen (Suspense sarmalayıcısı)
export default function EditChapterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 style={{ width: 28, height: 28 }} className="animate-spin text-[var(--accent)]" />
      </div>
    }>
      <EditChapterContent />
    </Suspense>
  )
}

// 2. Asıl sayfa mantığının bulunduğu bileşen
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
  
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [autoSaveTime, setAutoSaveTime] = useState<string | null>(null)
  
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)
  const isDirty = useRef(false)

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
    onUpdate: ({ editor }) => {
      setWordCount(editor.getText().split(/\s+/).filter(Boolean).length)
      isDirty.current = true
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      autoSaveTimer.current = setTimeout(() => triggerAutoSave(), 3000)
    },
  })

  const triggerAutoSave = useCallback(async () => {
    if (!chapterId || !isDirty.current) return
    setAutoSaveStatus('saving')
    try {
      const res = await fetch('/api/autosave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bolumId: chapterId,
          baslik: title,
          icerik: editor?.getHTML() || '',
        }),
      })
      if (res.ok) {
        isDirty.current = false
        setAutoSaveStatus('saved')
        setAutoSaveTime(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }))
        setTimeout(() => setAutoSaveStatus('idle'), 3000)
      } else {
        setAutoSaveStatus('error')
      }
    } catch {
      setAutoSaveStatus('error')
    }
  }, [chapterId, title, editor])

  useEffect(() => {
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [])

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
  }, [chapterId, editor, router, supabase])

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
            <button onClick={save} disabled={saving || !title.trim()} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white hover:scale-105 transition-all ${success ? 'bg-emerald-500' : ''}`} style={!success ? { background: 'linear-gradient(135deg,#d4840f,#e8a030)' } : {}}>
              {saving ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : success ? <Check style={{ width: 14, height: 14 }} /> : <Save style={{ width: 14, height: 14 }} />}
              {success ? (lang === 'tr' ? 'Kaydedildi!' : 'Saved!') : t.saveChanges}
            </button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className={`grid gap-8 ${showAI ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
          <div className={showAI ? 'lg:col-span-2' : ''}>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl px-6 py-4 text-xl" />
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl mt-4 min-h-[500px]">
              <EditorContent editor={editor} />
            </div>
          </div>
          {showAI && (
            <div className="lg:col-span-1">
              <AiWritingPanel currentText={editor?.getText() || ''} onAccept={handleAIAccept} storyTitle={title} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}