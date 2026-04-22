'use client'

import { useState } from 'react'
import Link from 'next/link'
import { InkLogo } from '@/components/ui/InkLogo'
import { Loader2, ArrowLeft, Mail, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')

    try {
      const res  = await fetch('/api/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Sunucudan gelen tam hata mesajını göster
        setError(data.error || 'Mail gönderilemedi. Lütfen tekrar dene.')
        setLoading(false)
        return
      }

      setSent(true)
    } catch (err: any) {
      setError('Bağlantı hatası: ' + (err?.message || 'Sunucuya ulaşılamıyor.'))
    }

    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg)]">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle style={{ width: 32, height: 32 }} className="text-emerald-400" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[var(--fg)] mb-3">Mail Gönderildi!</h1>
          <p className="text-[var(--fg-muted)] text-sm mb-2">
            <strong className="text-[var(--fg)]">{email}</strong> adresine şifre sıfırlama bağlantısı gönderildi.
          </p>
          <p className="text-[var(--fg-muted)] text-xs mb-8">
            Mail birkaç dakika içinde gelecek. Spam/Gereksiz klasörünü de kontrol et.
          </p>
          <Link href="/login"
            className="inline-flex items-center gap-2 text-sm text-[var(--accent)] hover:underline font-medium">
            <ArrowLeft style={{ width: 14, height: 14 }} /> Giriş sayfasına dön
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg)]">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <InkLogo size={32} />
            <span className="logo-text logo-mark text-2xl">InkStory</span>
          </Link>
        </div>

        <Link href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors mb-6">
          <ArrowLeft style={{ width: 14, height: 14 }} /> Giriş yap
        </Link>

        <h1 className="font-display text-3xl font-bold text-[var(--fg)] mb-1">Şifremi Unuttum</h1>
        <p className="text-[var(--fg-muted)] text-sm mb-8">
          Kayıtlı e-posta adresini gir, sana sıfırlama bağlantısı gönderelim.
        </p>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm break-words">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">E-posta Adresi</label>
            <div className="relative">
              <Mail style={{ width: 16, height: 16 }} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="ornek@mail.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
            {loading
              ? <><Loader2 style={{ width: 18, height: 18 }} className="animate-spin" /> Gönderiliyor...</>
              : 'Sıfırlama Bağlantısı Gönder'
            }
          </button>
        </form>
      </div>
    </div>
  )
}
