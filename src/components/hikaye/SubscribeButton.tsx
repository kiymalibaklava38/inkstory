'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, BellRing, Loader2, Users } from 'lucide-react'
import { useLang } from '@/lib/i18n'

interface Props {
  hikayeId:    string
  hasUser:     boolean
  showCount?:  boolean
}

export function SubscribeButton({ hikayeId, hasUser, showCount = false }: Props) {
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading]       = useState(true)
  const [count, setCount]           = useState<number | null>(null)
  const [showToast, setShowToast]   = useState<string | null>(null)
  const { lang } = useLang()

  useEffect(() => {
    if (!hasUser) { setLoading(false); return }

    const fetchData = async () => {
      try {
        const [subRes, countRes] = await Promise.all([
          fetch(`/api/subscribe?hikayeId=${hikayeId}`),
          showCount ? fetch(`/api/subscribe/count?hikayeId=${hikayeId}`) : Promise.resolve(null),
        ])
        const subData = await subRes.json()
        setSubscribed(subData.subscribed)
        if (countRes) {
          const countData = await countRes.json()
          setCount(countData.count || 0)
        }
      } catch {}
      setLoading(false)
    }
    fetchData()
  }, [hikayeId, hasUser, showCount])

  const toggle = async () => {
    if (!hasUser) { window.location.href = '/login'; return }
    setLoading(true)
    const method = subscribed ? 'DELETE' : 'POST'
    const res = await fetch('/api/subscribe', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hikayeId }),
    })
    const data = await res.json()
    const newSub = data.subscribed
    setSubscribed(newSub)
    if (count !== null) setCount(c => c !== null ? c + (newSub ? 1 : -1) : c)

    // Toast bildirimi
    const msg = newSub
      ? (lang === 'tr' ? '🔔 Yeni bölümlerde bildirim alacaksın!' : '🔔 You\'ll be notified of new chapters!')
      : (lang === 'tr' ? '🔕 Bildirimler kapatıldı.' : '🔕 Notifications turned off.')
    setShowToast(msg)
    setTimeout(() => setShowToast(null), 3000)
    setLoading(false)
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        disabled={loading}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all disabled:opacity-60 ${
          subscribed
            ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
            : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent)]/50 hover:text-[var(--fg)]'
        }`}
      >
        {loading
          ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
          : subscribed
            ? <BellRing style={{ width: 13, height: 13 }} />
            : <Bell style={{ width: 13, height: 13 }} />
        }
        {subscribed
          ? (lang === 'tr' ? 'Abone' : 'Subscribed')
          : (lang === 'tr' ? 'Bildir' : 'Notify Me')
        }
        {showCount && count !== null && count > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] opacity-70 border-l border-current pl-1.5 ml-0.5">
            <Users style={{ width: 9, height: 9 }} />
            {count >= 1000 ? `${(count/1000).toFixed(1)}K` : count}
          </span>
        )}
      </button>

      {/* Toast */}
      {showToast && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap px-3 py-1.5 rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-lg text-xs text-[var(--fg)] z-50 animate-fade-in">
          {showToast}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[var(--border)]" />
        </div>
      )}
    </div>
  )
}
