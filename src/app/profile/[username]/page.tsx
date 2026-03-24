import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileClient } from './ProfileClient'
import type { Metadata } from 'next'

interface Props { params: { username: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles').select('username, display_name, bio, avatar_url').eq('username', params.username).single()

  if (!profile) return { title: 'Kullanıcı Bulunamadı' }

  const name  = profile.display_name || profile.username
  const title = `${name} — InkStory Yazar Profili`
  const desc  = profile.bio
    ? profile.bio.slice(0, 160)
    : `${name}'nin InkStory'deki hikayelerini keşfet.`

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: 'profile',
      url: `https://inkstory.com.tr/profile/${params.username}`,
      siteName: 'InkStory',
      images: profile.avatar_url
        ? [{ url: profile.avatar_url, width: 400, height: 400, alt: name }]
        : [{ url: '/og-default.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary',
      title,
      description: desc,
      images: profile.avatar_url ? [profile.avatar_url] : ['/og-default.png'],
    },
  }
}

export default async function ProfilePage({ params }: Props) {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('username', params.username).single()
  if (!profile) notFound()

  const [
    { data: stories },
    { count: followerCount },
    { count: followingCount },
    { data: { user } },
  ] = await Promise.all([
    supabase.from('hikayeler')
      .select('*, profiles(id,username,display_name,avatar_url), kategoriler(id,ad,slug,renk,ikon)')
      .eq('yazar_id', profile.id).in('durum', ['yayinda','tamamlandi'])
      .order('created_at', { ascending: false }),
    supabase.from('takip').select('*', { count:'exact', head:true }).eq('takip_edilen_id', profile.id),
    supabase.from('takip').select('*', { count:'exact', head:true }).eq('takipci_id', profile.id),
    supabase.auth.getUser(),
  ])

  const isMyProfile = user?.id === profile.id
  let isFollowing = false
  if (user && !isMyProfile) {
    const { data } = await supabase.from('takip').select('id')
      .eq('takipci_id', user.id).eq('takip_edilen_id', profile.id).single()
    isFollowing = !!data
  }

  const totalReads = (stories || []).reduce((a, s) => a + (s.goruntuleme || 0), 0)

  return (
    <ProfileClient
      profile={profile}
      stories={stories || []}
      followerCount={followerCount || 0}
      followingCount={followingCount || 0}
      totalReads={totalReads}
      isMyProfile={isMyProfile}
      isFollowing={isFollowing}
      hasUser={!!user}
    />
  )
}
