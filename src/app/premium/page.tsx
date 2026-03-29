'use client'

import { useState, useEffect } from 'react'
import { useLang } from '@/lib/i18n'
import { Check, X, Crown, Zap, Sparkles, Bell, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function PremiumPage() {
  const { lang } = useLang()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(false) // Hata durumunu takip etmek için eklendi
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [userPlan, setUserPlan] = useState<'free' | 'premium' | null>(null)

  useEffect(() => {
    let isMounted = true // Memory leak önlemek için flag
    const supabase = createClient()

    const checkUserStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!isMounted) return

      if (!user) {
        setUserPlan('free')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('is_premium, premium_expires_at')
        .eq('id', user.id)
        .single()

      if (isMounted) {
        const isPremium = data?.is_premium && 
                         data?.premium_expires_at && 
                         new Date(data.premium_expires_at) > new Date()
        setUserPlan(isPremium ? 'premium' : 'free')
      }
    }

    checkUserStatus()

    return () => {
      isMounted = false // Bileşenden çıkınca işlemleri durdur
    }
  }, [])

  const notify = async () => {
    if (!email.trim() || sending) return
    setSending(true)
    setError(false)

    try {
      const res = await fetch('/api/premium-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (res.ok) {
        setSent(true)
      } else {
        setError(true)
      }
    } catch (err) {
      console.error('Waitlist error:', err)
      setError(true)
    } finally {
      setSending(false)
    }
  }

  // Özellik listesi (Kodun okunabilirliği için burada kalması uygun)
  const features = [
    {
      label: lang === 'tr' ? 'Günlük AI İsteği' : 'Daily AI Requests',
      free: lang === 'tr' ? '5 istek/gün' : '5 requests/day',
      premium: lang === 'tr' ? 'Sınırsız' : 'Unlimited',
      freeOk: true,
      premOk: true,
    },
    {
      label: lang === 'tr' ? 'Temel AI Aksiyonları' : 'Basic AI Actions',
      free: lang === 'tr' ? '3 aksiyon' : '3 actions',
      premium: lang === 'tr' ? '8 aksiyon' : '8 actions',
      freeOk: true,
      premOk: true,
    },
    {
      label: lang === 'tr' ? 'Denetle & Hata Bul' : 'Proofread & Debug',
      free: '—',
      premium: lang === 'tr' ? 'Dahil' : 'Included',
      freeOk: false,
      premOk: true,
    },
    {
      label: lang === 'tr' ? 'Diyalog Geliştirme' : 'Dialogue Enhancement',
      free: '—',
      premium: lang === 'tr' ? 'Dahil' : 'Included',
      freeOk: false,
      premOk: true,
    },
    {
      label: lang === 'tr' ? 'Olay Örgüsü & Bölüm Önerisi' : 'Plot Twist & Chapter Suggest',
      free: '—',
      premium: lang === 'tr' ? 'Dahil' : 'Included',
      freeOk: false,
      premOk: true,
    },
    {
      label: lang === 'tr' ? 'Doğrulanmış Yazar Başvurusu' : 'Verified Author Application',
      free: lang === 'tr' ? 'Şartlara bağlı' : 'Requirements apply',
      premium: lang === 'tr' ? 'Öncelikli değerlendirme' : 'Priority review',
      freeOk: true,
      premOk: true,
    },
    {
      label: lang === 'tr' ? 'Premium Rozeti' : 'Premium Badge',
      free: '—',
      premium: lang === 'tr' ? 'Profilde görünür' : 'Shown on profile',
      freeOk: false,
      premOk: true,
    },
    {
      label: lang === 'tr' ? 'Keşfet\'te Öne Çıkma' : 'Featured in Discover',
      free: '—',
      premium: lang === 'tr' ? 'Öncelikli sıralama' : 'Priority ranking',
      freeOk: false,
      premOk: true,
    },
    {
      label: lang === 'tr' ? 'Kapak Resmi & Banner' : 'Cover Image & Banner',
      free: lang === 'tr' ? 'Dahil' : 'Included',
      premium: lang === 'tr' ? 'Dahil' : 'Included',
      freeOk: true,
      premOk: true,
    },
    {
      label: lang === 'tr' ? 'Öncelikli Destek' : 'Priority Support',
      free: '—',
      premium: lang === 'tr' ? 'Discord / E-posta' : 'Discord / Email',
      freeOk: false,
      premOk: true,
    },
  ]

  const monthlyPrice = lang === 'tr' ? '₺99' : '$9'
  const yearlyPrice = lang === 'tr' ? '₺799' : '$69'
  const yearlyMonth = lang === 'tr' ? '₺66/ay' : '$5.75/mo'
  const saving = lang === 'tr' ? '%33 tasarruf' : '33% off'

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-20">
      {/* Header */}
      <div className="text-center pt-16 pb-10 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-semibold mb-6">
          <Crown style={{ width: 13, height: 13 }} />
          {lang === 'tr' ? 'Yakında Geliyor' : 'Coming Soon'}
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--fg)] mb-3">
          InkStory <span style={{ color: '#d4840f' }} className="italic">Premium</span>
        </h1>
        <p className="text-[var(--fg-muted)] max-w-xl mx-auto text-base leading-relaxed">
          {lang === 'tr'
            ? 'Yazarlığını bir üst seviyeye taşıyacak güçlü araçlar ve sınırsız AI erişimi.'
            : 'Powerful tools and unlimited AI access to take your writing to the next level.'}
        </p>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${selectedPlan === 'monthly' ? 'bg-[var(--accent)] text-white' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'}`}
          >
            {lang === 'tr' ? 'Aylık' : 'Monthly'}
          </button>
          <button
            onClick={() => setSelectedPlan('yearly')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${selectedPlan === 'yearly' ? 'bg-[var(--accent)] text-white' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'}`}
          >
            {lang === 'tr' ? 'Yıllık' : 'Yearly'}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${selectedPlan === 'yearly' ? 'bg-white/20 text-white' : 'bg-emerald-500/15 text-emerald-400'}`}>
              {saving}
            </span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="max-w-4xl mx-auto px-4 mb-12">
        <div className="grid md:grid-cols-2 gap-5">
          {/* Free plan */}
          <div className={`rounded-2xl border bg-[var(--card)] overflow-hidden transition-all ${userPlan === 'free' ? 'border-emerald-500/40' : 'border-[var(--border)]'}`}>
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 mb-1">
                <Zap style={{ width: 18, height: 18 }} className="text-[var(--fg-muted)]" />
                <h2 className="font-display text-xl font-bold text-[var(--fg)]">
                  {lang === 'tr' ? 'Ücretsiz' : 'Free'}
                </h2>
                {userPlan === 'free' && (
                  <span className="ml-auto px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    {lang === 'tr' ? '✓ Mevcut Planın' : '✓ Current Plan'}
                  </span>
                )}
              </div>
              <p className="text-[var(--fg-muted)] text-sm mb-4">
                {lang === 'tr' ? 'Başlamak için ihtiyacın olan her şey.' : 'Everything you need to get started.'}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-[var(--fg)]">₺0</span>
                <span className="text-[var(--fg-muted)] text-sm">{lang === 'tr' ? '/ sonsuza dek' : '/ forever'}</span>
              </div>
            </div>
            <div className="p-6">
              {userPlan === null ? (
                <div className="w-full py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] mb-6 flex items-center justify-center">
                  <Loader2 style={{ width: 14, height: 14 }} className="animate-spin text-[var(--fg-muted)]" />
                </div>
              ) : userPlan === 'free' ? (
                <div className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold border-2 border-emerald-500/30 text-emerald-400 bg-emerald-500/5 mb-6">
                  <Check style={{ width: 15, height: 15 }} />
                  {lang === 'tr' ? 'Mevcut Planın' : 'Your Current Plan'}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold border border-[var(--border)] text-[var(--fg-muted)] mb-6">
                  {lang === 'tr' ? 'Temel Plan' : 'Basic Plan'}
                </div>
              )}
              <div className="space-y-3">
                {features.map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    {f.freeOk
                      ? <Check style={{ width: 14, height: 14 }} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                      : <X style={{ width: 14, height: 14 }} className="text-[var(--fg-muted)]/40 flex-shrink-0 mt-0.5" />
                    }
                    <div className="min-w-0">
                      <p className={`text-xs font-medium ${f.freeOk ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)]/50'}`}>{f.label}</p>
                      <p className={`text-[11px] ${f.freeOk ? 'text-[var(--fg-muted)]' : 'text-[var(--fg-muted)]/40'}`}>{f.free}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Premium plan */}
          <div className="rounded-2xl border-2 border-[var(--accent)] bg-[var(--card)] overflow-hidden relative">
            {/* Badge */}
            {userPlan === 'premium' ? (
              <div className="absolute top-0 left-0 right-0 text-center py-1.5 text-[11px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#2d9f6a,#3dbd82)' }}>
                {lang === 'tr' ? '✓ Mevcut Planın' : '✓ Your Current Plan'}
              </div>
            ) : (
              <div className="absolute top-0 left-0 right-0 text-center py-1.5 text-[11px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                ⭐ {lang === 'tr' ? 'En Popüler' : 'Most Popular'}
              </div>
            )}

            <div className="p-6 pt-10 border-b border-[var(--accent)]/20">
              <div className="flex items-center gap-2 mb-1">
                <Crown style={{ width: 18, height: 18 }} className="text-[var(--accent)]" />
                <h2 className="font-display text-xl font-bold text-[var(--fg)]">Premium</h2>
                {userPlan === 'premium' && (
                  <span className="ml-auto px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    ✓ {lang === 'tr' ? 'Aktif' : 'Active'}
                  </span>
                )}
              </div>
              <p className="text-[var(--fg-muted)] text-sm mb-4">
                {lang === 'tr' ? 'Profesyonel yazarlar için tam deneyim.' : 'The full experience for serious writers.'}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold text-[var(--fg)]">
                  {selectedPlan === 'monthly' ? monthlyPrice : yearlyPrice}
                </span>
                <span className="text-[var(--fg-muted)] text-sm">
                  {selectedPlan === 'monthly'
                    ? (lang === 'tr' ? '/ ay' : '/ month')
                    : (lang === 'tr' ? '/ yıl' : '/ year')}
                </span>
              </div>
              {selectedPlan === 'yearly' && (
                <p className="text-xs text-emerald-400 mt-1 font-medium">
                  {lang === 'tr' ? `≈ ${yearlyMonth} — aylık ödemekten daha ucuz` : `≈ ${yearlyMonth} — cheaper than monthly`}
                </p>
              )}
            </div>

            <div className="p-6">
              {userPlan === null ? (
                <div className="w-full py-3 rounded-xl mb-6 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                  <Loader2 style={{ width: 14, height: 14 }} className="animate-spin text-white" />
                </div>
              ) : userPlan === 'premium' ? (
                <div className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white mb-6"
                  style={{ background: 'linear-gradient(135deg,#2d9f6a,#3dbd82)' }}>
                  <Check style={{ width: 15, height: 15 }} />
                  {lang === 'tr' ? 'Premium Üyesin 🎉' : 'You are Premium 🎉'}
                </div>
              ) : (
                <button
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] mb-6 active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}
                  onClick={() => document.getElementById('waitlist-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {lang === 'tr' ? '🔔 Beni Haberdar Et' : '🔔 Notify Me'}
                </button>
              )}
              <div className="space-y-3">
                {features.map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check style={{ width: 14, height: 14 }} className="text-[var(--accent)] flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--fg)]">{f.label}</p>
                      <p className="text-[11px] text-[var(--fg-muted)]">{f.premium}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature comparison table */}
      <div className="max-w-4xl mx-auto px-4 mb-12">
        <h2 className="font-display text-2xl font-bold text-[var(--fg)] text-center mb-6">
          {lang === 'tr' ? 'Plan Karşılaştırması' : 'Plan Comparison'}
        </h2>
        <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="grid grid-cols-3 border-b border-[var(--border)] bg-[var(--bg-subtle)]">
            <div className="px-5 py-3.5 text-xs font-bold text-[var(--fg-muted)] uppercase tracking-wider">
              {lang === 'tr' ? 'Özellik' : 'Feature'}
            </div>
            <div className="px-5 py-3.5 text-xs font-bold text-[var(--fg-muted)] uppercase tracking-wider text-center border-l border-[var(--border)]">
              {lang === 'tr' ? 'Ücretsiz' : 'Free'}
            </div>
            <div className="px-5 py-3.5 text-xs font-bold text-[var(--accent)] uppercase tracking-wider text-center border-l border-[var(--border)]">
              Premium
            </div>
          </div>
          {features.map((f, i) => (
            <div key={i} className={`grid grid-cols-3 border-b border-[var(--border)] last:border-0 ${i % 2 === 0 ? '' : 'bg-[var(--bg-subtle)]/40'}`}>
              <div className="px-5 py-3.5 text-sm text-[var(--fg)] font-medium">{f.label}</div>
              <div className="px-5 py-3.5 text-center border-l border-[var(--border)] flex items-center justify-center">
                {f.freeOk
                  ? <span className="text-xs text-[var(--fg-muted)]">{f.free}</span>
                  : <X style={{ width: 14, height: 14 }} className="text-[var(--fg-muted)]/30" />
                }
              </div>
              <div className="px-5 py-3.5 text-center border-l border-[var(--border)] flex items-center justify-center">
                <span className="text-xs text-[var(--fg)] font-medium">{f.premium}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Waitlist */}
      <div id="waitlist-section" className="max-w-lg mx-auto px-4 text-center">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
            <Bell style={{ width: 22, height: 22 }} className="text-white" />
          </div>
          <h3 className="font-display text-xl font-bold text-[var(--fg)] mb-1">
            {lang === 'tr' ? 'İlk Sen Öğren' : 'Be the First to Know'}
          </h3>
          <p className="text-[var(--fg-muted)] text-sm mb-5">
            {lang === 'tr'
              ? 'Premium başladığında sana haber verelim. Erken üyelere özel indirim fırsatı!'
              : 'Get notified when Premium launches. Early members get a special discount!'}
          </p>

          {sent ? (
            <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium animate-in fade-in zoom-in duration-300">
              <Check style={{ width: 16, height: 16 }} />
              {lang === 'tr' ? 'Kaydedildi! Seni haberdar edeceğiz.' : "Saved! We'll notify you."}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value)
                    if(error) setError(false)
                  }}
                  onKeyDown={e => e.key === 'Enter' && notify()}
                  placeholder={lang === 'tr' ? 'E-posta adresin...' : 'Your email...'}
                  className={`flex-1 px-4 py-3 rounded-xl border ${error ? 'border-red-500' : 'border-[var(--border)]'} bg-[var(--bg)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] text-sm transition-all`}
                />
                <button
                  onClick={notify}
                  disabled={!email.trim() || sending}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}
                >
                  {sending
                    ? <Loader2 style={{ width: 15, height: 15 }} className="animate-spin" />
                    : <Bell style={{ width: 15, height: 15 }} />}
                  {lang === 'tr' ? 'Haberdar Et' : 'Notify Me'}
                </button>
              </div>
              {error && (
                <p className="text-red-500 text-xs mt-1">
                  {lang === 'tr' ? 'Bir hata oluştu, lütfen tekrar dene.' : 'Something went wrong, please try again.'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}