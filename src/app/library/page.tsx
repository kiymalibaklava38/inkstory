import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LibraryClient } from './LibraryClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kütüphanem — InkStory',
  description: 'Kaydettiğin hikayeler ve okuma listelerin.',
}

export default async function LibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/library')

  const [{ data: saved }, { data: folders }] = await Promise.all([
    supabase.from('okuma_listesi')
      .select('id, hikaye_id, klasor_id, created_at, hikayeler(id,baslik,slug,kapak_url,goruntuleme,profiles(username,display_name,avatar_url),kategoriler(ad,ikon,renk))')
      .eq('kullanici_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('okuma_klasorleri')
      .select('*').eq('kullanici_id', user.id).order('sira'),
  ])

  // Düzeltme: Supabase'den gelen hikayeler dizisini tekil nesneye çeviriyoruz
  const formattedSaved = (saved || []).map((item: any) => ({
    ...item,
    hikayeler: Array.isArray(item.hikayeler) ? item.hikayeler[0] : item.hikayeler
  }))

  return (
    <LibraryClient
      initialStories={formattedSaved}
      initialFolders={folders || []}
    />
  )
}