'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { InkLogo } from '@/components/ui/InkLogo'
import { Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

type PageState = 'loading' | 'ready' | 'invalid' | 'done'

export default function ResetPasswordPage() {
  const [state, setState]       = useState<PageState>('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState('')
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Supabase generateLink linki tıklandığında şu URL gelir:
    // https://inkstory.com.tr/reset-password#access_token=xxx&refresh_token=yyy&type=recovery
    //
    // Supabase JS client hash'i otomatik okur ve onAuthStateChange ile
    // PASSWORD_RECOVERY event'i fırlatır.
    // Biz sadece bunu bekliyoruz.

    let settled = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[ResetPassword] auth event:', event, 'session:', !!session)

      if (event === 'PASSWORD_RECOVERY' && session) {
        settled = true
        setState('ready')
        return
      }

      // Bazen SIGNED_IN gelir type=recovery ile
      if (event === 'SIGNED_IN' && session) {
        settled = true
        setState('ready')
        return
      }

      if (event === 'INITIAL_SESSION') {
        if (session) {
          // Session var — hash'ten token işlenmiş
          settled = true
          setState('ready')
        }
        // Session yok — hash'ten token bekliyoruz, timeout devrede
      }
    })

    // Hash'i manuel parse et — bazı tarayıcılarda onAuthStateChange geç gelir
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      // Hash var, Supabase işliyor — biraz bekle
      const t = setTimeout(() => {
        if (!settled) {
          // Hâlâ session yoksa manuel dene
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
              settled = true
              setState('ready')
            }
          })
        }
      }, 1500)

      // 8 saniye max bekle
      const deadline = setTimeout(() => {
        if (!settled) setState('invalid')
      }, 8000)

      return () => {
        subscription.unsubscribe()
        clearTimeout(t)
        clearTimeout(deadline)
      }
    } else {
      // Hash yok — direkt session kontrol et (callback'ten geldiyse)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          settled = true
          setState('ready')
        } else {
          // Ne hash ne session — geçersiz link
          setState('invalid')
        }
      })
    }

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) { setError('Şifre en az 6 karakter olmalı.'); return }
    if (password !== confirm) { setError('Şifreler eşleşmiyor.'); return }

    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('Şifre güncellenemedi: ' + error.message)
      setSubmitting(false)
      return
    }

    await supabase.auth.signOut()
    setState('done')
    setSubmitting(false)
    setTimeout(() => router.push('/login'), 2500)
  }

  // ── Render states ──────────────────────────────────────

  if (state === 'loading') return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[var(--bg)]">
      <Loader2 style={{ width: 32, height: 32 }} className="animate-spin text-[var(--accent)]" />
      <p className="text-sm text-[var(--fg-muted)]">Doğrulanıyor...</p>
    </div>
  )

  if (state === 'invalid') return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg)]">
      <div className="text-center max-w-sm">
        <AlertCircle style={{ width: 48, height: 48 }} className="text-red-400 mx-auto mb-4" />
        <h1 className="font-display text-2xl font-bold text-[var(--fg)] mb-2">Bağlantı Geçersiz</h1>
        <p className="text-[var(--fg-muted)] text-sm mb-6">
          Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.
          Lütfen yeni bir bağlantı talep et.
        </p>
        <Link href="/forgot-password"
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
          Yeniden Gönder
        </Link>
      </div>
    </div>
  )

  if (state === 'done') return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg)]">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
          <CheckCircle style={{ width: 32, height: 32 }} className="text-emerald-400" />
        </div>
        <h1 className="font-display text-2xl font-bold text-[var(--fg)] mb-2">Şifre Güncellendi! 🎉</h1>
        <p className="text-[var(--fg-muted)] text-sm">Giriş sayfasına yönlendiriliyorsun...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg)]">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <InkLogo size={32} />
            <span className="logo-text logo-mark text-2xl">InkStory</span>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-[var(--fg)]">Yeni Şifre Belirle</h1>
          <p className="text-[var(--fg-muted)] mt-1 text-sm">Hesabın için güçlü bir şifre seç.</p>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">Yeni Şifre</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required placeholder="En az 6 karakter" minLength={6}
                className="w-full px-4 py-3 pr-12 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-all"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] hover:text-[var(--fg)]">
                {showPw ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">Şifre Tekrar</label>
            <input
              type={showPw ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required placeholder="Şifreyi tekrar gir"
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-all"
            />
          </div>

          <button type="submit" disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
            {submitting
              ? <><Loader2 style={{ width: 18, height: 18 }} className="animate-spin" /> Güncelleniyor...</>
              : 'Şifreyi Güncelle'
            }
          </button>
        </form>
      </div>
    </div>
  )
}
