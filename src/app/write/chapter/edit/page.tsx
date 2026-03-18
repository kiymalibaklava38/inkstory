'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { AiWritingPanel } from '@/components/ai/AiWritingPanel'
import { useLang } from '@/lib/i18n'
import { Save, ArrowLeft, Loader2, PanelRightOpen, PanelRightClose } from 'lucide-react'
import Link from 'next/link'

export default function EditChapterPage() {
  const [title, setTitle]     = useState('')
  const [publish, setPublish] = useState(false)
  const [showAI, setShowAI]   = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState('')
  const [wordCount, setWordCount] = useState(0)
  const router       = useRouter()
  const searchParams = useSearchParams()
  const chapterId    = searchParams.get('id')
  const supabase     = createClient()
  const { t, lang }  = useLang()

  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: lang === 'tr' ? 'Bölüm içeriği...' : 'Your chapter content...' })],
    editorProps: { attributes: { class: 'ProseMirror' } },
    onUpdate: ({ editor }) => setWordCount(editor.getText().split(/\s+/).filter(Boolean).length),
  })

  useEffect(() => {
    const init = async () => {
      if (!chapterId || !editor) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('bolumler').select('*').eq('id', chapterId).eq('yazar_id', user.id).single()
      if (!data) { router.push('/dashboard'); return }
      setTitle(data.baslik); setPublish(data.yayinda)
      editor.commands.setContent(data.icerik || '')
      setWordCount(data.kelime_sayisi || 0); setLoading(false)
    }
    if (editor) init()
  }, [chapterId, editor])

  const handleAIAccept = useCallback((text: string) => {
    editor?.chain().focus().insertContent('\n\n' + text).run()
  }, [editor])

  const save = async () => {
    if (!title.trim()) { setError(lang === 'tr' ? 'Başlık gerekli' : 'Title is required'); return }
    setSaving(true); setError(''); setSuccess(false)
    const content = editor?.getHTML() || ''
    const wc = editor?.getText().split(/\s+/).filter(Boolean).length || 0
    const { error: err } = await supabase.from('bolumler').update({
      baslik: title, icerik: content, kelime_sayisi: wc,
      yayinda: publish, updated_at: new Date().toISOString(),
    }).eq('id', chapterId)
    if (err) { setError(err.message); setSaving(false); return }
    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 1500)
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 style={{ width: 28, height: 28 }} className="animate-spin text-[var(--accent)]" /></div>

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="sticky top-16 z-40 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 rounded-xl text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-all">
              <ArrowLeft style={{ width: 17, height: 17 }} />
            </Link>
            <div>
              <p className="text-xs text-[var(--fg-muted)] uppercase tracking-wider">{lang === 'tr' ? 'Bölümü Düzenle' : 'Edit Chapter'}</p>
              <p className="font-display font-semibold text-[var(--fg)] text-sm truncate max-w-[200px]">{title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[var(--fg-muted)] hidden sm:block">{wordCount} {t.words}</span>
            <button onClick={() => setShowAI(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-all">
              {showAI ? <PanelRightClose style={{ width: 13, height: 13 }} /> : <PanelRightOpen style={{ width: 13, height: 13 }} />}
              {t.aiPanel}
            </button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white hover:scale-105 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
              {saving ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Save style={{ width: 14, height: 14 }} />}
              {t.saveChanges}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className={`grid gap-6 ${showAI ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
          <div className={showAI ? 'lg:col-span-2' : ''}>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-3 mb-4 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] focus:outline-none focus:border-[var(--accent)] font-display text-xl transition-all" />

            <div className="flex items-center gap-1 px-3 py-2 border border-[var(--border)] border-b-0 rounded-t-xl bg-[var(--bg-subtle)]">
              {[
                { l:'B', a:()=>editor?.chain().focus().toggleBold().run(),              active:editor?.isActive('bold') },
                { l:'I', a:()=>editor?.chain().focus().toggleItalic().run(),            active:editor?.isActive('italic') },
                { l:'H2',a:()=>editor?.chain().focus().toggleHeading({level:2}).run(), active:editor?.isActive('heading') },
                { l:'—', a:()=>editor?.chain().focus().setHorizontalRule().run(),       active:false },
              ].map((b,i)=>(
                <button key={i} onClick={b.a}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold font-mono transition-colors ${b.active?'bg-[var(--accent)] text-white':'text-[var(--fg-muted)] hover:bg-[var(--border)] hover:text-[var(--fg)]'}`}>
                  {b.l}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-3 text-xs text-[var(--fg-muted)]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={publish} onChange={e=>setPublish(e.target.checked)} className="w-3.5 h-3.5 accent-[var(--accent)]" />
                  {lang === 'tr' ? 'Yayında' : 'Published'}
                </label>
              </div>
            </div>
            <div className="border border-[var(--border)] rounded-b-xl bg-[var(--card)] min-h-[500px] overflow-hidden">
              <EditorContent editor={editor} />
            </div>
            {error   && <div className="mt-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
            {success && <div className="mt-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              {lang === 'tr' ? '✓ Kaydedildi! Yönlendiriliyorsunuz...' : '✓ Saved! Redirecting...'}
            </div>}
          </div>

          {showAI && (
            <div className="lg:col-span-1">
              <div className="sticky top-32">
                <AiWritingPanel currentText={editor?.getText()||''} onAccept={handleAIAccept} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
