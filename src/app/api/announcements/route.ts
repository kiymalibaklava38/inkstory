import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, message, created_at')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return NextResponse.json({ announcement: null })
  }

  return NextResponse.json({ announcement: data })
}
