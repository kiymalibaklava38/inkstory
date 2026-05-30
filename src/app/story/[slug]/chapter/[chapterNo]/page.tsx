import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReadEngagementLogger } from '@/components/hikaye/ReadEngagementLogger'
import { PageTurnReader } from '@/components/hikaye/PageTurnReader'
import { ReadingProgressTracker } from '@/components/hikaye/ReadingProgressTracker'

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
    <>
      <ReadEngagementLogger storyId={story.id} />
      <ReadingProgressTracker
        storyId={story.id}
        storySlug={story.slug}
        storyTitle={story.baslik}
        chapterNo={chapterNo}
        totalChapters={totalChapters || 1}
      />
      <PageTurnReader
        storyId={story.id}
        chapterId={chapter.id}
        storySlug={story.slug}
        chapterNo={chapterNo}
        chapterTitle={chapter.baslik}
        content={chapter.icerik}
        prevChapter={prev ?? null}
        nextChapter={next ?? null}
      />
    </>
  )
}
