import Link from 'next/link'
import { Eye, BookOpen } from 'lucide-react'
import { VerifiedBadge } from '@/components/ui/VerifiedBadge'
import type { Lang } from '@/lib/i18n'
import { getCategoryName } from '@/lib/categories'

interface Story {
  id: string; baslik: string; slug: string; aciklama?: string
  kapak_url?: string; goruntuleme: number; durum: string
  is_featured?: boolean
  profiles: { username: string; display_name?: string; avatar_url?: string; is_premium?: boolean; is_verified?: boolean; verification_badge?: string }
  kategoriler?: { ad: string; ikon: string; renk: string; slug: string }
}

interface Props {
  story: Story
  featured?: boolean
  lang?: Lang
}

export function StoryCard({ story, featured = false, lang = 'en' }: Props) {
  const cat = story.kategoriler
  const catName = cat ? getCategoryName(cat.slug, lang) : null

  return (
    <Link href={`/story/${story.slug}`} className={`story-card block group ${featured ? 'md:col-span-2' : ''}`}>
      <article className="h-full rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--card)] transition-colors hover:border-[var(--accent)]/40">

        {/* Cover */}
        <div className={`relative overflow-hidden ${featured ? 'h-52' : 'h-44'} bg-[var(--bg-subtle)]`}>
          {story.kapak_url ? (
            <img src={story.kapak_url} alt={story.baslik}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center relative"
              style={{ background: `linear-gradient(135deg, ${cat?.renk || '#d4840f'}18, ${cat?.renk || '#d4840f'}35)` }}>
              <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)' }} />
              <BookOpen style={{ width: 36, height: 36, color: cat?.renk || '#d4840f', opacity: 0.25 }} />
            </div>
          )}

          {/* Category badge - top left */}
          {cat && catName && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-xs font-medium backdrop-blur-md"
              style={{ backgroundColor: `${cat.renk}cc` }}>
              <span>{cat.ikon}</span>{catName}
            </div>
          )}

          {/* Featured badge - top right */}
          {story.is_featured && (
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-white text-xs font-bold backdrop-blur-sm flex items-center gap-1"
              style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
              ⭐ {lang === 'tr' ? 'Öne Çıkan' : 'Featured'}
            </div>
          )}

          {/* Status badge — bottom right, doesn't overlap anything */}
          {!story.is_featured && story.durum === 'tamamlandi' && (
            <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-xs font-medium backdrop-blur-sm">
              {lang === 'tr' ? '✓ Tamamlandı' : '✓ Complete'}
            </div>
          )}

          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[var(--card)] to-transparent" />
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-display font-semibold text-[var(--fg)] text-base leading-tight mb-1.5 line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
            {story.baslik}
          </h3>

          {story.aciklama && (
            <p className="text-[var(--fg-muted)] text-xs leading-relaxed line-clamp-2 mb-3">
              {story.aciklama}
            </p>
          )}

          {/* Author + stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {story.profiles?.avatar_url ? (
                <img src={story.profiles.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                  {(story.profiles?.display_name || story.profiles?.username || '?')[0].toUpperCase()}
                </div>
              )}
              <span className="text-xs text-[var(--fg-muted)] truncate max-w-[80px]">
                {story.profiles?.display_name || story.profiles?.username}
              </span>
              {story.profiles?.is_premium && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                  ⭐
                </span>
              )}
              {story.profiles?.is_verified && (
                <VerifiedBadge size={12} badge={story.profiles.verification_badge || 'author'} />
              )}
            </div>

            <div className="flex items-center gap-1 text-[var(--fg-muted)]">
              <Eye style={{ width: 12, height: 12 }} />
              <span className="text-xs">
                {story.goruntuleme >= 1000
                  ? `${(story.goruntuleme / 1000).toFixed(1)}K`
                  : story.goruntuleme}
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
