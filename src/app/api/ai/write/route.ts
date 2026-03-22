import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, aiLimiter } from '@/lib/ratelimit'
import { requireAuth } from '@/lib/auth-helpers'
import { parseOrError, AiWriteSchema } from '@/lib/validation'

const FREE_ACTIONS  = ['continue', 'improve', 'emotional']
const PREMIUM_ACTIONS = ['dialogue', 'descriptive', 'plot_twist', 'next_chapter', 'proofread']

const ACTION_PROMPTS: Record<string, string> = {
  continue:
    'Continue this story naturally, matching the established tone, voice, and style. Write the next 2–3 paragraphs. Output only the new story text — no explanations or meta-commentary.',
  improve:
    'Improve the writing quality of this passage. Make it more vivid, precise, and engaging while preserving the same meaning and events. Output only the revised text.',
  emotional:
    'Rewrite this passage to be more emotionally resonant. Deepen feelings, internal thoughts, and sensory details. Output only the revised text.',
  dialogue:
    'Improve the dialogue in this passage. Make it sound more natural, revealing of character, and dramatically engaging. Output only the revised text.',
  descriptive:
    "Enhance this passage with richer sensory details, atmosphere, and vivid imagery — show, don't tell. Output only the revised text.",
  plot_twist:
    'Suggest a compelling and surprising plot twist that could naturally emerge from this story. Describe how it could unfold in 2–3 paragraphs. Output only the suggestion.',
  next_chapter:
    'Based on this story so far, suggest a compelling direction and key events for the next chapter. Include a chapter title and a brief outline. Output only the suggestion.',
  proofread:
    `You are a professional editor. Carefully proofread the following text and identify ALL issues. 
Respond in this exact format (in the same language as the text):

## 📝 Genel Değerlendirme
[1-2 sentence overall assessment]

## ❌ Hatalar ve Sorunlar
[List each issue with line/quote reference, category label, and fix suggestion. Categories: Yazım Hatası, Dilbilgisi, Tutarsızlık, Anlatım, Noktalama]

## ✅ Güçlü Yanlar  
[What works well in the text]

## 💡 Öneriler
[Top 3 actionable improvement suggestions]

If text is in Turkish, respond entirely in Turkish. If in English, respond in English.
Be specific, cite exact phrases from the text, and be constructive.`,
}

export async function POST(req: NextRequest) {
  // ── 1. Rate limit (per IP — stricter than general API) ──
  const rateLimited = await checkRateLimit(req, aiLimiter)
  if (rateLimited) return rateLimited

  // ── 2. Auth — must be logged in to use AI ───────────────
  const { user, error: authError } = await requireAuth()
  if (authError) return authError


  // ── 3. Günlük AI limit kontrolü ────────────────────────
  {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // Yeni gün ise sayacı sıfırla
    await supabase.rpc('reset_ai_calls_if_needed', { p_user_id: user.id })

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium, premium_expires_at, ai_calls_today')
      .eq('id', user.id)
      .single()

    const isPremium = profile?.is_premium &&
      profile?.premium_expires_at &&
      new Date(profile.premium_expires_at) > new Date()

    const FREE_LIMIT = 5
    const callsToday = profile?.ai_calls_today || 0

    if (!isPremium && callsToday >= FREE_LIMIT) {
      return NextResponse.json({
        error: 'daily_limit_reached',
        callsToday,
        limit: FREE_LIMIT,
      }, { status: 402 })
    }

    // ── Premium-only action check ───────────────────────────
    // Parse action early to check
    let earlyAction: string | undefined
    try {
      const b = await req.clone().json()
      earlyAction = b?.action
    } catch {}

    if (earlyAction && PREMIUM_ACTIONS.includes(earlyAction) && !isPremium) {
      return NextResponse.json({
        error: 'premium_required',
        action: earlyAction,
      }, { status: 403 })
    }

    // Sayacı artır
    await supabase.rpc('increment_ai_calls', { p_user_id: user.id })
  }

  // ── 4. Parse & validate request body ───────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { data, error: validationError } = parseOrError(AiWriteSchema, body)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  // ── 5. API key check ────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[AI Route] ANTHROPIC_API_KEY is not configured.')
    return NextResponse.json(
      { error: 'AI service is not available. Please contact support.' },
      { status: 503 }
    )
  }

  // ── 6. Call Anthropic (server-side only) ────────────────
  const { action, text, storyTitle } = data!

  const systemPrompt = [
    'You are an expert creative writing assistant embedded inside a story editor.',
    'You help writers improve their stories with thoughtful, contextually appropriate suggestions.',
    storyTitle ? `The story is titled "${storyTitle.slice(0, 200)}".` : '',
    "Always match the writer's established tone, voice, and style.",
    'Respond ONLY with the requested creative content — no preamble, no explanations, no meta-commentary.',
  ].filter(Boolean).join(' ')

  // Use only the last 2000 chars for context to keep token usage reasonable
  const contextText = text.length > 2000 ? text.slice(-2000) : text

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: action === 'proofread' ? 2048 : 1024,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: `${ACTION_PROMPTS[action]}\n\n---\n${contextText}` }],
      }),
      // Server-side timeout
      signal: AbortSignal.timeout(30_000),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text().catch(() => '')
      console.error(`[AI Route] Anthropic error ${anthropicRes.status} for user ${user.id}:`, errText.slice(0, 200))

      if (anthropicRes.status === 401) {
        return NextResponse.json({ error: 'AI service authentication failed.' }, { status: 503 })
      }
      if (anthropicRes.status === 429) {
        return NextResponse.json({ error: 'AI service is busy. Please try again shortly.' }, { status: 429 })
      }
      return NextResponse.json({ error: 'AI service returned an unexpected error.' }, { status: 502 })
    }

    const responseData = await anthropicRes.json()
    const suggestion = (responseData.content as any[])
      ?.filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim()

    if (!suggestion) {
      return NextResponse.json({ error: 'AI returned an empty response. Please try again.' }, { status: 502 })
    }

    // Log AI usage (non-blocking)
    try {
      const supabase = await (await import('@/lib/supabase/server')).createClient()
      await supabase.from('ai_usage_logs').insert({
        user_id: user.id,
        action,
      })
    } catch { /* non-critical */ }

    return NextResponse.json({ suggestion })

  } catch (err: any) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return NextResponse.json({ error: 'AI request timed out. Please try again.' }, { status: 504 })
    }
    console.error('[AI Route] Unexpected error:', err?.message)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}

export function GET()    { return NextResponse.json({ error: 'Method not allowed' }, { status: 405 }) }
export function PUT()    { return NextResponse.json({ error: 'Method not allowed' }, { status: 405 }) }
export function DELETE() { return NextResponse.json({ error: 'Method not allowed' }, { status: 405 }) }
