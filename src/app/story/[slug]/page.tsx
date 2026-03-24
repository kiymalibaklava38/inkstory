import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StoryDetailClient } from './StoryDetailClient'
import { headers } from 'next/headers'
import { createHash } from 'crypto'
import type { Metadata } from 'next'

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createClient()
  const { data: story } = await supabase
    .from('hikayeler')
    .select('baslik, aciklama, kapak_url, profiles(username, display_name), kategoriler(ad)')
    .eq('slug', params.slug)
    .single()

  if (!story) return { title: 'Hikaye Bulunamadı' }

  const author = (story.profiles as any)?.display_name || (story.profiles as any)?.username
  const title  = `${story.baslik} — ${author} | InkStory`
  const desc   = story.aciklama
    ? story.aciklama.slice(0, 160)
    : `${author} tarafından yazılmış bir hikaye. InkStory'de oku.`

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: 'article',
      url: `https://inkstory.com.tr/story/${params.slug}`,
      siteName: 'InkStory',
      images: story.kapak_url
        ? [{ url: story.kapak_url, width: 800, height: 400, alt: story.baslik }]
        : [{ url: '/og-default.png', width: 1200, height: 630, alt: 'InkStory' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: story.kapak_url ? [story.kapak_url] : ['/og-default.png'],
    },
  }
}

export default async function StoryPage({ params }: Props) {
  const supabase = await createClient()

  const { data: story } = await supabase
    .from('hikayeler')
    .select('*, profiles(id,username,display_name,avatar_url,bio,is_verified,verification_badge), kategoriler(id,ad,slug,renk,ikon)')
    .eq('slug', params.slug)
    .single()

  if (!story) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  // Get IP hash for anonymous view dedup
  const headersList = headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
    || headersList.get('x-real-ip')
    || 'unknown'
  const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 16)

  // Increment view with anti-spam protection
  await supabase.rpc('increment_goruntuleme', {
    hikaye_id:       story.id,
    viewer_user_id:  user?.id || null,
    viewer_ip_hash:  user ? null : ipHash,
  })

  const { data: chapters } = await supabase
    .from('bolumler')
    .select('id,baslik,bolum_no,kelime_sayisi,yayinda,created_at')
    .eq('hikaye_id', story.id).eq('yayinda', true)
    .order('bolum_no')

  const { count: likeCount } = await supabase
    .from('begeniler').select('*', { count: 'exact', head: true }).eq('hikaye_id', story.id)

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
