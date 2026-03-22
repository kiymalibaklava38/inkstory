'use client'

import { useState } from 'react'
import {
  Sparkles, RefreshCw, Check, X, ChevronDown,
  Zap, Heart, MessageSquare, Eye, GitBranch, BookPlus, Loader2,
  ShieldCheck, Lock
} from 'lucide-react'
import { useLang } from '@/lib/i18n'
import Link from 'next/link'

interface Props {
  currentText: string
  onAccept:    (text: string) => void
  storyTitle?: string
}

type ActionId = 'continue' | 'improve' | 'emotional' | 'dialogue' | 'descriptive' | 'plot_twist' | 'next_chapter' | 'proofread'

// First 3 = free, rest = premium
const FREE_ACTIONS: ActionId[]    = ['continue', 'improve', 'emotional']
const PREMIUM_ACTIONS: ActionId[] = ['dialogue', 'descriptive', 'plot_twist', 'next_chapter', 'proofread']

export function AiWritingPanel({ currentText, onAccept, storyTitle }: Props) {
  const [suggestion, setSuggestion]         = useState('')
  const [loading, setLoading]               = useState(false)
  const [activeAction, setActiveAction]     = useState<ActionId | null>(null)
  const [error, setError]                   = useState('')
  const [expanded, setExpanded]             = useState(true)
  const [limitReached, setLimitReached]     = useState(false)
  const [premiumRequired, setPremiumRequired] = useState(false)
  const [isProofread, setIsProofread]       = useState(false)
  const { lang } = useLang()

  const AI_ACTIONS: { id: ActionId; label: string; labelTr: string; icon: any; color: string; premium: boolean; description: string; descriptionTr: string }[] = [
    { id: 'continue',     label: 'Continue with AI',       labelTr: 'AI ile Devam Et',      icon: Zap,           color: '#d4840f', premium: false, description: 'Write next paragraphs',         descriptionTr: 'Sonraki paragrafları yaz' },
    { id: 'improve',      label: 'Improve Writing',        labelTr: 'Yazıyı Geliştir',      icon: Sparkles,      color: '#5ba3d9', premium: false, description: 'Enhance quality & style',       descriptionTr: 'Kalite ve üslubu geliştir' },
    { id: 'emotional',    label: 'Make More Emotional',    labelTr: 'Daha Duygusal Yap',    icon: Heart,         color: '#e85d75', premium: false, description: 'Deepen feelings & sensory',     descriptionTr: 'Duygu ve hisleri derinleştir' },
    { id: 'dialogue',     label: 'Strengthen Dialogue',    labelTr: 'Diyaloğu Güçlendir',   icon: MessageSquare, color: '#7c5cbf', premium: true,  description: 'Natural character voices',      descriptionTr: 'Doğal karakter sesleri' },
    { id: 'descriptive',  label: 'Add Descriptive Detail', labelTr: 'Betimleme Ekle',       icon: Eye,           color: '#2d9f6a', premium: true,  description: 'Vivid imagery & atmosphere',    descriptionTr: 'Canlı imgeler ve atmosfer' },
    { id: 'plot_twist',   label: 'Suggest Plot Twist',     labelTr: 'Olay Örgüsü Öner',     icon: GitBranch,     color: '#d4840f', premium: true,  description: 'Surprising story directions',   descriptionTr: 'Sürpriz hikaye yönleri' },
    { id: 'next_chapter', label: 'Suggest Next Chapter',   labelTr: 'Sonraki Bölümü Öner',  icon: BookPlus,      color: '#5ba3d9', premium: true,  description: 'Chapter outline & direction',   descriptionTr: 'Bölüm taslağı ve yön' },
    { id: 'proofread',    label: 'Proofread & Debug',      labelTr: 'Denetle & Hata Bul',   icon: ShieldCheck,   color: '#e85d75', premium: true,  description: 'Find errors & get feedback',    descriptionTr: 'Hata bul, geri bildirim al' },
  ]

  const callAI = async (action: ActionId) => {
    if (!currentText.trim()) {
      setError(lang === 'tr'
        ? 'Önce biraz metin yaz, sonra AI yardımı al.'
        : 'Please write some text first, then use AI assistance.')
      return
    }
    setLoading(true)
    setError('')
    setSuggestion('')
    setPremiumRequired(false)
    setActiveAction(action)
    setIsProofread(action === 'proofread')

    try {
      const res  = await fetch('/api/ai/write', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, text: currentText, storyTitle: storyTitle || undefined }),
      })
      const data = await res.json()

      if (res.status === 402 && data.error === 'daily_limit_reached') {
        setLimitReached(true)
        setActiveAction(null)
        return
      }

      if (res.status === 403 && data.error === 'premium_required') {
        setPremiumRequired(true)
        setActiveAction(null)
        return
      }

      if (!res.ok) throw new Error(data.error || 'AI request failed.')
      if (!data.suggestion) throw new Error('No suggestion returned.')

      setSuggestion(data.suggestion)
    } catch (err: any) {
      setError(
        lang === 'tr'
          ? 'AI şu an kullanılamıyor. Tekrar dene.'
          : (err.message || 'AI is temporarily unavailable. Please try again.')
      )
      setActiveAction(null)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = () => {
    // Proofread raporu editöre eklenmez, sadece kapatılır
    if (!isProofread) onAccept(suggestion)
    setSuggestion('')
    setActiveAction(null)
    setIsProofread(false)
  }

  const handleReject = () => {
    setSuggestion('')
    setActiveAction(null)
    setIsProofread(false)
  }

  const handleRegenerate = () => {
    if (activeAction) callAI(activeAction)
  }

  const freeActions    = AI_ACTIONS.filter(a => FREE_ACTIONS.includes(a.id))
  const premiumActions = AI_ACTIONS.filter(a => PREMIUM_ACTIONS.includes(a.id))

  return (
    <div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--card)]">

      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] hover:bg-[var(--bg-subtle)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles style={{ width: 16, height: 16 }} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold text-[var(--fg)]">
            {lang === 'tr' ? 'AI Yazma Asistanı' : 'AI Writing Assistant'}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] font-bold">BETA</span>
        </div>
        <ChevronDown
          style={{ width: 16, height: 16 }}
          className={`text-[var(--fg-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="p-4">

          {/* Daily limit banner */}
          {limitReached && (
            <div className="mb-4 p-4 rounded-xl border border-amber-500/30 text-center" style={{ background: 'rgba(245,158,11,0.08)' }}>
              <div className="text-2xl mb-2">🔒</div>
              <p className="text-xs font-bold text-amber-400 mb-1">
                {lang === 'tr' ? 'Günlük AI limitin doldu' : 'Daily AI limit reached'}
              </p>
              <p className="text-[11px] text-amber-400/70 mb-3 leading-relaxed">
                {lang === 'tr' ? 'Bugün 5/5 isteğini kullandın. Yarın yenilenir.' : "You've used 5/5 requests today. Resets tomorrow."}
              </p>
              <Link href="/premium"
                className="block w-full py-2 rounded-lg text-xs font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                ⭐ {lang === 'tr' ? 'Premium — Sınırsız AI' : 'Premium — Unlimited AI'}
              </Link>
            </div>
          )}

          {/* Premium required banner */}
          {premiumRequired && (
            <div className="mb-4 p-4 rounded-xl border border-[var(--accent)]/30 text-center" style={{ background: 'rgba(212,132,15,0.06)' }}>
              <div className="text-2xl mb-2">⭐</div>
              <p className="text-xs font-bold text-[var(--accent)] mb-1">
                {lang === 'tr' ? 'Bu özellik Premium\'a özel' : 'Premium Feature'}
              </p>
              <p className="text-[11px] text-[var(--fg-muted)] mb-3 leading-relaxed">
                {lang === 'tr'
                  ? 'Diyalog, betimleme, olay örgüsü, bölüm önerisi ve denetleme özellikleri Premium plana dahildir.'
                  : 'Dialogue, descriptive, plot twist, next chapter, and proofread are Premium features.'}
              </p>
              <Link href="/premium"
                className="block w-full py-2 rounded-lg text-xs font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                ⭐ {lang === 'tr' ? "Premium'a Geç" : 'Upgrade to Premium'}
              </Link>
              <button onClick={() => setPremiumRequired(false)} className="text-[10px] text-[var(--fg-muted)] mt-2 hover:text-[var(--fg)]">
                {lang === 'tr' ? 'Kapat' : 'Dismiss'}
              </button>
            </div>
          )}

          {/* Free actions */}
          <div className={limitReached ? 'opacity-30 pointer-events-none' : ''}>
            <p className="text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-wider mb-2">
              {lang === 'tr' ? '✦ Ücretsiz' : '✦ Free'}
            </p>
            <div className="grid grid-cols-1 gap-1.5 mb-4">
              {freeActions.map(action => {
                const isActiveLoading = activeAction === action.id && loading
                return (
                  <button
                    key={action.id}
                    onClick={() => callAI(action.id)}
                    disabled={loading}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all text-left ${
                      isActiveLoading
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent)]/50 hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isActiveLoading
                      ? <Loader2 style={{ width: 13, height: 13, color: action.color }} className="animate-spin flex-shrink-0" />
                      : <action.icon style={{ width: 13, height: 13, color: action.color }} className="flex-shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{lang === 'tr' ? action.labelTr : action.label}</p>
                      <p className="text-[10px] opacity-60 truncate">{lang === 'tr' ? action.descriptionTr : action.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Premium actions */}
            <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider mb-2 flex items-center gap-1">
              <span>⭐</span> {lang === 'tr' ? 'Premium' : 'Premium'}
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {premiumActions.map(action => {
                const isActiveLoading = activeAction === action.id && loading
                return (
                  <button
                    key={action.id}
                    onClick={() => callAI(action.id)}
                    disabled={loading}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all text-left ${
                      isActiveLoading
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'border-[var(--accent)]/20 text-[var(--fg-muted)] hover:border-[var(--accent)]/50 hover:text-[var(--fg)] hover:bg-[var(--accent)]/5'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isActiveLoading
                      ? <Loader2 style={{ width: 13, height: 13, color: action.color }} className="animate-spin flex-shrink-0" />
                      : <action.icon style={{ width: 13, height: 13, color: action.color }} className="flex-shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="font-semibold truncate">{lang === 'tr' ? action.labelTr : action.label}</p>
                        <Lock style={{ width: 9, height: 9 }} className="text-[var(--accent)] flex-shrink-0 opacity-60" />
                      </div>
                      <p className="text-[10px] opacity-60 truncate">{lang === 'tr' ? action.descriptionTr : action.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-3 mt-3">
              {error}
            </div>
          )}

          {/* Suggestion / Proofread result */}
          {suggestion && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                {isProofread
                  ? <ShieldCheck style={{ width: 13, height: 13 }} className="text-[var(--accent)]" />
                  : <Sparkles style={{ width: 13, height: 13 }} className="text-[var(--accent)]" />
                }
                <span className="text-xs font-semibold text-[var(--accent)]">
                  {isProofread
                    ? (lang === 'tr' ? 'Denetleme Raporu' : 'Proofread Report')
                    : (lang === 'tr' ? 'AI Önerisi' : 'AI Suggestion')}
                </span>
              </div>

              <div className={`p-4 rounded-xl border-l-2 border-[var(--accent)] bg-[var(--accent)]/5 mb-3 overflow-y-auto ${isProofread ? 'max-h-96' : 'max-h-52'}`}>
                {isProofread ? (
                  /* Proofread: render markdown-like formatting */
                  <div className="text-xs text-[var(--fg)] leading-relaxed space-y-2">
                    {suggestion.split('\n').map((line, i) => {
                      if (line.startsWith('## ')) {
                        return <p key={i} className="font-bold text-[var(--accent)] text-sm mt-3 mb-1">{line.replace('## ', '')}</p>
                      }
                      if (line.startsWith('- ') || line.startsWith('• ')) {
                        return <p key={i} className="pl-3 border-l border-[var(--border)]">{line}</p>
                      }
                      if (line.trim() === '') return <div key={i} className="h-1" />
                      return <p key={i}>{line}</p>
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--fg)] leading-relaxed whitespace-pre-wrap font-reading italic">
                    {suggestion}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                {!isProofread && (
                  <button
                    onClick={handleAccept}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg,#2d9f6a,#3dbd82)' }}
                  >
                    <Check style={{ width: 13, height: 13 }} />
                    {lang === 'tr' ? 'Kabul Et' : 'Accept'}
                  </button>
                )}
                <button
                  onClick={handleRegenerate}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--accent)]/50 transition-all disabled:opacity-50"
                >
                  {loading
                    ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
                    : <RefreshCw style={{ width: 13, height: 13 }} />}
                  {lang === 'tr' ? 'Tekrar' : 'Retry'}
                </button>
                <button
                  onClick={handleReject}
                  className="flex items-center justify-center px-3 py-2 rounded-xl text-xs border border-[var(--border)] text-[var(--fg-muted)] hover:text-red-400 hover:border-red-400/50 transition-all"
                >
                  <X style={{ width: 13, height: 13 }} />
                </button>
              </div>

              {!isProofread && (
                <p className="text-[10px] text-[var(--fg-muted)] mt-2 text-center">
                  {lang === 'tr' ? 'Kabul Et → editöre ekler · Reddet → siler' : 'Accept inserts into editor · Reject discards'}
                </p>
              )}
            </div>
          )}

          {!suggestion && !loading && !limitReached && !premiumRequired && (
            <p className="text-xs text-[var(--fg-muted)] text-center py-3 mt-2 opacity-60">
              {lang === 'tr' ? 'Yukarıdan bir eylem seç' : 'Select an action above'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
