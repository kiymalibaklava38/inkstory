'use client'
import { useEffect } from 'react'

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Navbar ve Footer'ı gizle — mesaj sayfası tam ekran
    document.body.style.overflow = 'hidden'
    const navbar  = document.querySelector('nav')
    const footer  = document.querySelector('footer')
    const main    = document.querySelector('main')
    if (navbar) navbar.style.display = 'none'
    if (footer) footer.style.display = 'none'
    if (main)   { main.style.padding = '0'; main.style.minHeight = '0' }

    return () => {
      document.body.style.overflow = ''
      if (navbar) navbar.style.display = ''
      if (footer) footer.style.display = ''
      if (main)   { main.style.padding = ''; main.style.minHeight = '' }
    }
  }, [])

  return <>{children}</>
}
