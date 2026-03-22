import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReadingModeToggle } from '@/components/hikaye/ReadingModeToggle'
import { ReadEngagementLogger } from '@/components/hikaye/ReadEngagementLogger'
import { PageTurnReader } from '@/components/hikaye/PageTurnReader'
import { ReadingProgressTracker } from '@/components/hikaye/ReadingProgressTracker'
import Link from 'next/link'
import { List } from 'lucide-react'

interface Props { params: { slug: string; chapterNo: string } }

export default async function ReadChapter({ params }: Props) {
  const supabase  = await createClient()
  const chapterNo = parseInt(params.chapterNo)

  const { data: story } = await supabase
    .from('hikayeler')
    .select('id, baslik, slug, profiles(username, display_name)')
    .eq('slug', params.slug).single()

  if (!story) notFound()

  const { data: chapter } = await supabase
    .from('bolumler').select('*')
    .eq('hikaye_id', story.id)
    .eq('bolum_no', chapterNo)
    .eq('yayinda', true).single()

  if (!chapter) notFound()

  // Total published chapters count
  const { count: totalChapters } = await supabase
    .from('bolumler')
    .select('*', { count: 'exact', head: true })
    .eq('hikaye_id', story.id)
    .eq('yayinda', true)

  const [{ data: prev }, { data: next }] = await Promise.all([
    supabase.from('bolumler').select('bolum_no,baslik')
      .eq('hikaye_id', story.id).eq('yayinda', true).eq('bolum_no', chapterNo - 1).single(),
    supabase.from('bolumler').select('bolum_no,baslik')
      .eq('hikaye_id', story.id).eq('yayinda', true).eq('bolum_no', chapterNo + 1).single(),
  ])

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <ReadEngagementLogger storyId={story.id} />

      {/* Reading bar */}
      <div className="sticky top-16 z-40 glass border-b border-[var(--border)] px-4 py-2.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <Link href={`/story/${story.slug}`}
            className="flex items-center gap-2 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors min-w-0">
            <List style={{width:15,height:15}} className="flex-shrink-0" />
            <span className="truncate">{story.baslik}</span>
          </Link>
          <div className="flex items-center gap-3 flex-shrink-0">
            <ReadingModeToggle />
          </div>
        </div>
      </div>

      {/* Progress tracker bar */}
      <ReadingProgressTracker
        storyId={story.id}
        storySlug={story.slug}
        storyTitle={story.baslik}
        chapterNo={chapterNo}
        totalChapters={totalChapters || 1}
      />

      {/* Content */}
      <article className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        <PageTurnReader
          storySlug={story.slug}
          chapterNo={chapterNo}
          chapterTitle={chapter.baslik}
          content={chapter.icerik}
          prevChapter={prev ?? null}
          nextChapter={next ?? null}
        />
      </article>
    </div>
  )
}
