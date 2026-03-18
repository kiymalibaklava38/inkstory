'use client'

import Link from 'next/link'
import { LikeButton } from '@/components/hikaye/LikeButton'
import { LibraryButton } from '@/components/hikaye/LibraryButton'
import { FollowButton } from '@/components/profil/FollowButton'
import { CommentsSection } from '@/components/hikaye/CommentsSection'
import { Eye, BookOpen, Clock, Calendar, Tag, ChevronRight } from 'lucide-react'
import { useLang } from '@/lib/i18n'
import { format } from 'date-fns'
import { tr as dateFnsTr, enUS } from 'date-fns/locale'

const CATEGORY_NAMES: Record<string, Record<string, string>> = {
  romantik:      { en: 'Romance',    tr: 'Romantik' },
  fantastik:     { en: 'Fantasy',    tr: 'Fantastik' },
  korku:         { en: 'Horror',     tr: 'Korku' },
  gizem:         { en: 'Mystery',    tr: 'Gizem' },
  'bilim-kurgu': { en: 'Sci-Fi',     tr: 'Bilim Kurgu' },
  macera:        { en: 'Adventure',  tr: 'Macera' },
  siir:          { en: 'Poetry',     tr: 'Şiir' },
  tarihi:        { en: 'Historical', tr: 'Tarihi' },
}

interface Props {
  story: any
  chapters: any[]
  likeCount: number
  userLiked: boolean
  userSaved: boolean
  userFollows: boolean
  userId: string | null
}

export function StoryDetailClient({
  story, chapters, likeCount, userLiked, userSaved, userFollows, userId,
}: Props) {
  const { t, lang } = useLang()
  const locale = lang === 'tr' ? dateFnsTr : enUS
  const cat = story.kategoriler

  const catName = cat
    ? (CATEGORY_NAMES[cat.slug]?.[lang] ?? cat.ad)
    : null

  const totalWords = chapters.reduce((a: number, c: any) => a + (c.kelime_sayisi || 0), 0)
  const readMins   = Math.ceil(totalWords / 200)

  const statusLabel = story.durum === 'tamamlandi'
    ? (lang === 'tr' ? '✓ Tamamlandı' : '✓ Complete')
    : (lang === 'tr' ? '📝 Devam Ediyor' : '📝 Ongoing')

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* Left: cover + actions */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            {/* Cover */}
            <div className="aspect-[2/3] rounded-2xl overflow-hidden border border-[var(--border)] shadow-lg mb-5">
              {story.kapak_url ? (
                <img src={story.kapak_url} alt={story.baslik} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center relative"
                  style={{ background: `linear-gradient(135deg, ${cat?.renk || '#d4840f'}20, ${cat?.renk || '#d4840f'}45)` }}>
                  <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'repeating-linear-gradient(45deg,transparent,transparent 20px,rgba(255,255,255,0.05) 20px,rgba(255,255,255,0.05) 40px)' }} />
                  <BookOpen style={{ width: 48, height: 48, color: cat?.renk || '#d4840f', opacity: 0.3 }} />
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mb-5">
              <LikeButton storyId={story.id} initialCount={likeCount} initialLiked={userLiked} hasUser={!!userId} />
              <LibraryButton storyId={story.id} initialSaved={userSaved} hasUser={!!userId} />
            </div>

            {/* Meta */}
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2 text-[var(--fg-muted)]">
                <Eye style={{ width: 14, height: 14 }} />
                <span>{story.goruntuleme.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')} {t.reads}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--fg-muted)]">
                <BookOpen style={{ width: 14, height: 14 }} />
                <span>{chapters.length} {t.chapters} · ~{readMins} {t.minRead}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--fg-muted)]">
                <Calendar style={{ width: 14, height: 14 }} />
                <span>{format(new Date(story.created_at), lang === 'tr' ? 'd MMMM yyyy' : 'MMMM d, yyyy', { locale })}</span>
              </div>

              {cat && catName && (
                <Link href={`/stories?category=${cat.slug}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-medium"
                  style={{ backgroundColor: cat.renk }}>
                  {cat.ikon} {catName}
                </Link>
              )}

              {story.etiketler?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {story.etiketler.map((tag: string) => (
                    <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-[var(--border)] text-[var(--fg-muted)] text-xs">
                      <Tag style={{ width: 10, height: 10 }} />{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: content */}
        <div className="lg:col-span-2">
          {/* Status badge */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4 ${
            story.durum === 'tamamlandi'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            {statusLabel}
          </div>

          <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--fg)] leading-tight mb-6">
            {story.baslik}
          </h1>

          {/* Author */}
          <div className="flex items-center justify-between gap-4 mb-6 pb-6 border-b border-[var(--border)]">
            <Link href={`/profile/${story.profiles.username}`} className="flex items-center gap-3 group">
              {story.profiles.avatar_url ? (
                <img src={story.profiles.avatar_url} alt=""
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-[var(--border)] group-hover:ring-[var(--accent)]/50 transition-all" />
              ) : (
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white ring-2 ring-[var(--border)]"
                  style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                  {(story.profiles.display_name || story.profiles.username)[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-medium text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors">
                  {story.profiles.display_name || story.profiles.username}
                </p>
                <p className="text-sm text-[var(--fg-muted)]">@{story.profiles.username}</p>
              </div>
            </Link>

            {userId !== story.profiles.id && (
              <FollowButton profileId={story.profiles.id} initialFollowing={userFollows} hasUser={!!userId} />
            )}
          </div>

          {/* Blurb */}
          {story.aciklama && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)] p-6 mb-8">
              <p className="font-reading text-[var(--fg)] leading-relaxed italic text-lg">
                "{story.aciklama}"
              </p>
            </div>
          )}

          {/* Chapters */}
          <div className="mb-10">
            <h2 className="font-display text-2xl font-bold text-[var(--fg)] mb-4">
              {t.chapters === 'chapters' ? 'Chapters' : 'Bölümler'}
            </h2>

            {chapters.length > 0 ? (
              <>
                <div className="space-y-2 mb-5">
                  {chapters.map((ch: any) => (
                    <Link key={ch.id}
                      href={`/story/${story.slug}/chapter/${ch.bolum_no}`}
                      className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--bg-subtle)] transition-all group">
                      <span className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-center text-xs font-mono font-bold text-[var(--fg-muted)] flex-shrink-0 group-hover:border-[var(--accent)]/50 group-hover:text-[var(--accent)] transition-all">
                        {ch.bolum_no}
                      </span>
                      <span className="flex-1 font-medium text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors truncate">
                        {ch.baslik}
                      </span>
                      {ch.kelime_sayisi > 0 && (
                        <span className="flex items-center gap-1 text-xs text-[var(--fg-muted)] flex-shrink-0">
                          <Clock style={{ width: 11, height: 11 }} />
                          ~{Math.ceil(ch.kelime_sayisi / 200)}{lang === 'tr' ? 'dk' : 'm'}
                        </span>
                      )}
                      <ChevronRight style={{ width: 15, height: 15 }} className="text-[var(--fg-muted)] opacity-0 group-hover:opacity-100 flex-shrink-0 transition-all" />
                    </Link>
                  ))}
                </div>

                <Link href={`/story/${story.slug}/chapter/1`}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                  <BookOpen style={{ width: 18, height: 18 }} />
                  {t.startReading}
                </Link>
              </>
            ) : (
              <p className="text-[var(--fg-muted)] text-sm">{t.noChapters}</p>
            )}
          </div>

          {/* Comments */}
          <CommentsSection storyId={story.id} userId={userId} />
        </div>
      </div>
    </div>
  )
}
