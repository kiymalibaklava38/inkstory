'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StoryCard } from '@/components/hikaye/StoryCard'
import { ProfileActions } from '@/components/profil/ProfileActions'
import { BookOpen, Users, Eye, Calendar, Globe, Twitter, Instagram, TrendingUp, Award, BookMarked, List } from 'lucide-react'
import { VerifiedBadge } from '@/components/ui/VerifiedBadge'
import { format } from 'date-fns'
import { tr as dateFnsTr, enUS } from 'date-fns/locale'
import { useLang } from '@/lib/i18n'

interface Props {
  profile:        any
  stories:        any[]
  series:         any[]
  followerCount:  number
  followingCount: number
  totalReads:     number
  totalWords:     number
  isMyProfile:    boolean
  isFollowing:    boolean
  hasUser:        boolean
}

export function ProfileClient({
  profile, stories, series, followerCount, followingCount,
  totalReads, totalWords, isMyProfile, isFollowing, hasUser,
}: Props) {
  const { t, lang } = useLang()
  const locale = lang === 'tr' ? dateFnsTr : enUS
  const [activeTab, setActiveTab] = useState<'stories' | 'series'>('stories')

  const fmt = (n: number) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n)

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

  // En popüler hikaye
  const topStory = stories.length > 0
    ? [...stories].sort((a, b) => (b.goruntuleme || 0) - (a.goruntuleme || 0))[0]
    : null

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Profile header card */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] overflow-hidden mb-8">
        {/* Banner */}
        <div className="h-32 md:h-48 relative overflow-hidden"
          style={profile.banner_url ? {} : { background: 'linear-gradient(135deg, #060d18 0%, #1a2f4a 60%, #0d1f33 100%)' }}>
          {profile.banner_url ? (
            <img src={profile.banner_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <>
              <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 40px)' }} />
              <div className="absolute right-8 top-4 opacity-10">
                <svg width="80" height="80" viewBox="0 0 32 32" fill="none">
                  <path d="M16 5L10 17L16 14L22 17L16 5Z" fill="#e8a030"/>
                  <path d="M16 14L16 25" stroke="#e8a030" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            </>
          )}
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[var(--card)] to-transparent" />
        </div>

        <div className="px-6 pb-6">
          {/* Avatar + actions */}
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

          {/* İsim & rozet */}
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-[var(--fg)]">
              {profile.display_name || profile.username}
            </h1>
            {profile.is_premium && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                ⭐ Premium
              </span>
            )}
            {profile.is_verified && (
              <VerifiedBadge size={22} badge={profile.verification_badge || 'author'} />
            )}
          </div>
          <p className="text-[var(--fg-muted)] text-sm mt-0.5">@{profile.username}</p>

          {profile.bio && (
            <p className="text-[var(--fg)] mt-3 leading-relaxed max-w-xl text-sm">{profile.bio}</p>
          )}

          {/* Linkler */}
          <div className="flex flex-wrap gap-3 mt-3">
            {profile.website && (
              <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline">
                <Globe style={{ width: 13, height: 13 }} />
                {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            )}
            {profile.twitter_url && (
              <a href={profile.twitter_url.startsWith('http') ? profile.twitter_url : `https://x.com/${profile.twitter_url}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--fg-muted)] hover:text-[#1DA1F2] transition-colors">
                <Twitter style={{ width: 13, height: 13 }} />
                {profile.twitter_url.replace(/^https?:\/\/(x\.com|twitter\.com)\//, '@')}
              </a>
            )}
            {profile.instagram_url && (
              <a href={profile.instagram_url.startsWith('http') ? profile.instagram_url : `https://instagram.com/${profile.instagram_url}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--fg-muted)] hover:text-[#E1306C] transition-colors">
                <Instagram style={{ width: 13, height: 13 }} />
                {profile.instagram_url.replace(/^https?:\/\/instagram\.com\//, '@')}
              </a>
            )}
          </div>

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
            {totalWords > 0 && (
              <div className="text-center min-w-[56px]">
                <p className="font-display text-2xl font-bold text-[var(--fg)]">{fmt(totalWords)}</p>
                <p className="text-xs text-[var(--fg-muted)] mt-0.5 flex items-center gap-1 justify-center">
                  <BookMarked style={{ width: 11, height: 11 }} />{lang === 'tr' ? 'Kelime' : 'Words'}
                </p>
              </div>
            )}
            <div className="flex items-center gap-1 text-xs text-[var(--fg-muted)] ml-auto self-end pb-1">
              <Calendar style={{ width: 11, height: 11 }} />
              {joinedLabel}
            </div>
          </div>
        </div>
      </div>

      {/* En popüler hikaye rozeti */}
      {topStory && topStory.goruntuleme > 100 && (
        <div className="bg-[var(--card)] rounded-2xl border border-amber-500/20 p-4 mb-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
            <Award style={{ width: 20, height: 20 }} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-amber-400">{lang === 'tr' ? 'En Çok Okunan Hikaye' : 'Most Read Story'}</p>
            <Link href={`/story/${topStory.slug}`} className="text-sm font-semibold text-[var(--fg)] hover:text-[var(--accent)] transition-colors truncate block">
              {topStory.baslik}
            </Link>
          </div>
          <div className="flex items-center gap-1 text-sm font-bold text-[var(--accent)] flex-shrink-0">
            <TrendingUp style={{ width: 14, height: 14 }} />
            {fmt(topStory.goruntuleme)}
          </div>
        </div>
      )}

      {/* Tab navigation */}
      {series.length > 0 && (
        <div className="flex gap-1 p-1 bg-[var(--bg-subtle)] rounded-2xl mb-5 w-fit">
          <button onClick={() => setActiveTab('stories')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'stories' ? 'bg-[var(--card)] text-[var(--fg)] shadow-sm' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}>
            <BookOpen style={{ width: 13, height: 13 }} />
            {lang === 'tr' ? 'Hikayeler' : 'Stories'} ({stories.length})
          </button>
          <button onClick={() => setActiveTab('series')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'series' ? 'bg-[var(--card)] text-[var(--fg)] shadow-sm' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}>
            <List style={{ width: 13, height: 13 }} />
            {lang === 'tr' ? 'Seriler' : 'Series'} ({series.length})
          </button>
        </div>
      )}

      {/* Hikayeler */}
      {activeTab === 'stories' && (
        <>
          <h2 className="font-display text-2xl font-bold text-[var(--fg)] mb-5">{storiesHeading}</h2>
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
        </>
      )}

      {/* Seriler */}
      {activeTab === 'series' && series.length > 0 && (
        <div className="space-y-5">
          <h2 className="font-display text-2xl font-bold text-[var(--fg)] mb-5">
            {lang === 'tr' ? 'Hikaye Serileri' : 'Story Series'}
          </h2>
          {series.map((serie: any) => {
            const serieStories = (serie.seri_hikayeleri || [])
              .sort((a: any, b: any) => a.sira - b.sira)
              .map((sh: any) => sh.hikayeler)
              .filter(Boolean)
            return (
              <div key={serie.id} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
                <div className="p-5 border-b border-[var(--border)]">
                  <h3 className="font-display text-lg font-bold text-[var(--fg)]">{serie.baslik}</h3>
                  {serie.aciklama && <p className="text-sm text-[var(--fg-muted)] mt-1">{serie.aciklama}</p>}
                  <p className="text-xs text-[var(--accent)] mt-1">{serieStories.length} {lang === 'tr' ? 'hikaye' : 'stories'}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-5">
                  {serieStories.map((s: any, i: number) => (
                    <Link key={s.id} href={`/story/${s.slug}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--border)]/40 transition-colors group">
                      {s.kapak_url ? (
                        <img src={s.kapak_url} alt="" className="w-10 h-14 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-14 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                          style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                          {i + 1}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[var(--fg-muted)]">{lang === 'tr' ? `Kitap ${i + 1}` : `Book ${i + 1}`}</p>
                        <p className="text-sm font-semibold text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors truncate">{s.baslik}</p>
                        <div className="flex items-center gap-1 text-[10px] text-[var(--fg-muted)] mt-0.5">
                          <Eye style={{ width: 9, height: 9 }} />{fmt(s.goruntuleme || 0)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
