'use client'

import { useLang, type Lang } from '@/lib/i18n'
import { Globe } from 'lucide-react'
import { useState } from 'react'

export function LangSwitcher() {
  const { lang, setLang } = useLang()
  const [open, setOpen] = useState(false)

  const options: { id: Lang; label: string; flag: string }[] = [
    { id: 'en', label: 'English', flag: '🇬🇧' },
    { id: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 p-2 rounded-full text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-all"
        title="Language"
      >
        <Globe style={{ width: 16, height: 16 }} />
        <span className="text-xs font-medium uppercase hidden sm:block">{lang}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-36 bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-lg overflow-hidden z-50 animate-fade-in">
          {options.map(o => (
            <button
              key={o.id}
              onClick={() => { setLang(o.id); setOpen(false) }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                lang === o.id
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-medium'
                  : 'text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]'
              }`}
            >
              <span className="text-base">{o.flag}</span>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
