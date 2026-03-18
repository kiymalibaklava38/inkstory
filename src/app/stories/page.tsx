import { createClient } from '@/lib/supabase/server'
import { StoriesClient } from './StoriesClient'

interface Props {
  searchParams: { category?: string; sort?: string; page?: string }
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
