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
  title: { default: 'InkStory – Hikayeni Yaz, Dünyayla Paylaş', template: '%s | InkStory' },
  description: 'Türkiye\'nin hikaye yazma ve okuma platformu. Yaz, oku ve AI destekli araçlarla hikayelerini paylaş.',
  keywords: ['hikaye', 'roman', 'yazarlık', 'okuma', 'inkstory', 'AI yazma', 'story', 'fiction'],
  metadataBase: new URL('https://inkstory.com.tr'),
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'InkStory – Hikayeni Yaz, Dünyayla Paylaş',
    description: 'Türkiye\'nin hikaye yazma ve okuma platformu. AI destekli araçlarla yaz, oku, keşfet.',
    type: 'website',
    url: 'https://inkstory.com.tr',
    siteName: 'InkStory',
    images: [{
      url: '/og-default.png',
      width: 1200,
      height: 630,
      alt: 'InkStory',
    }],
    locale: 'tr_TR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'InkStory – Hikayeni Yaz',
    description: 'Türkiye\'nin hikaye yazma ve okuma platformu.',
    images: ['/og-default.png'],
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
