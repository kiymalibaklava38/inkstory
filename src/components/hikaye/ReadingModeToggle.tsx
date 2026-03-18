'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon, BookOpen } from 'lucide-react'

type ReadMode = 'light' | 'dark' | 'sepia'

const MODES: { id: ReadMode; icon: any; label: string; bg: string; fg: string }[] = [
  { id: 'light', icon: Sun,      label: 'Light', bg: '#ffffff',  fg: '#1a1a1a' },
  { id: 'dark',  icon: Moon,     label: 'Dark',  bg: '#111820',  fg: '#c8d8e8' },
  { id: 'sepia', icon: BookOpen, label: 'Sepia', bg: '#f5ead2',  fg: '#3d2b1f' },
]

export function ReadingModeToggle() {
  const [mode, setMode]     = useState<ReadMode>('light')
  const [open, setOpen]     = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('inkstory-read-mode') as ReadMode | null
    if (saved) applyMode(saved)
  }, [])

  const applyMode = (m: ReadMode) => {
    const found = MODES.find(x => x.id === m)!
    setMode(m)
    const area = document.getElementById('reading-area')
    if (area) {
      area.style.backgroundColor = found.bg
      area.style.color = found.fg
      area.style.borderRadius = '16px'
      area.style.padding = '48px 32px'
    }
    localStorage.setItem('inkstory-read-mode', m)
    setOpen(false)
  }

  const active = MODES.find(x => x.id === mode)!

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-xs font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--accent)]/50 transition-all"
      >
        <active.icon style={{width:13,height:13}} />
        {active.label}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-36 bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-lg overflow-hidden animate-fade-in z-50">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => applyMode(m.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium transition-colors ${
                mode === m.id
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]'
              }`}
            >
              <m.icon style={{width:13,height:13}} />
              {m.label}
              {/* Color preview dot */}
              <div className="ml-auto w-4 h-4 rounded-full border border-[var(--border)]"
                style={{ backgroundColor: m.bg }} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
