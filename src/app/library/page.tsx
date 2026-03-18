import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LibraryClient } from './LibraryClient'

export default async function LibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/library')

  const { data: saved } = await supabase
    .from('okuma_listesi')
    .select('hikaye_id, hikayeler(*, profiles(id,username,display_name,avatar_url), kategoriler(id,ad,slug,renk,ikon))')
    .eq('kullanici_id', user.id)
    .order('created_at', { ascending: false })

  const stories = saved?.map((s: any) => s.hikayeler).filter(Boolean) || []
  return <LibraryClient stories={stories} />
}
