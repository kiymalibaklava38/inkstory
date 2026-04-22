'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { InkLogo } from '@/components/ui/InkLogo'
import { Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

type PageState = 'loading' | 'ready' | 'invalid' | 'done'

function ResetPasswordForm() {
  const [state, setState] = useState<PageState>('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    let isMounted = true

    const handleAuth = async () => {
      // 1. Önce URL'deki hash'i kontrol et (#access_token=...)
      // Bu kısım e-postadan gelen linki doğrudan yakalar
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          
          if (!error && isMounted) {
            setState('ready')
            // Token'ı URL'den temizle
            window.history.replaceState(null, '', window.location.pathname)
            return
          }
        }
      }

      // 2. Hash yoksa (veya zaten oturum varsa) mevcut session'ı kontrol et
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        if (isMounted) setState('ready')
      } else {
        // Oturum yoksa link geçersizdir
        if (isMounted) setState('invalid')
      }
    }

    handleAuth()

    return () => { isMounted = false }
  }, [supabase])

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
    setTimeout(() => router.push('/login'), 2500)
  }

  if (state === 'loading') return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[var(--bg)]">
      <Loader2 className="animate-spin text-[var(--accent)] w-8 h-8" />
      <p className="text-sm text-[var(--fg-muted)]">Doğrulanıyor...</p>
    </div>
  )

  if (state === 'invalid') return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg)]">
      <div className="text-center max-w-sm">
        <AlertCircle className="text-red-400 w-12 h-12 mx-auto mb-4" />
        <h1 className="font-display text-2xl font-bold text-[var(--fg)] mb-2">Bağlantı Geçersiz</h1>
        <p className="text-[var(--fg-muted)] text-sm mb-6">Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.</p>
        <Link href="/forgot-password" className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-white" style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
          Yeniden Gönder
        </Link>
      </div>
    </div>
  )

  if (state === 'done') return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg)]">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="text-emerald-400 w-8 h-8" />
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
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="En az 6 karakter" minLength={6} className="w-full px-4 py-3 pr-12 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)]" />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">Şifre Tekrar</label>
            <input type={showPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Şifreyi tekrar gir" className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)]" />
          </div>
          <button type="submit" disabled={submitting} className="w-full py-3.5 rounded-xl font-semibold text-white" style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
            {submitting ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}