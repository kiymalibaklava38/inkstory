import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { ALL_CATEGORIES } from '@/lib/categories'

const validSlugs = ALL_CATEGORIES.map(c => c.slug)

const SaveSchema = z.object({
  categories: z.array(z.string()).min(1).max(19),
})

// GET — kullanıcının tercihlerini getir
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const supabase = await createClient()
  const { data, error: dbErr } = await supabase
    .from('user_preferences')
    .select('category')
    .eq('user_id', user.id)
    .order('created_at')

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ categories: (data || []).map(r => r.category) })
}

// POST — tercihleri kaydet (tümünü replace eder)
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = SaveSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  // Geçersiz slug'ları filtrele
  const valid = parsed.data.categories.filter(c => validSlugs.includes(c))
  if (valid.length < 1) return NextResponse.json({ error: 'At least 1 valid category required' }, { status: 400 })

  const supabase = await createClient()

  // Önce sil, sonra ekle (replace mantığı)
  await supabase.from('user_preferences').delete().eq('user_id', user.id)

  const rows = valid.map(category => ({ user_id: user.id, category }))
  const { error: dbErr } = await supabase.from('user_preferences').insert(rows)

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ success: true, categories: valid })
}
