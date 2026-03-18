import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const supabase = await createClient()

  const { data, count, error: dbErr } = await supabase
    .from('premium_waitlist')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ emails: data || [], total: count || 0 })
}
