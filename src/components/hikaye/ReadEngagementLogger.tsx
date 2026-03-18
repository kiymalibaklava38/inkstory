'use client'

import { useEffect } from 'react'

interface Props {
  storyId: string
}

// Okuma olayını trending sistemi için loglar
// Sayfa açıldıktan 10 saniye sonra (gerçek okuma sayılır)
export function ReadEngagementLogger({ storyId }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch('/api/engagement', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ hikaye_id: storyId, event_type: 'read' }),
      }).catch(() => {})
    }, 10_000) // 10 saniye sonra — gerçek okuma

    return () => clearTimeout(timer)
  }, [storyId])

  return null
}
