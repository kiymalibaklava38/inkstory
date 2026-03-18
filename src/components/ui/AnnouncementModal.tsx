'use client'

import { useState, useEffect } from 'react'
import { X, Megaphone } from 'lucide-react'
import { useLang } from '@/lib/i18n'

interface Announcement {
  id:      string
  title:   string
  message: string
}

export function AnnouncementModal() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [visible, setVisible] = useState(false)
  const { lang } = useLang()

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/announcements')
        const data = await res.json()

        if (!data.announcement) return

        // Check if user has already dismissed this announcement
        const dismissedKey = `inkstory-announcement-${data.announcement.id}`
        const dismissed = localStorage.getItem(dismissedKey)
        if (dismissed) return

        setAnnouncement(data.announcement)
        // Small delay so it doesn't flash on first render
        setTimeout(() => setVisible(true), 600)
      } catch {
        // Non-critical — fail silently
      }
    }

    check()
  }, [])

  const dismiss = () => {
    if (!announcement) return
    localStorage.setItem(`inkstory-announcement-${announcement.id}`, '1')
    setVisible(false)
    setTimeout(() => setAnnouncement(null), 300)
  }

  if (!announcement || !visible) return null

  const closeLabel = lang === 'tr' ? 'Kapat' : 'Close'
  const gotItLabel = lang === 'tr' ? 'Anladım' : 'Got it!'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] px-4 animate-fade-in">
      <div
        className="relative bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        {/* Accent top bar */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#d4840f,#f0c040)' }} />

        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-all"
          aria-label={closeLabel}
        >
          <X style={{ width: 16, height: 16 }} />
        </button>

        <div className="px-6 py-6">
          {/* Icon + Title */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#d4840f22,#f0c04033)' }}>
              <Megaphone style={{ width: 18, height: 18 }} className="text-[var(--accent)]" />
            </div>
            <h2 className="font-display text-xl font-bold text-[var(--fg)] pr-6">
              {announcement.title}
            </h2>
          </div>

          {/* Message */}
          <p className="text-[var(--fg-muted)] leading-relaxed text-sm mb-6 whitespace-pre-wrap">
            {announcement.message}
          </p>

          {/* CTA */}
          <button
            onClick={dismiss}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}
          >
            {gotItLabel}
          </button>
        </div>

        <style jsx>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(24px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0)   scale(1); }
          }
        `}</style>
      </div>
    </div>
  )
}
