'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n'
import { Save, ArrowLeft, Camera, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function EditProfilePage() {
  const [form, setForm] = useState({ display_name: '', username: '', bio: '', website: '' })
  const [avatarFile, setAvatarFile]   = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null)
  const [originalUsername, setOriginalUsername] = useState('')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)
  const router   = useRouter()
  const supabase = createClient()
  const { t } = useLang()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setForm({
          display_name: data.display_name || '',
          username:     data.username || '',
          bio:          data.bio || '',
          website:      data.website || '',
        })
        setOriginalUsername(data.username)
        setCurrentAvatar(data.avatar_url)
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 2 * 1024 * 1024) { setError('Avatar must be under 2MB'); return }
    setAvatarFile(f)
    setAvatarPreview(URL.createObjectURL(f))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Username validation
    if (!/^[a-z0-9_]+$/.test(form.username)) {
      setError('Username: only lowercase letters, numbers, and underscores.'); setSaving(false); return
    }

    if (form.username !== originalUsername) {
      const { data: taken } = await supabase.from('profiles').select('id').eq('username', form.username).neq('id', user.id).single()
      if (taken) { setError('Username already taken.'); setSaving(false); return }
    }

    let avatarUrl = currentAvatar

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      const { error: upErr } = await supabase.storage.from('avatarlar').upload(path, avatarFile, { upsert: true })
      if (upErr) { setError('Avatar upload failed: ' + upErr.message); setSaving(false); return }
      const { data: urlData } = supabase.storage.from('avatarlar').getPublicUrl(path)
      avatarUrl = urlData.publicUrl
    }

    const { error: updateErr } = await supabase.from('profiles').update({
      display_name: form.display_name || null,
      username:     form.username,
      bio:          form.bio || null,
      website:      form.website || null,
      avatar_url:   avatarUrl,
      updated_at:   new Date().toISOString(),
    }).eq('id', user.id)

    if (updateErr) { setError('Update failed: ' + updateErr.message); setSaving(false); return }

    setSuccess(true)
    setSaving(false)
    setTimeout(() => router.push(`/profile/${form.username}`), 1500)
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 style={{ width: 28, height: 28 }} className="animate-spin text-[var(--accent)]" />
    </div>
  )

  const avatar = avatarPreview || currentAvatar

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/profile/${originalUsername}`}
          className="p-2 rounded-xl text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-all">
          <ArrowLeft style={{ width: 18, height: 18 }} />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--fg)]">{t.editProfileTitle}</h1>
          <p className="text-[var(--fg-muted)] text-sm mt-0.5">@{originalUsername}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-6">
          <div className="relative group flex-shrink-0">
            {avatar ? (
              <img src={avatar} alt="" className="w-24 h-24 rounded-2xl object-cover border-2 border-[var(--border)]" />
            ) : (
              <div className="w-24 h-24 rounded-2xl border-2 border-[var(--border)] flex items-center justify-center text-2xl font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                {(form.display_name || form.username || '?')[0].toUpperCase()}
              </div>
            )}
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera style={{ width: 22, height: 22 }} className="text-white" />
              <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
            </label>
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--fg)]">{t.profilePhoto}</p>
            <p className="text-xs text-[var(--fg-muted)] mt-1">PNG or JPG, max 2MB</p>
            <label className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border)] text-xs font-medium text-[var(--fg-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer">
              <Camera style={{ width: 12, height: 12 }} />
              {t.choosePhoto}
              <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
            </label>
          </div>
        </div>

        {/* Form fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">{t.displayName}</label>
            <input type="text" value={form.display_name} onChange={set('display_name')}
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">{t.username} *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] text-sm">@</span>
              <input type="text" value={form.username} onChange={set('username')} required
                pattern="[a-z0-9_]+"
                className="w-full pl-8 pr-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] focus:outline-none focus:border-[var(--accent)] transition-all" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">{t.bio}</label>
          <textarea value={form.bio} onChange={set('bio')} rows={4}
            placeholder={t.bioPlaceholder}
            maxLength={300}
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] resize-none transition-all" />
          <p className="text-xs text-[var(--fg-muted)] text-right mt-1">{form.bio.length}/300</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">{t.website}</label>
          <input type="url" value={form.website} onChange={set('website')}
            placeholder="https://yoursite.com"
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] transition-all" />
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}
        {success && (
          <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">{t.profileUpdated}</div>
        )}

        <div className="flex gap-3 pt-2">
          <Link href={`/profile/${originalUsername}`}
            className="flex-1 py-3 text-center border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--fg-muted)] hover:border-[var(--fg-muted)] transition-all">
            {t.cancel}
          </Link>
          <button type="submit" disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-white transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
            {saving ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : <><Save style={{ width: 14, height: 14 }} />{t.saveChanges}</>}
          </button>
        </div>
      </form>
    </div>
  )
}
