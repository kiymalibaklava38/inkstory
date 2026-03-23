'use client'

import { useEffect } from 'react'
import { useLang } from '@/lib/i18n'

export function DynamicTitle() {
  const { lang } = useLang()

  useEffect(() => {
    const title = lang === 'tr'
      ? 'InkStory – Dünyanı Yaz'
      : 'InkStory – Write Your World'
    document.title = title
  }, [lang])

  return null
}
