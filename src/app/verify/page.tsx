'use client'

import { useState, useEffect } from 'react'
import { BadgeCheck, Users, Eye, BookOpen, Loader2, CheckCircle, Clock, XCircle, ArrowLeft } from 'lucide-react'
import { useLang } from '@/lib/i18n'
import { VerifiedBadge } from '@/components/ui/VerifiedBadge'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Stat { value: number; required: number; progress: number; label: string; icon: any }

function ProgressBar({ progress, met }: { progress: number; met: boolean }) {
  return (
    <div className="w-full h-2 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${Math.min(progress, 100)}%`,
          background: met
            ? 'linear-gradient(90deg,#2d9f6a,#3dbd82)'
            : progress > 60
              ? 'linear-gradient(90deg,#d4840f,#e8a030)'
              : 'linear-gradient(90deg,#5ba3d9,#7bbde8)',
        }}
      />
    </div>
  )
}

export default function VerifyPage() {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied]   = useState(false)
  const [error, setError]       = useState('')
  const { lang } = useLang()
  const router    = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login?redirect=/verify'); return }
    })

    fetch('/api/verify')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleApply = async () => {
    setApplying(true)
    setError('')
    try {
      const res = await fetch('/api/verify', { method: 'POST' })
      const d   = await res.json()
      if (!res.ok) { setError(d.error); return }
      setApplied(true)
      setData((prev: any) => ({ ...prev, application: { status: 'pending' } }))
    } catch {
      setError(lang === 'tr' ? 'Bir hata oluştu.' : 'Something went wrong.')
    } finally {
      setApplying(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 style={{ width: 28, height: 28 }} className="animate-spin text-[var(--accent)]" />
    </div>
  )

  if (!data) return null

  const { stats, progress, requirements, eligible, application, isVerified } = data

  const statItems: Stat[] = [
    {
      label:    lang === 'tr' ? 'Takipçi' : 'Followers',
      value:    stats.followers,
      required: requirements.followers,
      progress: progress.followers,
      icon:     Users,
    },
    {
      label:    lang === 'tr' ? 'Toplam Okunma' : 'Total Reads',
      value:    stats.reads,
      required: requirements.reads,
      progress: progress.reads,
      icon:     Eye,
    },
    {
      label:    lang === 'tr' ? 'Yayın. Bölüm' : 'Published Chapters',
      value:    stats.chapters,
      required: requirements.chapters,
      progress: progress.chapters,
      icon:     BookOpen,
    },
  ]

  const overallProgress = Math.round((progress.followers + progress.reads + progress.chapters) / 3)

  const appStatus = application?.status

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] mb-8 transition-colors">
        <ArrowLeft style={{ width: 15, height: 15 }} />
        {lang === 'tr' ? 'Geri' : 'Back'}
      </Link>

      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-lg"
          style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
          <BadgeCheck style={{ width: 40, height: 40 }} className="text-white" fill="white" />
        </div>
        <h1 className="font-display text-3xl font-bold text-[var(--fg)] mb-2">
          {lang === 'tr' ? 'Doğrulanmış Yazar' : 'Verified Author'}
        </h1>
        <p className="text-[var(--fg-muted)] max-w-md mx-auto text-sm leading-relaxed">
          {lang === 'tr'
            ? 'Profilinde ve tüm içeriklerinin yanında görünen özel rozeti kazan.'
            : 'Earn the special badge shown on your profile and all your content.'}
        </p>
      </div>

      {/* Already verified */}
      {isVerified && (
        <div className="flex items-center gap-3 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 mb-8">
          <CheckCircle style={{ width: 24, height: 24 }} className="text-emerald-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-emerald-400">
              {lang === 'tr' ? '✓ Zaten Doğrulanmış Yazarsın!' : '✓ You are already a Verified Author!'}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <VerifiedBadge size={16} />
              <span className="text-sm text-emerald-400/70">
                {lang === 'tr' ? 'Rozet profilinde aktif.' : 'Badge is active on your profile.'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Application status */}
      {!isVerified && appStatus === 'pending' && (
        <div className="flex items-center gap-3 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-8">
          <Clock style={{ width: 24, height: 24 }} className="text-amber-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-400">
              {lang === 'tr' ? '⏳ Başvurun İnceleniyor' : '⏳ Application Under Review'}
            </p>
            <p className="text-sm text-amber-400/70 mt-0.5">
              {lang === 'tr' ? 'Admin ekibimiz başvurunu inceliyor.' : 'Our admin team is reviewing your application.'}
            </p>
          </div>
        </div>
      )}

      {!isVerified && appStatus === 'rejected' && (
        <div className="flex items-center gap-3 p-5 rounded-2xl bg-red-500/10 border border-red-500/30 mb-8">
          <XCircle style={{ width: 24, height: 24 }} className="text-red-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-400">
              {lang === 'tr' ? 'Başvurun Reddedildi' : 'Application Rejected'}
            </p>
            {application?.reject_reason && (
              <p className="text-sm text-red-400/70 mt-0.5">{application.reject_reason}</p>
            )}
          </div>
        </div>
      )}

      {/* Overall progress circle */}
      {!isVerified && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 mb-6 text-center">
          <div className="relative inline-flex items-center justify-center mb-4">
            <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none"
                stroke={overallProgress >= 100 ? '#2d9f6a' : '#d4840f'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - overallProgress / 100)}`}
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <span className="absolute font-display text-xl font-bold text-[var(--fg)]">
              {overallProgress}%
            </span>
          </div>
          <p className="text-sm text-[var(--fg-muted)]">
            {overallProgress >= 100
              ? (lang === 'tr' ? '🎉 Tüm şartları karşıladın!' : '🎉 All requirements met!')
              : (lang === 'tr' ? 'Doğrulama Hazırlığı' : 'Verification Progress')}
          </p>
        </div>
      )}

      {/* Requirements */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 mb-6 space-y-5">
        <p className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
          {lang === 'tr' ? 'Şartlar' : 'Requirements'}
        </p>
        {statItems.map(({ label, value, required, progress: p, icon: Icon }) => {
          const met = value >= required
          return (
            <div key={label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Icon style={{ width: 14, height: 14 }} className={met ? 'text-emerald-400' : 'text-[var(--fg-muted)]'} />
                  <span className="text-sm text-[var(--fg)]">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-mono font-semibold ${met ? 'text-emerald-400' : 'text-[var(--fg)]'}`}>
                    {value.toLocaleString()}
                  </span>
                  <span className="text-xs text-[var(--fg-muted)]">/ {required.toLocaleString()}</span>
                  {met && <CheckCircle style={{ width: 14, height: 14 }} className="text-emerald-400" />}
                </div>
              </div>
              <ProgressBar progress={p} met={met} />
            </div>
          )
        })}
      </div>

      {error && (
        <p className="text-sm text-red-400 mb-4 text-center">{error}</p>
      )}

      {/* CTA */}
      {!isVerified && !appStatus && (
        <button
          onClick={handleApply}
          disabled={!eligible || applying}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 text-base"
          style={{ background: eligible ? 'linear-gradient(135deg,#d4840f,#e8a030)' : undefined,
            backgroundColor: eligible ? undefined : 'var(--bg-subtle)',
            color: eligible ? 'white' : 'var(--fg-muted)' }}
        >
          {applying
            ? <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" />
            : <BadgeCheck style={{ width: 18, height: 18 }} />}
          {eligible
            ? (lang === 'tr' ? 'Doğrulanmış Yazar Başvurusu Yap' : 'Apply for Verification')
            : (lang === 'tr' ? 'Şartları henüz karşılamıyorsun' : 'Requirements not met yet')}
        </button>
      )}

      {(applied || appStatus === 'pending') && !isVerified && (
        <p className="text-center text-sm text-[var(--fg-muted)] mt-4">
          {lang === 'tr' ? 'Başvurun alındı. Genellikle 24-48 saat içinde değerlendirilir.' : 'Application received. Usually reviewed within 24-48 hours.'}
        </p>
      )}
    </div>
  )
}
