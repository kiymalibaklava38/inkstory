import { createClient } from '@/lib/supabase/server'
import { HomeClient } from './HomeClient'

export default async function HomePage() {
  const supabase = await createClient()

  const [
    { count: storyCount },
    { count: writerCount },
    { data: topStories },
    { data: newStories },
    { data: categories },
    { data: featuredStories },
  ] = await Promise.all([
    supabase.from('hikayeler').select('*', { count: 'exact', head: true }).in('durum', ['yayinda', 'tamamlandi']),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('hikayeler')
      .select('*, profiles(id,username,display_name,avatar_url,is_premium), kategoriler(id,ad,slug,renk,ikon)')
      .in('durum', ['yayinda', 'tamamlandi'])
      .order('goruntuleme', { ascending: false })
      .limit(6),
    supabase.from('hikayeler')
      .select('*, profiles(id,username,display_name,avatar_url,is_premium), kategoriler(id,ad,slug,renk,ikon)')
      .in('durum', ['yayinda', 'tamamlandi'])
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('kategoriler').select('*').order('id'),
    supabase.from('hikayeler')
      .select('*, profiles(id,username,display_name,avatar_url,is_premium), kategoriler(id,ad,slug,renk,ikon)')
      .in('durum', ['yayinda', 'tamamlandi'])
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  const totalReads = (topStories || []).reduce((a: number, h: any) => a + (h.goruntuleme || 0), 0)

  return (
    <HomeClient
      storyCount={storyCount || 0}
      writerCount={writerCount || 0}
      totalReads={totalReads}
      topStories={topStories || []}
      newStories={newStories || []}
      categories={categories || []}
      featuredStories={featuredStories || []}
    />
  )
}
