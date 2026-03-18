'use client'

import Link from 'next/link'
import { StoryCard } from '@/components/hikaye/StoryCard'
import { ProfileActions } from '@/components/profil/ProfileActions'
import { BookOpen, Users, Eye, Calendar, Globe } from 'lucide-react'
import { format } from 'date-fns'
import { tr as dateFnsTr, enUS } from 'date-fns/locale'
import { useLang } from '@/lib/i18n'

interface Props {
  profile:       any
  stories:       any[]
  followerCount: number
  followingCount: number
  totalReads:    number
  isMyProfile:   boolean
  isFollowing:   boolean
  hasUser:       boolean
}

export function ProfileClient({
  profile, stories, followerCount, followingCount,
  totalReads, isMyProfile, isFollowing, hasUser,
}: Props) {
  const { t, lang } = useLang()
  const locale = lang === 'tr' ? dateFnsTr : enUS

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)

  const joinedLabel = lang === 'tr'
    ? `${format(new Date(profile.created_at), 'MMMM yyyy', { locale })} tarihinden beri`
    : `Joined ${format(new Date(profile.created_at), 'MMMM yyyy', { locale })}`

  const storiesHeading = isMyProfile
    ? t.myStoriesHeading
    : lang === 'tr'
      ? `${profile.display_name || profile.username} — Hikayeleri`
      : `Stories by ${profile.display_name || profile.username}`

  const stats = [
    { label: t.stories_count, value: stories.length,  icon: BookOpen },
    { label: t.followers,     value: followerCount,    icon: Users },
    { label: t.following,     value: followingCount,   icon: Users },
    { label: t.reads,         value: totalReads,       icon: Eye },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Profile header card */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] overflow-hidden mb-8">
        {/* Banner */}
        <div className="h-32 md:h-44 relative"
          style={{ background: 'linear-gradient(135deg, #060d18 0%, #1a2f4a 60%, #0d1f33 100%)' }}>
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 40px)' }} />
          <div className="absolute right-8 top-4 opacity-10">
            <svg width="80" height="80" viewBox="0 0 32 32" fill="none">
              <path d="M16 5L10 17L16 14L22 17L16 5Z" fill="#e8a030"/>
              <path d="M16 14L16 25" stroke="#e8a030" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        <div className="px-6 pb-6">
          {/* Avatar + actions row */}
          <div className="flex items-end justify-between gap-4 -mt-12 md:-mt-16 mb-4">
            <div className="relative">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt=""
                  className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover border-4 border-[var(--card)] shadow-xl" />
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-[var(--card)] shadow-xl flex items-center justify-center text-3xl md:text-4xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                  {(profile.display_name || profile.username)[0].toUpperCase()}
                </div>
              )}
            </div>

            <ProfileActions
              profileId={profile.id}
              username={profile.username}
              isMyProfile={isMyProfile}
              isFollowing={isFollowing}
              hasUser={hasUser}
            />
          </div>

          {/* Name & bio */}
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-[var(--fg)]">
              {profile.display_name || profile.username}
            </h1>
            {profile.is_premium && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}
                title={lang === 'tr' ? 'Premium Üye' : 'Premium Member'}>
                ⭐ Premium
              </span>
            )}
          </div>
          <p className="text-[var(--fg-muted)] text-sm mt-0.5">@{profile.username}</p>

          {profile.bio && (
            <p className="text-[var(--fg)] mt-3 leading-relaxed max-w-xl">{profile.bio}</p>
          )}

          {profile.website && (
            <a href={profile.website} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline mt-2">
              <Globe style={{ width: 13, height: 13 }} />
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}

          {/* Stats */}
          <div className="flex flex-wrap gap-6 mt-5 pt-5 border-t border-[var(--border)]">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="text-center min-w-[56px]">
                <p className="font-display text-2xl font-bold text-[var(--fg)]">{fmt(value)}</p>
                <p className="text-xs text-[var(--fg-muted)] mt-0.5 flex items-center gap-1 justify-center">
                  <Icon style={{ width: 11, height: 11 }} />{label}
                </p>
              </div>
            ))}
            <div className="flex items-center gap-1 text-xs text-[var(--fg-muted)] ml-auto self-end pb-1">
              <Calendar style={{ width: 11, height: 11 }} />
              {joinedLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Stories section */}
      <h2 className="font-display text-2xl font-bold text-[var(--fg)] mb-5">
        {storiesHeading}
      </h2>

      {stories.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {stories.map((s: any) => <StoryCard key={s.id} story={s} lang={lang} />)}
        </div>
      ) : (
        <div className="text-center py-16 rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <p className="text-5xl mb-4">✍️</p>
          <p className="font-display text-xl text-[var(--fg)]">{t.noStoriesYet}</p>
          {isMyProfile && (
            <Link href="/write"
              className="inline-block mt-5 px-6 py-2.5 rounded-full text-sm font-medium text-white hover:scale-105 transition-all"
              style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
              {t.writeFirst}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
