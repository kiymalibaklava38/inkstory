'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { InkLogo } from '@/components/ui/InkLogo'
import { useLang } from '@/lib/i18n'
import { Eye, EyeOff, Loader2, Check } from 'lucide-react'

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', displayName: '', email: '', password: '' })
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [done, setDone]       = useState(false)
  const router   = useRouter()
  const supabase = createClient()
  const { t, lang } = useLang()

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')

    if (form.password.length < 6) {
      setError(lang === 'tr' ? 'Şifre en az 6 karakter olmalı.' : 'Password must be at least 6 characters.')
      setLoading(false); return
    }
    if (!/^[a-z0-9_]+$/.test(form.username)) {
      setError(lang === 'tr' ? 'Kullanıcı adı sadece küçük harf, rakam ve _ içerebilir.' : 'Username: only lowercase letters, numbers, and underscores.')
      setLoading(false); return
    }

    const { data: existing } = await supabase
      .from('profiles').select('id').eq('username', form.username).single()
    if (existing) {
      setError(lang === 'tr' ? 'Bu kullanıcı adı alınmış.' : 'Username already taken.')
      setLoading(false); return
    }

    const { error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { username: form.username, display_name: form.displayName || form.username } }
    })

    if (error) {
      setError(
        error.message === 'User already registered'
          ? (lang === 'tr' ? 'Bu e-posta zaten kayıtlı.' : 'Email already in use.')
          : error.message
      )
      setLoading(false); return
    }

    setDone(true); setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <Check style={{ width: 28, height: 28 }} className="text-emerald-400" />
          </div>
          <h2 className="font-display text-2xl font-bold text-[var(--fg)] mb-3">{t.checkEmail}</h2>
          <p className="text-[var(--fg-muted)] mb-6">
            {t.confirmSent} <strong className="text-[var(--fg)]">{form.email}</strong>. {t.activateAccount}
          </p>
          <Link href="/login" className="text-[var(--accent)] font-medium hover:underline">
            {t.backToSignIn}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #060d18 0%, #1a2f4a 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 40px)' }} />
        <div className="relative z-10 text-center px-12">
          <div className="mb-8 flex justify-center animate-nib-float">
            <InkLogo size={80} />
          </div>
          <h2 className="font-display text-4xl font-bold text-white mb-4">
            {t.yourStoryStarts}<br />
            <span className="gradient-nib italic">{t.rightHere}</span>
          </h2>
          <div className="space-y-3 mt-8">
            {[
              lang === 'tr' ? 'AI destekli yazma asistanı' : 'AI-powered writing assistant',
              lang === 'tr' ? 'Küresel okuyucu topluluğu'  : 'Global reader community',
              lang === 'tr' ? 'Zengin metin editörü'        : 'Rich text editor',
              lang === 'tr' ? 'Başlamak ücretsiz'           : 'Free to start',
            ].map(f => (
              <div key={f} className="flex items-center gap-3 text-white/60 text-sm">
                <Check style={{ width: 14, height: 14 }} className="text-[var(--accent)] flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[var(--bg)]">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <InkLogo size={32} />
              <span className="logo-text logo-mark text-2xl">InkStory</span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-[var(--fg)]">{t.createAccount}</h1>
            <p className="text-[var(--fg-muted)] mt-1">
              {t.alreadyHave}{' '}
              <Link href="/login" className="text-[var(--accent)] hover:underline font-medium">{t.signIn}</Link>
            </p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">{t.username} *</label>
                <input type="text" value={form.username} onChange={set('username')} required
                  pattern="[a-z0-9_]+" placeholder={lang === 'tr' ? 'kullanici' : 'inkwriter'}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] transition-all text-sm" />
                <p className="text-[10px] text-[var(--fg-muted)] mt-1">{t.az09}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">{t.displayName}</label>
                <input type="text" value={form.displayName} onChange={set('displayName')}
                  placeholder={lang === 'tr' ? 'Adınız' : 'Your Name'}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] transition-all text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">{t.email} *</label>
              <input type="email" value={form.email} onChange={set('email')} required
                placeholder={lang === 'tr' ? 'ornek@mail.com' : 'you@example.com'}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] transition-all" />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">{t.password} *</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={set('password')} required minLength={6} placeholder={t.atLeast6}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] transition-all" />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] hover:text-[var(--fg)]">
                  {showPw ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50 mt-2"
              style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
              {loading ? <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" /> : t.createFree}
            </button>

            <p className="text-center text-xs text-[var(--fg-muted)] pt-1">
              {t.agreeTerms}{' '}
              <Link href="/terms" className="underline hover:text-[var(--fg)]">{t.termsOfService}</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
