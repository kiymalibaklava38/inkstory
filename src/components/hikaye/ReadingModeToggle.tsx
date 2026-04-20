'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon, BookOpen } from 'lucide-react'

export type ReadMode = 'dark' | 'light' | 'sepia'

export const READING_THEMES: Record<ReadMode, {
  bg: string; surface: string; text: string; muted: string;
  accent: string; border: string; label: string; icon: any
}> = {
  dark: {
    bg:      '#0d1117',
    surface: '#161b22',
    text:    '#e6edf3',
    muted:   '#8b949e',
    accent:  '#d4840f',
    border:  '#30363d',
    label:   'Gece',
    icon:    Moon,
  },
  light: {
    bg:      '#f8f9fa',
    surface: '#ffffff',
    text:    '#1c2128',
    muted:   '#656d76',
    accent:  '#b36200',
    border:  '#d0d7de',
    label:   'Gündüz',
    icon:    Sun,
  },
  sepia: {
    bg:      '#f1e8d4',
    surface: '#faf4e8',
    text:    '#3d2b1f',
    muted:   '#7a5c3a',
    accent:  '#8b4513',
    border:  '#d4b896',
    label:   'Sepia',
    icon:    BookOpen,
  },
}

interface Props {
  onModeChange?: (mode: ReadMode) => void
}

export function ReadingModeToggle({ onModeChange }: Props) {
  const [mode, setMode] = useState<ReadMode>('dark')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('inkstory-read-mode') as ReadMode | null
    const initial = saved && READING_THEMES[saved] ? saved : 'dark'
    setMode(initial)
    onModeChange?.(initial)
  }, [])

  const apply = (m: ReadMode) => {
    setMode(m)
    localStorage.setItem('inkstory-read-mode', m)
    onModeChange?.(m)
    setOpen(false)
  }

  const active = READING_THEMES[mode]
  const Icon   = active.icon

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all"
        style={{ borderColor: active.border, backgroundColor: active.surface, color: active.muted }}
      >
        <Icon style={{ width: 13, height: 13 }} />
        <span className="hidden sm:inline">{active.label}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-36 rounded-xl border shadow-xl overflow-hidden z-50"
            style={{ backgroundColor: active.surface, borderColor: active.border }}>
            {(Object.entries(READING_THEMES) as [ReadMode, typeof READING_THEMES[ReadMode]][]).map(([id, theme]) => {
              const TIcon = theme.icon
              return (
                <button key={id} onClick={() => apply(id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium transition-colors"
                  style={{
                    color:           mode === id ? theme.accent : theme.muted,
                    backgroundColor: mode === id ? `${theme.accent}15` : 'transparent',
                  }}>
                  <TIcon style={{ width: 13, height: 13 }} />
                  {theme.label}
                  <div className="ml-auto w-4 h-4 rounded-full border"
                    style={{ backgroundColor: theme.bg, borderColor: theme.border }} />
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
