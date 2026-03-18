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

export default function NewChapterPage() {
  const [storyTitle, setStoryTitle] = useState('')
  const [storySlug,  setStorySlug]  = useState('')
  const [title, setTitle]           = useState('')
  const [publish, setPublish]       = useState(false)
  const [showAI, setShowAI]         = useState(true)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [wordCount, setWordCount]   = useState(0)
  const [error, setError]           = useState('')
  const router       = useRouter()
  const searchParams = useSearchParams()
  const storyId      = searchParams.get('story')
  const supabase     = createClient()
  const { t, lang }  = useLang()

  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: lang === 'tr' ? 'Bölümün burada başlıyor...' : 'Your chapter begins here...' })],
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
      setStoryTitle(data.baslik); setStorySlug(data.slug); setLoading(false)
    }
    init()
  }, [storyId])

  const handleAIAccept = useCallback((text: string) => {
    editor?.chain().focus().insertContent('\n\n' + text).run()
  }, [editor])

  const save = async () => {
    if (!title.trim()) { setError(lang === 'tr' ? 'Bölüm başlığı gerekli' : 'Chapter title is required'); return }
    setSaving(true); setError('')
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 style={{ width: 28, height: 28 }} className="animate-spin text-[var(--accent)]" /></div>

  return (
    <div className="min-h-screen bg-[var(--bg)]">
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
            <button onClick={() => setShowAI(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-all">
              {showAI ? <PanelRightClose style={{ width: 13, height: 13 }} /> : <PanelRightOpen style={{ width: 13, height: 13 }} />}
              {t.aiPanel}
            </button>
            <button onClick={save} disabled={saving || !title.trim()}
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
              placeholder={t.chapterTitle}
              className="w-full px-4 py-3 mb-4 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] font-display text-xl transition-all" />

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
                <span className="font-mono">{wordCount} {t.words}</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={publish} onChange={e=>setPublish(e.target.checked)} className="w-3.5 h-3.5 accent-[var(--accent)]" />
                  {t.publishNow}
                </label>
              </div>
            </div>
            <div className="border border-[var(--border)] rounded-b-xl bg-[var(--card)] min-h-[500px] overflow-hidden">
              <EditorContent editor={editor} />
            </div>
            {error && <div className="mt-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
          </div>

          {showAI && (
            <div className="lg:col-span-1">
              <div className="sticky top-32">
                <AiWritingPanel currentText={editor?.getText()||''} onAccept={handleAIAccept} storyTitle={storyTitle} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
