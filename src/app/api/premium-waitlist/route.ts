import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const Schema = z.object({
  email: z.string().email().max(254),
  lang:  z.enum(['tr', 'en']).default('tr'),
})

// Basit IP rate limit - aynı IP'den dakikada 3 istek
const ipMap = new Map<string, number[]>()

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '0'
  const now = Date.now()
  const hits = (ipMap.get(ip) || []).filter(t => now - t < 60_000)
  if (hits.length >= 3) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  ipMap.set(ip, [...hits, now])

  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })

  const supabase = await createClient()

  const { error } = await supabase
    .from('premium_waitlist')
    .insert({ email: parsed.data.email, lang: parsed.data.lang })

  // Duplicate email → still return success (don't leak info)
  if (error && !error.message.includes('unique')) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
