import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const hikayeId = new URL(req.url).searchParams.get('hikayeId')
  if (!hikayeId) return NextResponse.json({ count: 0 })
  const supabase = await createClient()
  const { count } = await supabase
    .from('hikaye_abonelikleri')
    .select('*', { count: 'exact', head: true })
    .eq('hikaye_id', hikayeId)
  return NextResponse.json({ count: count || 0 })
}
