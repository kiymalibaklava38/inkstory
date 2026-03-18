import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StoryDetailClient } from './StoryDetailClient'

interface Props { params: { slug: string } }

export default async function StoryPage({ params }: Props) {
  const supabase = await createClient()

  const { data: story } = await supabase
    .from('hikayeler')
    .select('*, profiles(id,username,display_name,avatar_url,bio), kategoriler(id,ad,slug,renk,ikon)')
    .eq('slug', params.slug)
    .single()

  if (!story) notFound()

  await supabase.rpc('increment_goruntuleme', { hikaye_id: story.id })

  const { data: chapters } = await supabase
    .from('bolumler')
    .select('id,baslik,bolum_no,kelime_sayisi,yayinda,created_at')
    .eq('hikaye_id', story.id).eq('yayinda', true)
    .order('bolum_no')

  const { count: likeCount } = await supabase
    .from('begeniler').select('*', { count: 'exact', head: true }).eq('hikaye_id', story.id)

  const { data: { user } } = await supabase.auth.getUser()

  let userLiked = false, userSaved = false, userFollows = false

  if (user) {
    const [l, s, f] = await Promise.all([
      supabase.from('begeniler').select('id').eq('kullanici_id', user.id).eq('hikaye_id', story.id).single(),
      supabase.from('okuma_listesi').select('id').eq('kullanici_id', user.id).eq('hikaye_id', story.id).single(),
      supabase.from('takip').select('id').eq('takipci_id', user.id).eq('takip_edilen_id', story.profiles.id).single(),
    ])
    userLiked   = !!l.data
    userSaved   = !!s.data
    userFollows = !!f.data
  }

  return (
    <StoryDetailClient
      story={story}
      chapters={chapters || []}
      likeCount={likeCount || 0}
      userLiked={userLiked}
      userSaved={userSaved}
      userFollows={userFollows}
      userId={user?.id || null}
    />
  )
}
