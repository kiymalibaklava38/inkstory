'use client'

import { useState } from 'react'
import {
  Sparkles, RefreshCw, Check, X, ChevronDown,
  Zap, Heart, MessageSquare, Eye, GitBranch, BookPlus, Loader2
} from 'lucide-react'
import { useLang } from '@/lib/i18n'

interface Props {
  currentText: string
  onAccept:    (text: string) => void
  storyTitle?: string
}

type ActionId = 'continue' | 'improve' | 'emotional' | 'dialogue' | 'descriptive' | 'plot_twist' | 'next_chapter'

export function AiWritingPanel({ currentText, onAccept, storyTitle }: Props) {
  const [suggestion, setSuggestion]     = useState('')
  const [loading, setLoading]           = useState(false)
  const [activeAction, setActiveAction] = useState<ActionId | null>(null)
  const [error, setError]               = useState('')
  const [expanded, setExpanded]         = useState(true)
  const [limitReached, setLimitReached] = useState(false)
  const { lang } = useLang()

  const AI_ACTIONS: { id: ActionId; label: string; icon: any; color: string }[] = [
    { id: 'continue',     label: lang === 'tr' ? 'AI ile Devam Et'      : 'Continue with AI',       icon: Zap,           color: '#d4840f' },
    { id: 'improve',      label: lang === 'tr' ? 'Yazıyı Geliştir'      : 'Improve Writing',        icon: Sparkles,      color: '#5ba3d9' },
    { id: 'emotional',    label: lang === 'tr' ? 'Daha Duygusal Yap'    : 'Make it More Emotional', icon: Heart,         color: '#e85d75' },
    { id: 'dialogue',     label: lang === 'tr' ? 'Diyaloğu Güçlendir'   : 'Strengthen Dialogue',    icon: MessageSquare, color: '#7c5cbf' },
    { id: 'descriptive',  label: lang === 'tr' ? 'Betimleme Ekle'       : 'Add Descriptive Detail', icon: Eye,           color: '#2d9f6a' },
    { id: 'plot_twist',   label: lang === 'tr' ? 'Olay Örgüsü Öner'    : 'Suggest Plot Twist',     icon: GitBranch,     color: '#d4840f' },
    { id: 'next_chapter', label: lang === 'tr' ? 'Sonraki Bölümü Öner' : 'Suggest Next Chapter',   icon: BookPlus,      color: '#5ba3d9' },
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
    setActiveAction(action)

    try {
      const res  = await fetch('/api/ai/write', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, text: currentText, storyTitle: storyTitle || undefined }),
      })
      const data = await res.json()

      if (res.status === 402 && data.error === 'daily_limit_reached') {
        setLimitReached(true)
        setLoading(false)
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
    onAccept(suggestion)
    setSuggestion('')
    setActiveAction(null)
  }

  const handleReject = () => {
    setSuggestion('')
    setActiveAction(null)
  }

  const handleRegenerate = () => {
    if (activeAction) callAI(activeAction)
  }

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
            <div className="mb-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/8 text-center">
              <div className="text-2xl mb-2">🔒</div>
              <p className="text-xs font-bold text-amber-400 mb-1">
                {lang === 'tr' ? 'Günlük AI limitin doldu' : 'Daily AI limit reached'}
              </p>
              <p className="text-[11px] text-amber-400/70 mb-3 leading-relaxed">
                {lang === 'tr'
                  ? 'Bugün 5/5 isteğini kullandın. Yarın yenilenir.'
                  : "You've used 5/5 requests today. Resets tomorrow."}
              </p>
              <a href="/premium"
                className="block w-full py-2 rounded-lg text-xs font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                ⭐ {lang === 'tr' ? "Premium'a Bak" : 'See Premium'}
              </a>
              <p className="text-[10px] text-amber-400/50 mt-1.5">
                {lang === 'tr' ? 'Yakında — sınırsız erişim' : 'Coming soon — unlimited access'}
              </p>
            </div>
          )}

          {/* Action grid */}
          <div className={`grid grid-cols-2 gap-2 mb-4 ${limitReached ? 'opacity-30 pointer-events-none' : ''}`}>
            {AI_ACTIONS.map(action => {
              const isActiveLoading = activeAction === action.id && loading
              return (
                <button
                  key={action.id}
                  onClick={() => callAI(action.id)}
                  disabled={loading}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all text-left ${
                    isActiveLoading
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent)]/50 hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isActiveLoading
                    ? <Loader2 style={{ width: 13, height: 13, color: action.color }} className="animate-spin flex-shrink-0" />
                    : <action.icon style={{ width: 13, height: 13, color: action.color }} className="flex-shrink-0" />
                  }
                  <span className="truncate">{action.label}</span>
                </button>
              )
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-3">
              {error}
            </div>
          )}

          {/* Suggestion */}
          {suggestion && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles style={{ width: 13, height: 13 }} className="text-[var(--accent)]" />
                <span className="text-xs font-semibold text-[var(--accent)]">
                  {lang === 'tr' ? 'AI Önerisi' : 'AI Suggestion'}
                </span>
              </div>

              <div className="p-4 rounded-xl border-l-2 border-[var(--accent)] bg-[var(--accent)]/5 mb-3 max-h-52 overflow-y-auto">
                <p className="text-sm text-[var(--fg)] leading-relaxed whitespace-pre-wrap font-reading italic">
                  {suggestion}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAccept}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg,#2d9f6a,#3dbd82)' }}
                >
                  <Check style={{ width: 13, height: 13 }} />
                  {lang === 'tr' ? 'Kabul Et' : 'Accept'}
                </button>
                <button
                  onClick={handleRegenerate}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--accent)]/50 transition-all disabled:opacity-50"
                >
                  {loading
                    ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
                    : <RefreshCw style={{ width: 13, height: 13 }} />
                  }
                  {lang === 'tr' ? 'Tekrar Dene' : 'Retry'}
                </button>
                <button
                  onClick={handleReject}
                  className="flex items-center justify-center px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--fg-muted)] hover:text-red-400 hover:border-red-400/50 transition-all"
                >
                  <X style={{ width: 13, height: 13 }} />
                </button>
              </div>

              <p className="text-[10px] text-[var(--fg-muted)] mt-2 text-center">
                {lang === 'tr'
                  ? 'Kabul Et → editöre ekler · Reddet → siler'
                  : 'Accept inserts text into editor · Reject discards it'}
              </p>
            </div>
          )}

          {!suggestion && !loading && (
            <p className="text-xs text-[var(--fg-muted)] text-center py-2 opacity-60">
              {lang === 'tr' ? 'Yukarıdan bir eylem seç' : 'Select an action above to get AI assistance'}
            </p>
          )}

        </div>
      )}
    </div>
  )
}
