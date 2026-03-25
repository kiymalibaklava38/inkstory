'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { useLang } from '@/lib/i18n'

interface Props {
  hikayeId: string
  hasUser:  boolean
}

export function SubscribeButton({ hikayeId, hasUser }: Props) {
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading]       = useState(true)
  const { lang } = useLang()

  useEffect(() => {
    if (!hasUser) { setLoading(false); return }
    fetch(`/api/subscribe?hikayeId=${hikayeId}`)
      .then(r => r.json())
      .then(d => { setSubscribed(d.subscribed); setLoading(false) })
      .catch(() => setLoading(false))
  }, [hikayeId, hasUser])

  const toggle = async () => {
    if (!hasUser) {
      window.location.href = '/login'
      return
    }
    setLoading(true)
    const method = subscribed ? 'DELETE' : 'POST'
    const res = await fetch('/api/subscribe', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hikayeId }),
    })
    const data = await res.json()
    setSubscribed(data.subscribed)
    setLoading(false)
  }

  if (loading) return (
    <button disabled className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] text-xs opacity-50">
      <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
    </button>
  )

  return (
    <button
      onClick={toggle}
      title={subscribed
        ? (lang === 'tr' ? 'Bildirimleri Kapat' : 'Unsubscribe')
        : (lang === 'tr' ? 'Yeni Bölümlerde Bildir' : 'Notify on new chapters')}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
        subscribed
          ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
          : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent)]/50 hover:text-[var(--fg)]'
      }`}
    >
      {subscribed
        ? <><BellOff style={{ width: 13, height: 13 }} /> {lang === 'tr' ? 'Abone' : 'Subscribed'}</>
        : <><Bell style={{ width: 13, height: 13 }} /> {lang === 'tr' ? 'Bildir' : 'Notify Me'}</>
      }
    </button>
  )
}
