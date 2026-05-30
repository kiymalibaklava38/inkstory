'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { InkLogo } from '@/components/ui/InkLogo'
import { Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

function ResetPasswordForm() {
  const [state, setState] = useState<'loading' | 'ready' | 'invalid' | 'done'>('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleAuth = async () => {
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1))
        const { error } = await supabase.auth.setSession({
          access_token: params.get('access_token')!,
          refresh_token: params.get('refresh_token')!,
        })
        if (!error) {
          setState('ready')
          window.history.replaceState(null, '', window.location.pathname)
          return
        }
      }
      const { data: { session } } = await supabase.auth.getSession()
      setState(session ? 'ready' : 'invalid')
    }
    handleAuth()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError('Şifre en az 6 karakter olmalı.'); return }
    if (password !== confirm) { setError('Şifreler eşleşmiyor.'); return }

    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setSubmitting(false); return }
    await supabase.auth.signOut()
    setState('done')
    setTimeout(() => router.push('/login'), 2500)
  }

  if (state === 'loading') return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>
  if (state === 'invalid') return <div className="min-h-screen flex items-center justify-center">Link geçersiz. <Link href="/forgot-password">Yeniden Gönder</Link></div>
  if (state === 'done') return <div className="min-h-screen flex items-center justify-center">Şifre güncellendi!</div>

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Yeni Şifre" required className="w-full p-2 border" />
        <input type={showPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Şifre Tekrar" required className="w-full p-2 border" />
        <button type="submit" disabled={submitting} className="w-full p-2 bg-blue-500 text-white">Güncelle</button>
      </form>
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={<div>Yükleniyor...</div>}><ResetPasswordForm /></Suspense>
}