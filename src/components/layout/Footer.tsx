'use client'

import Link from 'next/link'
import { useLang } from '@/lib/i18n'

function PaymentBadges() {
  return (
    <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
      <div className="px-2 py-1 rounded-md border border-[var(--border)] bg-white/5 text-[10px] font-bold text-[var(--fg-muted)]" title="Visa">VISA</div>
      <div className="px-2 py-1 rounded-md border border-[var(--border)] bg-white/5 text-[10px] font-bold text-[var(--fg-muted)]" title="Mastercard">MC</div>
      <div className="px-2 py-1 rounded-md border border-[var(--border)] bg-white/5 text-[10px] font-bold text-[var(--fg-muted)]" title="American Express">AMEX</div>
      <div className="px-2 py-1 rounded-md border border-[var(--border)] bg-white/5 text-[10px] font-bold text-[var(--fg-muted)]" title="PayPal">PayPal</div>
      <div className="px-2 py-1 rounded-md border border-[var(--border)] bg-white/5 text-[10px] font-bold text-[var(--fg-muted)] flex items-center gap-1" title="Powered by Paddle">
        <span style={{color:'#5AC8FA'}}>▣</span> Paddle
      </div>
    </div>
  )
}

export function Footer() {
  const { t, lang } = useLang()

  const tagline   = lang === 'tr' ? 'Hikayeni yaz. Dünyayla paylaş.' : 'Write your world. Share your story.'
  const copyright = lang === 'tr' ? '© 2026 InkStory. Tüm hakları saklıdır.' : '© 2026 InkStory. All rights reserved.'

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-subtle)] py-12 mt-24">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">

          {/* Brand */}
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

          {/* Links */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--fg-muted)] content-start">
            <Link href="/stories" className="hover:text-[var(--accent)] transition-colors">{t.stories}</Link>
            <Link href="/search"  className="hover:text-[var(--accent)] transition-colors">{t.discover}</Link>
            <Link href="/write"   className="hover:text-[var(--accent)] transition-colors">{t.write}</Link>
            <Link href="/premium" className="hover:text-[var(--accent)] transition-colors">Premium</Link>
            <Link href="/terms"   className="hover:text-[var(--accent)] transition-colors">{lang === 'tr' ? 'Koşullar' : 'Terms'}</Link>
            <Link href="/privacy" className="hover:text-[var(--accent)] transition-colors">{lang === 'tr' ? 'Gizlilik' : 'Privacy'}</Link>
          </div>

          {/* Payment methods */}
          <div>
            <p className="text-xs text-[var(--fg-muted)] mb-2 font-medium">
              {lang === 'tr' ? 'Güvenli Ödeme' : 'Secure Payments'}
            </p>
            <PaymentBadges />
            <p className="text-[10px] text-[var(--fg-muted)]/50 mt-2">
              {lang === 'tr' ? 'Ödemeler Paddle tarafından işlenir.' : 'Payments processed by Paddle.'}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
