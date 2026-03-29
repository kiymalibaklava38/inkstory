'use client'

import { useState, useEffect } from 'react'
import { useLang } from '@/lib/i18n'
import { Check, X, Crown, Zap, Sparkles, Shield, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// ── Payment method logos (SVG inline) ─────────────────────
function PaymentLogos() {
  return (
    <div className="flex items-center justify-center gap-3 flex-wrap">
      {/* Visa */}
      <div className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-white flex items-center" title="Visa">
        <svg height="16" viewBox="0 0 60 20" xmlns="http://www.w3.org/2000/svg">
          <text x="0" y="16" fontFamily="Arial" fontWeight="900" fontSize="18" fill="#1A1F71">VISA</text>
        </svg>
      </div>
      {/* Mastercard */}
      <div className="px-2 py-1.5 rounded-lg border border-[var(--border)] bg-white flex items-center gap-1" title="Mastercard">
        <svg height="20" width="32" viewBox="0 0 32 20" xmlns="http://www.w3.org/2000/svg">
          <circle cx="11" cy="10" r="10" fill="#EB001B"/>
          <circle cx="21" cy="10" r="10" fill="#F79E1B"/>
          <path d="M16 3.8a10 10 0 0 1 0 12.4A10 10 0 0 1 16 3.8z" fill="#FF5F00"/>
        </svg>
      </div>
      {/* Amex */}
      <div className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[#2E77BC] flex items-center" title="American Express">
        <svg height="14" viewBox="0 0 48 14" xmlns="http://www.w3.org/2000/svg">
          <text x="0" y="12" fontFamily="Arial" fontWeight="800" fontSize="11" fill="white" letterSpacing="0.5">AMEX</text>
        </svg>
      </div>
      {/* PayPal */}
      <div className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-white flex items-center" title="PayPal">
        <svg height="16" viewBox="0 0 60 18" xmlns="http://www.w3.org/2000/svg">
          <text x="0" y="14" fontFamily="Arial" fontWeight="900" fontSize="14" fill="#003087">Pay</text>
          <text x="24" y="14" fontFamily="Arial" fontWeight="900" fontSize="14" fill="#009CDE">Pal</text>
        </svg>
      </div>
      {/* Powered by Paddle */}
      <div className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[#1A1A2E] flex items-center gap-1.5" title="Powered by Paddle">
        <svg height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="14" height="14" rx="3" fill="#5AC8FA"/>
          <path d="M4 10V4h3.5a2.5 2.5 0 010 5H4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span style={{fontSize:11,color:'#aaa',fontWeight:600,letterSpacing:'0.3px'}}>Paddle</span>
      </div>
    </div>
  )
}

export default function PremiumPage() {
  const { lang } = useLang()
  const router   = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [userPlan, setUserPlan]         = useState<'free' | 'premium' | null>(null)
  const [userId, setUserId]             = useState<string | null>(null)
  const [loading, setLoading]           = useState(false)
  const [success, setSuccess]           = useState(false)

  useEffect(() => {
    // Başarılı ödeme sonrası
    if (typeof window !== 'undefined' && window.location.search.includes('success=1')) {
      setSuccess(true)
    }
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setUserPlan('free'); return }
      setUserId(user.id)
      const { data } = await supabase.from('profiles')
        .select('is_premium, premium_expires_at').eq('id', user.id).single()
      const isPremium = data?.is_premium && data?.premium_expires_at &&
        new Date(data.premium_expires_at) > new Date()
      setUserPlan(isPremium ? 'premium' : 'free')
    })
  }, [])

  const handleCheckout = async () => {
    if (!userId) { router.push('/login?redirect=/premium'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/paddle/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(lang === 'tr' ? 'Ödeme sayfası açılamadı. Lütfen tekrar dene.' : 'Could not open checkout. Please try again.')
      }
    } catch {
      alert(lang === 'tr' ? 'Bir hata oluştu.' : 'An error occurred.')
    }
    setLoading(false)
  }

  const features = [
    { label: lang === 'tr' ? 'Günlük AI İsteği' : 'Daily AI Requests', free: lang === 'tr' ? '5 istek/gün' : '5/day', premium: lang === 'tr' ? 'Sınırsız' : 'Unlimited', freeOk: true },
    { label: lang === 'tr' ? 'Temel AI Aksiyonları' : 'Basic AI Actions', free: lang === 'tr' ? '3 aksiyon' : '3 actions', premium: lang === 'tr' ? '8 aksiyon' : '8 actions', freeOk: true },
    { label: lang === 'tr' ? 'Denetle & Hata Bul' : 'Proofread & Debug', free: '—', premium: lang === 'tr' ? 'Dahil' : 'Included', freeOk: false },
    { label: lang === 'tr' ? 'Diyalog & Betimleme' : 'Dialogue & Description', free: '—', premium: lang === 'tr' ? 'Dahil' : 'Included', freeOk: false },
    { label: lang === 'tr' ? 'Olay Örgüsü & Bölüm Önerisi' : 'Plot & Chapter Suggest', free: '—', premium: lang === 'tr' ? 'Dahil' : 'Included', freeOk: false },
    { label: lang === 'tr' ? 'Premium Rozeti' : 'Premium Badge', free: '—', premium: lang === 'tr' ? 'Profilde görünür' : 'Shown on profile', freeOk: false },
    { label: lang === 'tr' ? 'Keşfet\'te Öne Çıkma' : 'Featured in Discover', free: '—', premium: lang === 'tr' ? 'Öncelikli sıralama' : 'Priority ranking', freeOk: false },
    { label: lang === 'tr' ? 'Kapak & Banner' : 'Cover & Banner', free: lang === 'tr' ? 'Dahil' : 'Included', premium: lang === 'tr' ? 'Dahil' : 'Included', freeOk: true },
    { label: lang === 'tr' ? 'Öncelikli Destek' : 'Priority Support', free: '—', premium: lang === 'tr' ? 'Discord / E-posta' : 'Discord / Email', freeOk: false },
  ]

  // Fiyatlar — dil/bölgeye göre
  const prices = {
    monthly: lang === 'tr' ? '₺99' : '$2.99',
    yearly:  lang === 'tr' ? '₺799' : '$19.99',
    yearlyMonthly: lang === 'tr' ? '₺66/ay' : '$1.67/mo',
    saving:  lang === 'tr' ? '%33 tasarruf' : '44% off',
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-20">

      {/* Success banner */}
      {success && (
        <div className="bg-emerald-500 text-white text-center py-3 px-4 text-sm font-semibold">
          🎉 {lang === 'tr' ? 'Premium üyeliğin aktifleştirildi! Hoş geldin.' : 'Your Premium membership is now active! Welcome.'}
        </div>
      )}

      {/* Header */}
      <div className="text-center pt-16 pb-10 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-semibold mb-6">
          <Crown style={{ width: 13, height: 13 }} />
          {lang === 'tr' ? 'InkStory Premium' : 'InkStory Premium'}
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--fg)] mb-3">
          {lang === 'tr' ? 'Yazarlığını Bir Sonraki Seviyeye Taşı' : 'Take Your Writing to the Next Level'}
        </h1>
        <p className="text-[var(--fg-muted)] max-w-xl mx-auto text-base leading-relaxed">
          {lang === 'tr'
            ? 'Sınırsız AI, gelişmiş araçlar ve platformda öne çıkma fırsatı.'
            : 'Unlimited AI, advanced tools, and priority visibility on the platform.'}
        </p>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <button onClick={() => setSelectedPlan('monthly')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${selectedPlan === 'monthly' ? 'bg-[var(--accent)] text-white' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'}`}>
            {lang === 'tr' ? 'Aylık' : 'Monthly'}
          </button>
          <button onClick={() => setSelectedPlan('yearly')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${selectedPlan === 'yearly' ? 'bg-[var(--accent)] text-white' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'}`}>
            {lang === 'tr' ? 'Yıllık' : 'Yearly'}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${selectedPlan === 'yearly' ? 'bg-white/20 text-white' : 'bg-emerald-500/15 text-emerald-400'}`}>
              {prices.saving}
            </span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="max-w-4xl mx-auto px-4 mb-10">
        <div className="grid md:grid-cols-2 gap-5">

          {/* Free */}
          <div className={`rounded-2xl border bg-[var(--card)] overflow-hidden transition-all ${userPlan === 'free' ? 'border-emerald-500/40' : 'border-[var(--border)]'}`}>
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 mb-1">
                <Zap style={{ width: 18, height: 18 }} className="text-[var(--fg-muted)]" />
                <h2 className="font-display text-xl font-bold text-[var(--fg)]">{lang === 'tr' ? 'Ücretsiz' : 'Free'}</h2>
                {userPlan === 'free' && (
                  <span className="ml-auto px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    ✓ {lang === 'tr' ? 'Mevcut Planın' : 'Current Plan'}
                  </span>
                )}
              </div>
              <p className="text-[var(--fg-muted)] text-sm mb-4">{lang === 'tr' ? 'Başlamak için ihtiyacın olan her şey.' : 'Everything you need to get started.'}</p>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-[var(--fg)]">₺0</span>
                <span className="text-[var(--fg-muted)] text-sm">/ {lang === 'tr' ? 'sonsuza dek' : 'forever'}</span>
              </div>
            </div>
            <div className="p-6">
              {userPlan === 'free' ? (
                <div className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold border-2 border-emerald-500/30 text-emerald-400 bg-emerald-500/5 mb-6">
                  <Check style={{ width: 15, height: 15 }} /> {lang === 'tr' ? 'Mevcut Planın' : 'Your Current Plan'}
                </div>
              ) : (
                <Link href="/register" className="block w-full text-center py-3 rounded-xl text-sm font-semibold border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] mb-6 transition-all">
                  {lang === 'tr' ? 'Ücretsiz Başla' : 'Get Started Free'}
                </Link>
              )}
              <div className="space-y-3">
                {features.map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    {f.freeOk
                      ? <Check style={{ width: 14, height: 14 }} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                      : <X style={{ width: 14, height: 14 }} className="text-[var(--fg-muted)]/40 flex-shrink-0 mt-0.5" />}
                    <div className="min-w-0">
                      <p className={`text-xs font-medium ${f.freeOk ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)]/50'}`}>{f.label}</p>
                      <p className={`text-[11px] ${f.freeOk ? 'text-[var(--fg-muted)]' : 'text-[var(--fg-muted)]/40'}`}>{f.free}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Premium */}
          <div className="rounded-2xl border-2 border-[var(--accent)] bg-[var(--card)] overflow-hidden relative">
            {userPlan === 'premium' ? (
              <div className="absolute top-0 left-0 right-0 text-center py-1.5 text-[11px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#2d9f6a,#3dbd82)' }}>
                ✓ {lang === 'tr' ? 'Mevcut Planın' : 'Your Current Plan'}
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
                  {selectedPlan === 'monthly' ? prices.monthly : prices.yearly}
                </span>
                <span className="text-[var(--fg-muted)] text-sm">
                  {selectedPlan === 'monthly' ? (lang === 'tr' ? '/ ay' : '/ month') : (lang === 'tr' ? '/ yıl' : '/ year')}
                </span>
              </div>
              {selectedPlan === 'yearly' && (
                <p className="text-xs text-emerald-400 mt-1 font-medium">
                  ≈ {prices.yearlyMonthly} — {lang === 'tr' ? 'aylık ödemekten daha ucuz' : 'cheaper than monthly'}
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
                  <Check style={{ width: 15, height: 15 }} /> {lang === 'tr' ? 'Premium Üyesin 🎉' : 'You are Premium 🎉'}
                </div>
              ) : (
                <button onClick={handleCheckout} disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] mb-6 disabled:opacity-70 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                  {loading
                    ? <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> {lang === 'tr' ? 'Yükleniyor...' : 'Loading...'}</>
                    : <>{lang === 'tr' ? '🔒 Güvenli Ödemeye Geç' : '🔒 Proceed to Secure Checkout'}</>
                  }
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

      {/* Payment security section */}
      <div className="max-w-2xl mx-auto px-4 mb-10">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Shield style={{ width: 16, height: 16 }} className="text-emerald-400" />
            <span className="text-sm font-semibold text-[var(--fg)]">
              {lang === 'tr' ? 'Güvenli Ödeme' : 'Secure Payment'}
            </span>
          </div>
          <p className="text-xs text-[var(--fg-muted)] mb-4">
            {lang === 'tr'
              ? 'Tüm ödemeler Paddle tarafından işlenir. Kart bilgileriniz hiçbir zaman sunucularımızda saklanmaz. SSL/TLS ile şifrelenmiş güvenli bağlantı.'
              : 'All payments are processed by Paddle. Your card details are never stored on our servers. Secured with SSL/TLS encryption.'}
          </p>
          <PaymentLogos />
          <p className="text-[10px] text-[var(--fg-muted)]/60 mt-3">
            {lang === 'tr'
              ? 'Paddle Merchant of Record olarak ödeme işlemlerini yönetir.'
              : 'Paddle acts as Merchant of Record and manages all payment transactions.'}
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto px-4 mb-10">
        <h2 className="font-display text-xl font-bold text-[var(--fg)] text-center mb-5">
          {lang === 'tr' ? 'Sık Sorulan Sorular' : 'Frequently Asked Questions'}
        </h2>
        <div className="space-y-3">
          {[
            {
              q: lang === 'tr' ? 'İstediğim zaman iptal edebilir miyim?' : 'Can I cancel anytime?',
              a: lang === 'tr' ? 'Evet, aboneliğinizi istediğiniz zaman iptal edebilirsiniz. İptal sonraki fatura döneminde geçerli olur.' : 'Yes, you can cancel your subscription at any time. Cancellation takes effect at the next billing period.',
            },
            {
              q: lang === 'tr' ? 'İade politikası nedir?' : 'What is the refund policy?',
              a: lang === 'tr' ? 'İlk 14 gün içinde tam iade garantisi. Aylık planlarda sonraki dönem için otomatik iptal, yıllık planlarda kalan süre oranında iade.' : 'Full refund within the first 14 days. Monthly plans get automatic cancellation, yearly plans get prorated refunds.',
            },
            {
              q: lang === 'tr' ? 'Hangi ödeme yöntemleri kabul ediliyor?' : 'What payment methods are accepted?',
              a: lang === 'tr' ? 'Visa, Mastercard, American Express, PayPal ve diğer yerel ödeme yöntemleri Paddle üzerinden kabul edilmektedir.' : 'Visa, Mastercard, American Express, PayPal and other local payment methods are accepted via Paddle.',
            },
            {
              q: lang === 'tr' ? 'Premium özelliklere hemen erişebilir miyim?' : 'Do I get instant access to Premium features?',
              a: lang === 'tr' ? 'Evet! Ödeme tamamlandıktan sonra Premium özellikler anında aktif olur.' : 'Yes! Premium features are activated instantly after payment.',
            },
          ].map((item, i) => (
            <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
              <p className="font-semibold text-sm text-[var(--fg)] mb-1">{item.q}</p>
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Legal links */}
      <div className="text-center text-xs text-[var(--fg-muted)]/60">
        <Link href="/terms" className="hover:text-[var(--accent)] transition-colors">{lang === 'tr' ? 'Kullanım Koşulları' : 'Terms of Service'}</Link>
        <span className="mx-2">·</span>
        <Link href="/privacy" className="hover:text-[var(--accent)] transition-colors">{lang === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}</Link>
        <span className="mx-2">·</span>
        <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent)] transition-colors">Paddle</a>
      </div>
    </div>
  )
}
