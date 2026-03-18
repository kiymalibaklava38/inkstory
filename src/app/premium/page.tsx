'use client'

import { useState } from 'react'
import { Crown, Sparkles, Zap, Star, Shield, Check, Bell, MessageCircle } from 'lucide-react'
import { useLang } from '@/lib/i18n'

const UPCOMING_FEATURES = [
  { icon: Zap,           tr: 'Sınırsız AI yazma asistanı',          en: 'Unlimited AI writing assistant' },
  { icon: Star,          tr: 'Premium rozet (profilde gösterilir)',  en: 'Premium badge on your profile' },
  { icon: Sparkles,      tr: '7 gelişmiş AI aksiyonu',              en: '7 advanced AI actions' },
  { icon: Crown,         tr: 'Öne çıkan yazarlar listesi',          en: 'Featured in top writers' },
  { icon: Shield,        tr: 'Öncelikli destek (Discord/e-posta)',   en: 'Priority support (Discord/email)' },
]

export default function PremiumPage() {
  const { lang } = useLang()
  const [email, setEmail]         = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [notifyError, setNotifyError] = useState('')

  const handleNotify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setNotifyError('')

    try {
      const res = await fetch('/api/premium-waitlist', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, lang }),
      })

      if (!res.ok && res.status !== 409) {
        setNotifyError(lang === 'tr' ? 'Bir hata oluştu, tekrar dene.' : 'Something went wrong, try again.')
        return
      }

      localStorage.setItem('premium-notify-submitted', '1')
      setSubmitted(true)
    } catch {
      setNotifyError(lang === 'tr' ? 'Bağlantı hatası.' : 'Connection error.')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)] text-sm font-semibold mb-8">
          <Crown style={{ width: 14, height: 14 }} />
          {lang === 'tr' ? 'Yakında Geliyor' : 'Coming Soon'}
        </div>

        {/* Crown icon */}
        <div className="relative mx-auto mb-8 w-24 h-24">
          <div className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto shadow-xl"
            style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
            <Crown style={{ width: 44, height: 44 }} className="text-white" />
          </div>
          <div className="absolute inset-0 rounded-2xl animate-pulse opacity-30"
            style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }} />
        </div>

        {/* Heading */}
        <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--fg)] mb-4">
          InkStory{' '}
          <span className="gradient-nib italic">Premium</span>
        </h1>
        <p className="text-[var(--fg-muted)] text-lg mb-10 leading-relaxed">
          {lang === 'tr'
            ? 'Yazarlığını bir üst seviyeye taşıyacak premium özellikler çok yakında geliyor.'
            : 'Premium features to supercharge your writing are coming very soon.'}
        </p>

        {/* Feature list */}
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 mb-8 text-left">
          <p className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-4">
            {lang === 'tr' ? 'Neler Geliyor?' : "What's coming?"}
          </p>
          <div className="space-y-3.5">
            {UPCOMING_FEATURES.map(({ icon: Icon, tr, en }) => (
              <div key={tr} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#d4840f22,#f0c04033)' }}>
                  <Icon style={{ width: 13, height: 13 }} className="text-[var(--accent)]" />
                </div>
                <span className="text-sm text-[var(--fg)]">{lang === 'tr' ? tr : en}</span>
                <Check style={{ width: 13, height: 13 }} className="text-[var(--accent)] ml-auto flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Notify form */}
        {submitted ? (
          <div className="flex items-center justify-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
            <Check style={{ width: 16, height: 16 }} />
            {lang === 'tr'
              ? '✓ Harika! Premium çıktığında seni haberdar edeceğiz.'
              : "✓ Great! We'll notify you when Premium launches."}
          </div>
        ) : (
          <div>
            <form onSubmit={handleNotify} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder={lang === 'tr' ? 'E-posta adresin...' : 'Your email address...'}
                className="flex-1 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] text-sm"
              />
              <button type="submit"
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:scale-[1.02] flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                <Bell style={{ width: 14, height: 14 }} />
                {lang === 'tr' ? 'Beni Haberdar Et' : 'Notify Me'}
              </button>
            </form>
            {notifyError && (
              <p className="text-xs text-red-400 mt-2 text-center">{notifyError}</p>
            )}
          </div>
        )}

        {/* Support */}
        <div className="mt-6 pt-6 border-t border-[var(--border)] text-center">
          <p className="text-xs text-[var(--fg-muted)] mb-2">
            {lang === 'tr' ? 'Soruların mı var?' : 'Have questions?'}
          </p>
          <a href="mailto:support@inkstory.com"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline">
            <MessageCircle style={{ width: 14, height: 14 }} />
            support@inkstory.com
          </a>
        </div>

        <p className="text-xs text-[var(--fg-muted)] mt-4 opacity-60">
          {lang === 'tr'
            ? 'Spam göndermeyiz. İstediğin zaman çıkabilirsin.'
            : 'No spam. Unsubscribe anytime.'}
        </p>

      </div>
    </div>
  )
}
