import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { checkRateLimit, apiLimiter } from '@/lib/ratelimit'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const limited = await checkRateLimit(req, apiLimiter)
  if (limited) return limited

  const { error } = await requireAdmin()
  if (error) return error

  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') || '7')

  const since = new Date()
  since.setDate(since.getDate() - days)

  // Top users by AI usage
  const { data: topUsers } = await supabase
    .from('ai_usage_logs')
    .select('user_id, profiles(username, display_name)')
    .gte('created_at', since.toISOString())

  // Group by user client-side (Supabase doesn't support GROUP BY in JS client)
  const userMap: Record<string, { username: string; display_name: string | null; total_calls: number; total_tokens: number; last_used: string }> = {}

  for (const row of topUsers || []) {
    const uid = row.user_id
    if (!userMap[uid]) {
      userMap[uid] = {
        username:     (row.profiles as any)?.username || 'unknown',
        display_name: (row.profiles as any)?.display_name || null,
        total_calls:  0,
        total_tokens: 0,
        last_used:    '',
      }
    }
    userMap[uid].total_calls++
  }

  const summaries = Object.entries(userMap)
    .map(([user_id, data]) => ({
      user_id,
      ...data,
      suspicious: data.total_calls > 50, // flag >50 calls in period
    }))
    .sort((a, b) => b.total_calls - a.total_calls)
    .slice(0, 20)

  // Daily usage for chart (last N days)
  const { data: dailyRaw } = await supabase
    .from('ai_usage_logs')
    .select('created_at')
    .gte('created_at', since.toISOString())
    .order('created_at')

  // Group by date
  const dailyMap: Record<string, number> = {}
  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dailyMap[d.toISOString().split('T')[0]] = 0
  }
  for (const row of dailyRaw || []) {
    const day = row.created_at.split('T')[0]
    if (dailyMap[day] !== undefined) dailyMap[day]++
    else dailyMap[day] = 1
  }

  const daily = Object.entries(dailyMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Total stats
  const totalCalls = (dailyRaw || []).length

  return NextResponse.json({ summaries, daily, totalCalls, days })
}
