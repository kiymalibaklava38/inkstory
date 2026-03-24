import { createClient } from '@/lib/supabase/server'
import { HomeClient } from './HomeClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'InkStory — Hikayeni Yaz, Dünyayla Paylaş',
  description: 'Türkiye\'nin hikaye yazma ve okuma platformu. AI destekli araçlarla yaz, oku, keşfet.',
  alternates: { canonical: 'https://inkstory.com.tr' },
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'InkStory',
  url: 'https://inkstory.com.tr',
  description: 'Türkiye\'nin hikaye yazma ve okuma platformu.',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://inkstory.com.tr/search?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
}

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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <HomeClient
        storyCount={storyCount || 0}
        writerCount={writerCount || 0}
        totalReads={totalReads}
        topStories={topStories || []}
        newStories={newStories || []}
        categories={categories || []}
        featuredStories={featuredStories || []}
      />
    </>
  )
}
