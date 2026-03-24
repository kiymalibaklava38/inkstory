import { createClient } from '@/lib/supabase/server'
import { StoriesClient } from './StoriesClient'
import type { Metadata } from 'next'

interface Props {
  searchParams: { category?: string; sort?: string; page?: string }
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const supabase = await createClient()
  const { category } = searchParams

  if (category) {
    const { data: cat } = await supabase.from('kategoriler').select('ad, ikon').eq('slug', category).single()
    if (cat) {
      const title = `${cat.ikon} ${cat.ad} Hikayeleri — InkStory`
      const desc  = `InkStory'de en iyi ${cat.ad} hikayelerini oku ve keşfet.`
      return {
        title,
        description: desc,
        openGraph: { title, description: desc, url: `https://inkstory.com.tr/stories?category=${category}`, siteName: 'InkStory' },
      }
    }
  }

  return {
    title: 'Hikayeler — InkStory',
    description: 'InkStory\'de binlerce hikaye seni bekliyor. Romantik, fantastik, gerilim ve daha fazlası.',
    openGraph: {
      title: 'Hikayeler — InkStory',
      description: 'InkStory\'de binlerce hikaye seni bekliyor.',
      url: 'https://inkstory.com.tr/stories',
      siteName: 'InkStory',
    },
  }
}

export default async function StoriesPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { category, sort = 'new', page = '1' } = searchParams
  const pageNo  = parseInt(page)
  const perPage = 12
  const offset  = (pageNo - 1) * perPage

  const { data: categories } = await supabase.from('kategoriler').select('*').order('id')

  let query = supabase
    .from('hikayeler')
    .select('*, profiles(id,username,display_name,avatar_url), kategoriler(id,ad,slug,renk,ikon)', { count: 'exact' })
    .in('durum', ['yayinda', 'tamamlandi'])
    .range(offset, offset + perPage - 1)

  if (category) {
    const cat = categories?.find(c => c.slug === category)
    if (cat) query = query.eq('kategori_id', cat.id)
  }

  query = sort === 'popular'
    ? query.order('goruntuleme', { ascending: false })
    : query.order('created_at', { ascending: false })

  const { data: stories, count } = await query
  const totalPages = Math.ceil((count || 0) / perPage)

  return (
    <StoriesClient
      stories={stories || []}
      categories={categories || []}
      count={count || 0}
      category={category}
      sort={sort}
      pageNo={pageNo}
      totalPages={totalPages}
    />
  )
}
