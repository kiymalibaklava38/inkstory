import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminDashboard } from './AdminDashboard'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  const [
    { count: userCount },
    { count: storyCount },
    { count: reportCount },
    { count: bannedCount },
    { data: recentUsers },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('hikayeler').select('*', { count: 'exact', head: true }),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_banned', true),
    supabase.from('profiles').select('id,username,display_name,avatar_url,created_at,is_banned')
      .order('created_at', { ascending: false }).limit(8),
  ])

  const totalReadsRaw = await supabase.from('hikayeler').select('goruntuleme')
  const totalReads = (totalReadsRaw.data || []).reduce((a: number, h: any) => a + (h.goruntuleme || 0), 0)

  return (
    <AdminDashboard
      stats={{ userCount: userCount||0, storyCount: storyCount||0, reportCount: reportCount||0, bannedCount: bannedCount||0, totalReads }}
      recentUsers={recentUsers || []}
    />
  )
}
