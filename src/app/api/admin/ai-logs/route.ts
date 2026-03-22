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

  // Fetch logs — join profiles separately to avoid FK issues
  const { data: logs } = await supabase
    .from('ai_usage_logs')
    .select('id, user_id, action, created_at')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })

  if (!logs || logs.length === 0) {
    // Build empty daily chart
    const dailyMap: Record<string, number> = {}
    for (let i = 0; i < days; i++) {
      const d = new Date()
      d.setDate(d.getDate() - (days - 1 - i))
      dailyMap[d.toISOString().split('T')[0]] = 0
    }
    const daily = Object.entries(dailyMap).map(([date, count]) => ({ date, count }))
    return NextResponse.json({ summaries: [], daily, totalCalls: 0, days })
  }

  // Get unique user IDs
const userIds = Array.from(new Set(logs.map(l => l.user_id)));
  // Fetch profiles separately
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .in('id', userIds)

  const profileMap: Record<string, { username: string; display_name: string | null }> = {}
  for (const p of profiles || []) {
    profileMap[p.id] = { username: p.username, display_name: p.display_name }
  }

  // Group by user
  const userMap: Record<string, { username: string; display_name: string | null; total_calls: number; last_used: string }> = {}
  for (const row of logs) {
    const uid = row.user_id
    if (!userMap[uid]) {
      userMap[uid] = {
        username:     profileMap[uid]?.username || 'unknown',
        display_name: profileMap[uid]?.display_name || null,
        total_calls:  0,
        last_used:    row.created_at,
      }
    }
    userMap[uid].total_calls++
    if (row.created_at > userMap[uid].last_used) {
      userMap[uid].last_used = row.created_at
    }
  }

  const summaries = Object.entries(userMap)
    .map(([user_id, data]) => ({
      user_id,
      ...data,
      suspicious: data.total_calls > 50,
    }))
    .sort((a, b) => b.total_calls - a.total_calls)
    .slice(0, 20)

  // Daily chart — last N days
  const dailyMap: Record<string, number> = {}
  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    dailyMap[d.toISOString().split('T')[0]] = 0
  }
  for (const row of logs) {
    const day = row.created_at.split('T')[0]
    if (dailyMap[day] !== undefined) dailyMap[day]++
    else dailyMap[day] = 1
  }

  const daily = Object.entries(dailyMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({ summaries, daily, totalCalls: logs.length, days })
}
