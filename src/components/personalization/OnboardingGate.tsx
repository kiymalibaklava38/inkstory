'use client'

import { useState, useEffect } from 'react'
import { InterestPicker } from './InterestPicker'
import { createClient } from '@/lib/supabase/client'

interface Props {
  children: React.ReactNode
}

export function OnboardingGate({ children }: Props) {
  const [show, setShow]         = useState(false)
  const [checked, setChecked]   = useState(false)
  const [userReady, setUserReady] = useState(false)

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) { setChecked(true); return }

      // localStorage'da skip kaydı var mı?
      const skipped = localStorage.getItem('inkstory-onboarding-skipped')
      if (skipped) { setChecked(true); return }

      // DB'den tercih var mı kontrol et
      const res = await fetch('/api/preferences')
      if (!res.ok) { setChecked(true); return }
      const data = await res.json()

      if (!data.categories || data.categories.length === 0) {
        setShow(true)
      }
      setUserReady(true)
      setChecked(true)
    }
    check()
  }, [])

  if (!checked) return <>{children}</>

  return (
    <>
      {children}
      {show && (
        <InterestPicker
          isModal
          onSave={() => { setShow(false) }}
          onSkip={() => {
            localStorage.setItem('inkstory-onboarding-skipped', '1')
            setShow(false)
          }}
        />
      )}
    </>
  )
}
