'use client'

import { useState } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { useLang } from '@/lib/i18n'
import { GENRE_CATEGORIES, LITERARY_CATEGORIES, type Category } from '@/lib/categories'

interface Props {
  initial?:  string[]
  onSave:    (categories: string[]) => void
  onSkip?:   () => void
  isModal?:  boolean
}

function CatCard({ cat, selected, onToggle, lang }: {
  cat: Category; selected: boolean; onToggle: (slug: string) => void; lang: 'tr' | 'en'
}) {
  return (
    <button
      onClick={() => onToggle(cat.slug)}
      className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
        selected
          ? 'text-white border-transparent shadow-lg scale-[1.02]'
          : 'border-[var(--border)] text-[var(--fg-muted)] bg-[var(--card)] hover:border-[var(--accent)]/50 hover:text-[var(--fg)]'
      }`}
      style={selected ? { background: `linear-gradient(135deg,${cat.renk}dd,${cat.renk}99)` } : {}}
    >
      <span className="text-base flex-shrink-0">{cat.ikon}</span>
      <span className="truncate">{lang === 'tr' ? cat.tr : cat.en}</span>
      {selected && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
          <Check style={{ width: 10, height: 10 }} className="text-emerald-500" />
        </span>
      )}
    </button>
  )
}

function InnerContent({ selected, toggle, saving, error, onSave, onSkip, lang }: {
  selected: Set<string>
  toggle: (slug: string) => void
  saving: boolean
  error: string
  onSave: () => void
  onSkip?: () => void
  lang: 'tr' | 'en'
}) {
  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">✨</div>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-[var(--fg)] mb-2">
          {lang === 'tr' ? 'Neler ilgini çekiyor?' : 'What interests you?'}
        </h2>
        <p className="text-[var(--fg-muted)] text-sm leading-relaxed max-w-md mx-auto">
          {lang === 'tr'
            ? 'Sevdiğin türleri seç, sana özel içerikler önerelim.'
            : "Select genres you love and we'll recommend personalized content."}
        </p>
      </div>

      <div className="mb-6">
        <p className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">
          {lang === 'tr' ? 'Türler' : 'Genres'}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {GENRE_CATEGORIES.map(cat => (
            <CatCard key={cat.slug} cat={cat} selected={selected.has(cat.slug)} onToggle={toggle} lang={lang} />
          ))}
        </div>
      </div>

      <div className="mb-8">
        <p className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">
          {lang === 'tr' ? 'Edebi / Özel' : 'Literary / Special'}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {LITERARY_CATEGORIES.map(cat => (
            <CatCard key={cat.slug} cat={cat} selected={selected.has(cat.slug)} onToggle={toggle} lang={lang} />
          ))}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-4 text-sm text-[var(--accent)] font-medium">
          <Check style={{ width: 14, height: 14 }} />
          {selected.size} {lang === 'tr' ? 'kategori seçildi' : 'categories selected'}
        </div>
      )}

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={onSave}
          disabled={selected.size < 1 || saving}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}
        >
          {saving && <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />}
          {lang === 'tr' ? 'Bana Özel İçerikleri Göster' : 'Show My Personalized Content'}
        </button>
        {onSkip && (
          <button onClick={onSkip}
            className="px-4 py-3.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--fg-muted)] transition-all">
            {lang === 'tr' ? 'Geç' : 'Skip'}
          </button>
        )}
      </div>
    </div>
  )
}

export function InterestPicker({ initial = [], onSave, onSkip, isModal = true }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial))
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const { lang } = useLang()

  const toggle = (slug: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(slug) ? next.delete(slug) : next.add(slug)
      return next
    })
  }

  const handleSave = async () => {
    if (selected.size < 1) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: Array.from(selected) }),
      })
      if (!res.ok) throw new Error('Failed')
      onSave(Array.from(selected))
    } catch {
      setError(lang === 'tr' ? 'Kaydedilemedi, tekrar dene.' : 'Failed to save, try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!isModal) {
    return (
      <InnerContent
        selected={selected}
        toggle={toggle}
        saving={saving}
        error={error}
        onSave={handleSave}
        onSkip={onSkip}
        lang={lang}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[200] px-4 py-8 overflow-y-auto">
      <div className="relative bg-[var(--bg)] border border-[var(--border)] rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl">
        {onSkip && (
          <button onClick={onSkip}
            className="absolute top-4 right-4 p-2 rounded-xl text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-all">
            <X style={{ width: 16, height: 16 }} />
          </button>
        )}
        <InnerContent
          selected={selected}
          toggle={toggle}
          saving={saving}
          error={error}
          onSave={handleSave}
          onSkip={onSkip}
          lang={lang}
        />
      </div>
    </div>
  )
}
