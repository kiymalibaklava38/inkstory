'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, UserMinus, Settings, MessageSquare, Loader2 } from 'lucide-react'

interface Props {
  profileId: string
  username: string
  isMyProfile: boolean
  isFollowing: boolean
  hasUser: boolean
}

export function ProfileActions({ profileId, username, isMyProfile, isFollowing: init, hasUser }: Props) {
  const [following, setFollowing] = useState(init)
  const [busy, setBusy]           = useState(false)
  const [dmLoading, setDmLoading] = useState(false)
  const router  = useRouter()
  const supabase = createClient()

  const toggle = async () => {
    if (!hasUser) { router.push('/login'); return }
    if (busy) return
    setBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (following) {
      await supabase.from('takip').delete()
        .eq('takipci_id', user.id).eq('takip_edilen_id', profileId)
      setFollowing(false)
    } else {
      await supabase.from('takip').insert({ takipci_id: user.id, takip_edilen_id: profileId })
      setFollowing(true)
      fetch('/api/notify/follower', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: profileId }),
      }).catch(() => {})
    }
    setBusy(false)
  }

  const startDM = async () => {
    if (!hasUser) { router.push('/login'); return }
    setDmLoading(true)
    const res  = await fetch('/api/dm/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: profileId }),
    })
    const data = await res.json()
    setDmLoading(false)
    if (data.error) { alert(data.error); return }
    router.push('/messages')
  }

  if (isMyProfile) {
    return (
      <Link href="/profile/edit"
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--accent)]/50 transition-all">
        <Settings style={{ width: 14, height: 14 }} />
        Profili Düzenle
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={toggle} disabled={busy}
        className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${
          following
            ? 'border border-[var(--border)] text-[var(--fg-muted)] hover:border-red-400/40 hover:text-red-400'
            : 'text-white hover:scale-105'
        }`}
        style={!following ? { background: 'linear-gradient(135deg,#d4840f,#e8a030)' } : {}}>
        {following
          ? <><UserMinus style={{ width: 14, height: 14 }} /> Takipten Çık</>
          : <><UserPlus  style={{ width: 14, height: 14 }} /> Takip Et</>}
      </button>

      <button onClick={startDM} disabled={dmLoading}
        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--accent)]/50 transition-all disabled:opacity-50"
        title="Mesaj gönder">
        {dmLoading
          ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
          : <MessageSquare style={{ width: 14, height: 14 }} />}
        <span className="hidden sm:inline">Mesaj</span>
      </button>
    </div>
  )
}
