import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ReadingModeToggle } from '@/components/hikaye/ReadingModeToggle'
import { ReadEngagementLogger } from '@/components/hikaye/ReadEngagementLogger'
import { ChevronLeft, ChevronRight, List } from 'lucide-react'

interface Props { params: { slug: string; chapterNo: string } }

export default async function ReadChapter({ params }: Props) {
  const supabase = await createClient()
  const chapterNo = parseInt(params.chapterNo)

  const { data: story } = await supabase
    .from('hikayeler')
    .select('id, baslik, slug, profiles(username, display_name)')
    .eq('slug', params.slug).single()

  if (!story) notFound()

  const { data: chapter } = await supabase
    .from('bolumler').select('*')
    .eq('hikaye_id', story.id)
    .eq('bolum_no', chapterNo).eq('yayinda', true).single()

  if (!chapter) notFound()

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
            <span className="font-display font-medium truncate">{story.baslik}</span>
          </Link>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs font-mono text-[var(--fg-muted)]">Ch. {chapterNo}</span>
            <ReadingModeToggle />
          </div>
        </div>
      </div>

      {/* Chapter content */}
      <article className="max-w-2xl mx-auto px-4 py-14" id="reading-area">
        {/* Chapter heading */}
        <div className="text-center mb-14">
          <p className="text-[var(--accent)] text-xs font-semibold tracking-widest uppercase mb-3 font-mono">
            Chapter {chapterNo}
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--fg)] leading-tight mb-6">
            {chapter.baslik}
          </h1>
          <div className="flex items-center justify-center gap-3 text-[var(--fg-muted)]">
            <div className="w-12 h-px bg-[var(--border)]" />
            <span className="text-lg opacity-50">✦</span>
            <div className="w-12 h-px bg-[var(--border)]" />
          </div>
        </div>

        {/* Story text */}
        <div
          className="story-content"
          dangerouslySetInnerHTML={{ __html: chapter.icerik }}
        />

        {/* Chapter end ornament */}
        <div className="text-center mt-20 mb-12">
          <div className="flex items-center justify-center gap-4 text-[var(--fg-muted)] opacity-30">
            <div className="w-20 h-px bg-current" />
            <span className="text-2xl">✦</span>
            <div className="w-20 h-px bg-current" />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4 pt-8 border-t border-[var(--border)]">
          {prev ? (
            <Link href={`/story/${story.slug}/chapter/${prev.bolum_no}`}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/50 text-sm font-medium text-[var(--fg)] transition-all flex-1 group">
              <ChevronLeft style={{width:16,height:16}} className="flex-shrink-0 group-hover:-translate-x-0.5 transition-transform" />
              <div className="min-w-0">
                <p className="text-xs text-[var(--fg-muted)] mb-0.5">Previous</p>
                <p className="truncate">{prev.baslik}</p>
              </div>
            </Link>
          ) : <div className="flex-1" />}

          <Link href={`/story/${story.slug}`}
            className="flex-shrink-0 p-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/50 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-all">
            <List style={{width:18,height:18}} />
          </Link>

          {next ? (
            <Link href={`/story/${story.slug}/chapter/${next.bolum_no}`}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-white transition-all hover:scale-[1.02] flex-1 justify-end group"
              style={{ background: 'linear-gradient(135deg, #d4840f, #e8a030)' }}>
              <div className="min-w-0 text-right">
                <p className="text-xs text-white/60 mb-0.5">Next</p>
                <p className="truncate">{next.baslik}</p>
              </div>
              <ChevronRight style={{width:16,height:16}} className="flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ) : (
            <Link href={`/story/${story.slug}`}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-white transition-all hover:scale-[1.02] flex-1 justify-end"
              style={{ background: 'linear-gradient(135deg, #2d9f6a, #3dbd82)' }}>
              <span>Back to Story</span>
              <ChevronRight style={{width:16,height:16}} className="flex-shrink-0" />
            </Link>
          )}
        </div>
      </article>
    </div>
  )
}
