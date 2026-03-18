'use client'

import Link from 'next/link'
import { useLang } from '@/lib/i18n'

export function Footer() {
  const { t, lang } = useLang()

  const tagline   = lang === 'tr' ? 'Hikayeni yaz. Dünyayla paylaş.' : 'Write your world. Share your story.'
  const copyright = lang === 'tr' ? '© 2025 InkStory. Tüm hakları saklıdır.' : '© 2025 InkStory. All rights reserved.'
  const termsLabel = lang === 'tr' ? 'Koşullar' : 'Terms'

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-subtle)] py-14 mt-24">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <path d="M16 5L10 17L16 14L22 17L16 5Z" fill="url(#fNib3)"/>
                <path d="M16 14L16 25" stroke="url(#fNib3)" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="16" cy="26" r="1.5" fill="url(#fNib3)"/>
                <defs>
                  <linearGradient id="fNib3" x1="10" y1="5" x2="22" y2="26" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#e8a030"/><stop offset="1" stopColor="#f5c842"/>
                  </linearGradient>
                </defs>
              </svg>
              <span className="logo-text logo-mark text-2xl">InkStory</span>
            </div>
            <p className="text-[var(--fg-muted)] text-sm">{tagline}</p>
            <p className="text-[var(--fg-muted)] text-xs mt-1">{copyright}</p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-[var(--fg-muted)] justify-center">
            <Link href="/stories" className="hover:text-[var(--accent)] transition-colors">{t.stories}</Link>
            <Link href="/search"  className="hover:text-[var(--accent)] transition-colors">{t.discover}</Link>
            <Link href="/write"   className="hover:text-[var(--accent)] transition-colors">{t.write}</Link>
            <Link href="/terms"   className="hover:text-[var(--accent)] transition-colors">{termsLabel}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
