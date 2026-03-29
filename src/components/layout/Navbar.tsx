'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from './ThemeProvider'
import { useLang } from '@/lib/i18n'
import { LangSwitcher } from '@/components/ui/LangSwitcher'
import { InkLogo } from '@/components/ui/InkLogo'
import { PenLine, Menu, X, BookMarked, LogOut, User, LayoutDashboard, Bell, Sun, Moon, Shield, Crown, Sparkles } from 'lucide-react'
import type { User as SupaUser } from '@supabase/supabase-js'

interface Profile { id: string; username: string; display_name: string | null; avatar_url: string | null; is_admin: boolean }

export function Navbar() {
  const [user, setUser] = useState<SupaUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [notifPulse, setNotifPulse] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { theme, toggle } = useTheme()
  const { t, lang } = useLang()
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user); if (user) loadProfile(user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else { setProfile(null); setNotifCount(0) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from('profiles').select('id,username,display_name,avatar_url,is_admin').eq('id', uid).single()
    setProfile(data)
    // Load unread notification count on login
    await loadUnreadCount(uid)
  }

  const loadUnreadCount = async (uid: string) => {
    // Get last time user visited notifications page from localStorage
    const lastSeen = localStorage.getItem(`notif_seen_${uid}`) || '1970-01-01'

    const [{ count: commentCount }, { count: likeCount }, { count: followCount }] = await Promise.all([
      supabase.from('yorumlar')
        .select('id', { count: 'exact', head: true })
        .neq('yazar_id', uid)
        .gt('created_at', lastSeen),
      supabase.from('begeniler')
        .select('id', { count: 'exact', head: true })
        .neq('kullanici_id', uid)
        .gt('created_at', lastSeen),
      supabase.from('takip')
        .select('id', { count: 'exact', head: true })
        .eq('takip_edilen_id', uid)
        .gt('created_at', lastSeen),
    ])

    // Filter comments/likes for own stories only (approximate — full filter in notifications page)
    const total = (commentCount || 0) + (likeCount || 0) + (followCount || 0)
    if (total > 0) {
      setNotifCount(total)
      setNotifPulse(true)
      setTimeout(() => setNotifPulse(false), 3000)
    }
  }

  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('navbar-notif')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'yorumlar' }, async (payload) => {
        // Skip own comments
        if (payload.new.yazar_id === user.id) return
        // Check if the story belongs to current user
        const { data: story } = await supabase
          .from('hikayeler').select('yazar_id').eq('id', payload.new.hikaye_id).single()
        if (story?.yazar_id !== user.id) return
        setNotifCount(n => n + 1)
        setNotifPulse(true)
        setTimeout(() => setNotifPulse(false), 2000)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'begeniler' }, async (payload) => {
        // Skip own likes
        if (payload.new.kullanici_id === user.id) return
        // Check if the story belongs to current user
        const { data: story } = await supabase
          .from('hikayeler').select('yazar_id').eq('id', payload.new.hikaye_id).single()
        if (story?.yazar_id !== user.id) return
        setNotifCount(n => n + 1)
        setNotifPulse(true)
        setTimeout(() => setNotifPulse(false), 2000)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const signOut = async () => { await supabase.auth.signOut(); setUser(null); setProfile(null); router.push('/'); router.refresh() }
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <nav className="sticky top-0 z-50 glass border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-3">
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            <InkLogo size={28} className="group-hover:scale-110 transition-transform duration-300" />
            <span className="logo-text logo-mark text-xl tracking-tight">InkStory</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {[
              {href:'/stories',    label:t.stories},
              {href:'/search',     label:t.discover},
              {href:'/sana-ozel',  label:lang==='tr'?'Sana Özel':'For You'},
            ].map(({href,label})=>(
              <Link key={href} href={href} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${isActive(href)?'bg-[var(--accent)]/10 text-[var(--accent)]':'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]'}`}>{label}</Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-1.5">
            <LangSwitcher />
            <button onClick={toggle} className="p-2 rounded-full text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-all" title={theme==='dark'?t.lightMode:t.darkMode}>
              {theme==='dark'?<Sun style={{width:17,height:17}}/>:<Moon style={{width:17,height:17}}/>}
            </button>
            {user ? (
              <>
                <Link href="/premium" className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-all">
              <Crown style={{width:10,height:10}}/> Premium ⭐
            </Link>
            <Link href="/write" className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white hover:scale-105 transition-all ml-1" style={{background:'linear-gradient(135deg,#d4840f,#e8a030)'}}>
                  <PenLine style={{width:14,height:14}}/>{t.write}
                </Link>
                <Link href="/notifications" onClick={()=>{ setNotifCount(0); if(user) localStorage.setItem(`notif_seen_${user.id}`, new Date().toISOString()) }} className="relative p-2 rounded-full text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-all">
                  <Bell style={{width:17,height:17}} className={notifPulse?'realtime-pulse':''}/>
                  {notifCount>0&&<span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[var(--accent)] rounded-full text-[10px] text-white font-bold flex items-center justify-center">{notifCount>9?'9+':notifCount}</span>}
                </Link>
                <div className="relative" ref={userMenuRef}>
                  <button onClick={()=>setUserMenuOpen(v=>!v)} className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-[var(--bg-subtle)] border border-transparent hover:border-[var(--border)] transition-all">
                    {profile?.avatar_url?<img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover ring-2 ring-[var(--accent)]/30"/>:<div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#d4840f,#e8a030)'}}>{(profile?.display_name||profile?.username||'?')[0].toUpperCase()}</div>}
                    <span className="text-sm font-medium text-[var(--fg)] max-w-[90px] truncate">{profile?.display_name||profile?.username}</span>
                  </button>
                  {userMenuOpen&&(
                    <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-xl overflow-hidden animate-fade-in">
                      <div className="px-4 py-3 border-b border-[var(--border)]">
                        <p className="font-medium text-[var(--fg)] text-sm truncate">{profile?.display_name||profile?.username}</p>
                        <p className="text-xs text-[var(--fg-muted)] mt-0.5">@{profile?.username}</p>
                      </div>
                      {[
                        {href:`/profile/${profile?.username}`,icon:User,label:t.myProfile},
                        {href:'/dashboard',icon:LayoutDashboard,label:t.writerDashboard},
                        {href:'/library',icon:BookMarked,label:t.myLibrary},
                        {href:'/notifications',icon:Bell,label:t.notifications},
                        ...(profile?.is_admin?[{href:'/admin',icon:Shield,label:t.adminPanel}]:[]),
                      ].map(({href,icon:Icon,label})=>(
                        <Link key={href} href={href} onClick={()=>setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-colors">
                          <Icon style={{width:14,height:14}} className="text-[var(--fg-muted)]"/>{label}
                        </Link>
                      ))}
                      <Link href="/verify" onClick={()=>setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--accent)] font-medium hover:bg-[var(--bg-subtle)] transition-colors">
                        <span className="text-sm">✅</span>{lang==='tr'?'Doğrulanmış Yazar Ol':'Get Verified'}
                      </Link>
                      <hr className="border-[var(--border)]"/>
                      <button onClick={signOut} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                        <LogOut style={{width:14,height:14}}/>{t.signOut}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ):(
              <>
                <Link href="/login" className="text-sm font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors px-3 py-2">{t.signIn}</Link>
                <Link href="/register" className="px-4 py-2 rounded-full text-sm font-medium text-white hover:scale-105 transition-all" style={{background:'linear-gradient(135deg,#d4840f,#e8a030)'}}>{t.getStarted}</Link>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            <LangSwitcher/>
            <button className="p-2 text-[var(--fg-muted)]" onClick={()=>setMobileOpen(v=>!v)}>
              {mobileOpen?<X style={{width:20,height:20}}/>:<Menu style={{width:20,height:20}}/>}
            </button>
          </div>
        </div>

        {mobileOpen&&(
          <div className="md:hidden py-4 border-t border-[var(--border)] animate-fade-in">
            <div className="flex flex-col gap-1">
              <Link href="/stories"   onClick={()=>setMobileOpen(false)} className="px-3 py-2.5 text-sm text-[var(--fg)] hover:bg-[var(--bg-subtle)] rounded-xl">{t.stories}</Link>
              <Link href="/search"    onClick={()=>setMobileOpen(false)} className="px-3 py-2.5 text-sm text-[var(--fg)] hover:bg-[var(--bg-subtle)] rounded-xl">{t.discover}</Link>
              <Link href="/sana-ozel" onClick={()=>setMobileOpen(false)} className={`px-3 py-2.5 text-sm hover:bg-[var(--bg-subtle)] rounded-xl font-medium ${pathname.startsWith('/sana-ozel')?'text-[var(--accent)]':'text-[var(--fg)]'}`}>{lang==='tr'?'Sana Özel':'For You'}</Link>
              {user?(
                <>
                  <Link href="/write"         onClick={()=>setMobileOpen(false)} className="px-3 py-2.5 text-sm font-medium text-[var(--accent)] hover:bg-[var(--bg-subtle)] rounded-xl">✍ {t.write}</Link>
                  <Link href="/verify" onClick={()=>setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--accent)] font-medium hover:bg-[var(--bg-subtle)] rounded-xl">
                    <span>✅</span>{lang==='tr'?'Doğrulanmış Yazar Ol':'Get Verified'}
                  </Link>
                  <Link href="/dashboard"     onClick={()=>setMobileOpen(false)} className="px-3 py-2.5 text-sm text-[var(--fg)] hover:bg-[var(--bg-subtle)] rounded-xl">{t.writerDashboard}</Link>
                  <Link href="/library"       onClick={()=>setMobileOpen(false)} className="px-3 py-2.5 text-sm text-[var(--fg)] hover:bg-[var(--bg-subtle)] rounded-xl">{t.myLibrary}</Link>
                  <Link href="/notifications" onClick={()=>setMobileOpen(false)} className="px-3 py-2.5 text-sm text-[var(--fg)] hover:bg-[var(--bg-subtle)] rounded-xl">{t.notifications} {notifCount>0&&`(${notifCount})`}</Link>
                  <Link href={`/profile/${profile?.username}`} onClick={()=>setMobileOpen(false)} className="px-3 py-2.5 text-sm text-[var(--fg)] hover:bg-[var(--bg-subtle)] rounded-xl">{t.myProfile}</Link>
                  {profile?.is_admin&&<Link href="/admin" onClick={()=>setMobileOpen(false)} className="px-3 py-2.5 text-sm text-[var(--accent)] hover:bg-[var(--bg-subtle)] rounded-xl">⚡ {t.adminPanel}</Link>}
                  <button onClick={signOut} className="px-3 py-2.5 text-sm text-red-400 text-left hover:bg-red-500/10 rounded-xl">{t.signOut}</button>
                </>
              ):(
                <>
                  <Link href="/login"    onClick={()=>setMobileOpen(false)} className="px-3 py-2.5 text-sm text-[var(--fg)] hover:bg-[var(--bg-subtle)] rounded-xl">{t.signIn}</Link>
                  <Link href="/register" onClick={()=>setMobileOpen(false)} className="px-3 py-2.5 text-sm font-medium text-[var(--accent)] hover:bg-[var(--bg-subtle)] rounded-xl">{t.getStarted}</Link>
                </>
              )}
              <button onClick={toggle} className="px-3 py-2.5 text-sm text-[var(--fg-muted)] text-left hover:bg-[var(--bg-subtle)] rounded-xl">
                {theme==='dark'?`☀️ ${t.lightMode}`:`🌙 ${t.darkMode}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
