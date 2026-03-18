import Link from 'next/link'
import { InkLogo } from '@/components/ui/InkLogo'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="flex justify-center mb-6 opacity-20 animate-nib-float">
          <InkLogo size={80} />
        </div>
        <p className="font-display text-8xl font-bold text-[var(--border)]">404</p>
        <h1 className="font-display text-2xl font-bold text-[var(--fg)] mt-3 mb-2">Page not found</h1>
        <p className="text-[var(--fg-muted)] mb-8">The story or page you're looking for doesn't exist.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/"
            className="px-6 py-2.5 rounded-full text-sm font-medium text-white hover:scale-105 transition-all"
            style={{ background: 'linear-gradient(135deg,#d4840f,#e8a030)' }}>
            Back to Home
          </Link>
          <Link href="/stories"
            className="px-6 py-2.5 rounded-full text-sm font-medium border border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent)]/50 hover:text-[var(--fg)] transition-all">
            Browse Stories
          </Link>
        </div>
      </div>
    </div>
  )
}
