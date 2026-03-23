import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { LangProvider } from '@/lib/i18n'
import { AnnouncementModal } from '@/components/ui/AnnouncementModal'
import { OnboardingGate } from '@/components/personalization/OnboardingGate'
import { DynamicTitle } from '@/components/layout/DynamicTitle'

export const metadata: Metadata = {
  title: { default: 'InkStory – Write Your World', template: '%s | InkStory' },
  description: 'The global story writing and reading platform. Write, read, and share stories with AI-powered tools.',
  keywords: ['story', 'writing', 'fiction', 'novel', 'inkstory', 'AI writing', 'hikaye', 'roman'],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'InkStory',
    description: 'Write your world. Share your story.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <LangProvider>
            <DynamicTitle />
            <Navbar />
            <main className="min-h-screen">{children}</main>
            <Footer />
            <AnnouncementModal />
            <OnboardingGate>{null}</OnboardingGate>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
