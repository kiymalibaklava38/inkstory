'use client'

import { useState } from 'react'
import { Flag, X, Loader2, Check } from 'lucide-react'
import { useLang } from '@/lib/i18n'

const REASONS = [
  { id: 'spam',            en: 'Spam',             tr: 'Spam' },
  { id: 'harassment',      en: 'Harassment',       tr: 'Taciz' },
  { id: 'hate_speech',     en: 'Hate Speech',      tr: 'Nefret Söylemi' },
  { id: 'sexual_content',  en: 'Sexual Content',   tr: 'Cinsel İçerik' },
  { id: 'violence',        en: 'Violence',         tr: 'Şiddet' },
  { id: 'misinformation',  en: 'Misinformation',   tr: 'Yanlış Bilgi' },
  { id: 'copyright',       en: 'Copyright',        tr: 'Telif Hakkı' },
  { id: 'other',           en: 'Other',            tr: 'Diğer' },
]

interface Props {
  targetType: 'story' | 'comment' | 'user'
  targetId:   string
  /** small = just an icon button, full = text + icon */
  variant?: 'icon' | 'full'
}

export function ReportButton({ targetType, targetId, variant = 'icon' }: Props) {
  const [open, setOpen]       = useState(false)
  const [reason, setReason]   = useState('')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState('')
  const { lang } = useLang()

  const submit = async () => {
    if (!reason) return
    setLoading(true); setError('')

    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_type: targetType, target_id: targetId, reason, details: details || undefined }),
    })
    const data = await res.json()

    if (!res.ok) { setError(data.error || 'Failed to submit report.'); setLoading(false); return }
    setDone(true); setLoading(false)
    setTimeout(() => { setOpen(false); setDone(false); setReason(''); setDetails('') }, 1500)
  }

  const labels = {
    title:       lang === 'tr' ? 'İçeriği Raporla'     : 'Report Content',
    reasonLabel: lang === 'tr' ? 'Sebep seç'           : 'Select a reason',
    detailsPh:   lang === 'tr' ? 'Ek detay (isteğe bağlı)...' : 'Additional details (optional)...',
    submit:      lang === 'tr' ? 'Gönder'              : 'Submit Report',
    cancel:      lang === 'tr' ? 'İptal'               : 'Cancel',
    done:        lang === 'tr' ? '✓ Rapor gönderildi'  : '✓ Report submitted',
    btnLabel:    lang === 'tr' ? 'Raporla'             : 'Report',
  }

  return (
    <>
      {variant === 'icon' ? (
        <button onClick={() => setOpen(true)} title={labels.btnLabel}
          className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all">
          <Flag style={{ width: 14, height: 14 }} />
        </button>
      ) : (
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-sm text-[var(--fg-muted)] hover:text-red-400 transition-colors">
          <Flag style={{ width: 14, height: 14 }} />
          {labels.btnLabel}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 max-w-md w-full shadow-2xl animate-fade-in">
            {done ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-3">
                  <Check style={{ width: 22, height: 22 }} className="text-emerald-400" />
                </div>
                <p className="font-medium text-[var(--fg)]">{labels.done}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Flag style={{ width: 16, height: 16 }} className="text-red-400" />
                    <h3 className="font-display font-bold text-[var(--fg)]">{labels.title}</h3>
                  </div>
                  <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]">
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                </div>

                <p className="text-sm text-[var(--fg-muted)] mb-4">{labels.reasonLabel}</p>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {REASONS.map(r => (
                    <button key={r.id} onClick={() => setReason(r.id)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-medium border text-left transition-all ${
                        reason === r.id
                          ? 'border-red-400/50 bg-red-500/10 text-red-400'
                          : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent)]/40 hover:text-[var(--fg)]'
                      }`}>
                      {lang === 'tr' ? r.tr : r.en}
                    </button>
                  ))}
                </div>

                <textarea value={details} onChange={e => setDetails(e.target.value)} rows={3}
                  placeholder={labels.detailsPh} maxLength={1000}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] text-sm resize-none mb-4" />

                {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

                <div className="flex gap-3">
                  <button onClick={() => setOpen(false)}
                    className="flex-1 py-2.5 border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--fg-muted)] hover:border-[var(--fg-muted)] transition-all">
                    {labels.cancel}
                  </button>
                  <button onClick={submit} disabled={!reason || loading}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#e85d75,#e8304d)' }}>
                    {loading ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Flag style={{ width: 14, height: 14 }} />}
                    {labels.submit}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
