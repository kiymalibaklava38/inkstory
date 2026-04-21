'use client'
import { useEffect } from 'react'

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const navbar     = document.querySelector('nav.sticky') as HTMLElement | null
    const footer     = document.querySelector('footer') as HTMLElement | null
    const bottomNav  = document.querySelector('nav.fixed') as HTMLElement | null
    const main       = document.querySelector('main') as HTMLElement | null

    if (navbar)    navbar.style.display    = 'none'
    if (footer)    footer.style.display    = 'none'
    if (bottomNav) bottomNav.style.display = 'none'
    if (main)      { main.style.padding = '0'; main.style.minHeight = '0' }

    return () => {
      document.body.style.overflow = ''
      if (navbar)    navbar.style.display    = ''
      if (footer)    footer.style.display    = ''
      if (bottomNav) bottomNav.style.display = ''
      if (main)      { main.style.padding = ''; main.style.minHeight = '' }
    }
  }, [])

  return <>{children}</>
}
