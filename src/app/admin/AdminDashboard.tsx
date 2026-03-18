'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users, BookOpen, Eye, Shield, Trash2, Globe, Lock, CheckCircle,
  Flag, Search, BarChart3, AlertTriangle, UserX, Sparkles,
  Star, Unlock, TrendingUp, MessageCircle, RefreshCw, Ban,
  Loader2, Info, Megaphone, Plus, ToggleLeft, ToggleRight, Pencil, Mail, Download
} from 'lucide-react'
import { format } from 'date-fns'
import { tr as dateFnsTr, enUS } from 'date-fns/locale'
import { InkLogo } from '@/components/ui/InkLogo'
import { useLang } from '@/lib/i18n'

type Tab = 'overview' | 'users' | 'stories' | 'comments' | 'reports' | 'ai' | 'announcements' | 'waitlist'

interface Stats {
  userCount: number; storyCount: number
  reportCount: number; bannedCount: number; totalReads: number
}

interface Props { stats: Stats; recentUsers: any[] }

function ConfirmModal({ title, desc, onConfirm, onCancel }: {
  title: string; desc: string; onConfirm: () => void; onCancel: () => void
}) {
  const { t } = useLang()
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 max-w-sm w-full shadow-2xl animate-fade-in">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/15">
            <AlertTriangle style={{ width: 18, height: 18 }} className="text-red-400" />
          </div>
          <h3 className="font-display text-lg font-bold text-[var(--fg)]">{title}</h3>
        </div>
        <p className="text-[var(--fg-muted)] text-sm mb-6">{desc}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--fg-muted)] hover:border-[var(--fg-muted)] transition-all">{t.confirmCancelLabel}</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-all">{t.confirmActionLabel}</button>
        </div>
      </div>
    </div>
  )
}

function ReasonBadge({ reason }: { reason: string }) {
  const map: Record<string, string> = {
    spam: 'bg-yellow-500/15 text-yellow-400', harassment: 'bg-red-500/15 text-red-400',
    hate_speech: 'bg-red-500/15 text-red-400', sexual_content: 'bg-pink-500/15 text-pink-400',
    violence: 'bg-orange-500/15 text-orange-400', copyright: 'bg-blue-500/15 text-blue-400',
    misinformation: 'bg-purple-500/15 text-purple-400', other: 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]',
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${map[reason] || map.other}`}>{reason.replace('_', ' ')}</span>
}

export function AdminDashboard({ stats, recentUsers }: Props) {
  const { t, lang } = useLang()
  const locale = lang === 'tr' ? dateFnsTr : enUS
  const [tab, setTab] = useState<Tab>('overview')
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState<{ title: string; desc: string; onConfirm: () => void } | null>(null)
  const [loading, setLoading] = useState(false)

  const [users,    setUsers]    = useState<any[]>([])
  const [stories,  setStories]  = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [reports,  setReports]  = useState<any[]>([])
  const [aiData,   setAiData]   = useState<{ summaries: any[]; daily: any[]; totalCalls: number } | null>(null)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [waitlist, setWaitlist]             = useState<any[]>([])
  const [waitlistTotal, setWaitlistTotal]   = useState(0)
  const [annForm, setAnnForm] = useState<{id?:string;title:string;message:string;active:boolean}|null>(null)
  const [annSaving, setAnnSaving] = useState(false)

  const [reportFilter,  setReportFilter]  = useState('pending')
  const [userFilter,    setUserFilter]    = useState('all')
  const [storyFilter,   setStoryFilter]   = useState('all')
  const [commentFilter, setCommentFilter] = useState('all')

  const fmt = (n: number) => n >= 1_000_000 ? `${(n/1e6).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n)

  const fetchUsers    = useCallback(async () => { setLoading(true); const r = await fetch(`/api/admin/users?filter=${userFilter}&search=${encodeURIComponent(search)}`); const d = await r.json(); setUsers(d.users||[]); setLoading(false) }, [userFilter, search])
  const fetchStories  = useCallback(async () => { setLoading(true); const r = await fetch(`/api/admin/stories?filter=${storyFilter}&search=${encodeURIComponent(search)}`); const d = await r.json(); setStories(d.stories||[]); setLoading(false) }, [storyFilter, search])
  const fetchComments = useCallback(async () => { setLoading(true); const r = await fetch(`/api/admin/comments?flagged=${commentFilter==='flagged'}`); const d = await r.json(); setComments(d.comments||[]); setLoading(false) }, [commentFilter])
  const fetchReports  = useCallback(async () => { setLoading(true); const r = await fetch(`/api/admin/reports?status=${reportFilter}`); const d = await r.json(); setReports(d.reports||[]); setLoading(false) }, [reportFilter])
  const fetchAI       = useCallback(async () => { setLoading(true); const r = await fetch('/api/admin/ai-logs?days=7'); const d = await r.json(); setAiData(d); setLoading(false) }, [])
  const fetchAnn = useCallback(async () => { setLoading(true); const r = await fetch('/api/admin/announcements'); const d = await r.json(); setAnnouncements(d.announcements||[]); setLoading(false) }, [])
  const fetchWaitlist = useCallback(async () => { setLoading(true); const r = await fetch('/api/admin/waitlist'); const d = await r.json(); setWaitlist(d.emails||[]); setWaitlistTotal(d.total||0); setLoading(false) }, [])

  useEffect(() => {
    if (tab==='users')    fetchUsers()
    if (tab==='stories')  fetchStories()
    if (tab==='comments') fetchComments()
    if (tab==='reports')  fetchReports()
    if (tab==='ai')       fetchAI()
    if (tab==='announcements') fetchAnn()
    if (tab==='waitlist') fetchWaitlist()
  }, [tab, userFilter, storyFilter, commentFilter, reportFilter])

  const doUserAction    = async (userId: string, action: string, reason?: string) => { await fetch('/api/admin/users',    { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId,action,reason}) }); fetchUsers(); setConfirm(null) }
  const doStoryAction   = async (storyId: string, action: string)                  => { await fetch('/api/admin/stories',  { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({storyId,action}) }); fetchStories(); setConfirm(null) }
  const doCommentAction = async (commentId: string, action: string)                => { await fetch('/api/admin/comments', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({commentId,action}) }); fetchComments() }
  const doReportAction  = async (reportId: string, action: string, note?: string, ban?: string) => { await fetch('/api/admin/reports', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({reportId,action,adminNote:note,banReason:ban}) }); fetchReports(); setConfirm(null) }

  const tabs: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id:'overview', label:t.adminOverview,  icon:BarChart3 },
    { id:'users',    label:t.adminUsers,     icon:Users },
    { id:'stories',  label:t.adminStories,   icon:BookOpen },
    { id:'comments', label:t.adminComments,  icon:MessageCircle },
    { id:'reports',  label:t.adminReports,   icon:Flag,    badge:stats.reportCount },
    { id:'ai',       label:t.adminAiUsage,   icon:Sparkles },
    { id:'announcements', label:t.adminAnnouncements, icon:Megaphone },
    { id:'waitlist', label:lang==='tr'?'Bekleme Listesi':'Waitlist', icon:Mail, badge:waitlistTotal||undefined },
  ]

  const statusBadge = (s: string) => {
    const m: Record<string,string> = { pending:'bg-amber-500/15 text-amber-400', reviewed:'bg-blue-500/15 text-blue-400', resolved:'bg-emerald-500/15 text-emerald-400', dismissed:'bg-[var(--bg-subtle)] text-[var(--fg-muted)]' }
    const labels: Record<string,string> = { pending:t.pendingStatus, reviewed:t.reviewedStatus, resolved:t.resolvedStatus, dismissed:t.dismissedStatus }
    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${m[s]||m.dismissed}`}>{labels[s]||s}</span>
  }

  const Avatar = ({ u }: { u: any }) => u.avatar_url
    ? <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
    : <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#d4840f,#e8a030)'}}>{(u.display_name||u.username||'?')[0].toUpperCase()}</div>

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Admin header */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-subtle)] sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <InkLogo size={22} />
          <span className="font-display font-bold text-[var(--fg)] text-sm">InkStory</span>
          <span className="text-[var(--fg-muted)]">/</span>
          <span className="flex items-center gap-1.5 text-[var(--accent)] font-semibold text-sm">
            <Shield style={{width:14,height:14}} /> {t.adminPanelTitle}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label:t.totalUsersAdmin,    value:fmt(stats.userCount),   icon:Users,       color:'#5ba3d9' },
            { label:t.totalStoriesAdmin,  value:fmt(stats.storyCount),  icon:BookOpen,    color:'#d4840f' },
            { label:t.totalReadsAdmin,    value:fmt(stats.totalReads),  icon:Eye,         color:'#2d9f6a' },
            { label:t.pendingReports,     value:fmt(stats.reportCount), icon:Flag,        color:'#e85d75' },
            { label:t.bannedUsersCount,   value:fmt(stats.bannedCount), icon:Ban,         color:'#7c5cbf' },
          ].map(({ label, value, icon:Icon, color }) => (
            <div key={label} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5">
              <div className="flex items-center justify-between mb-3">
                <Icon style={{width:18,height:18,color}} />
                <BarChart3 style={{width:13,height:13}} className="text-[var(--fg-muted)] opacity-30" />
              </div>
              <p className="font-display text-2xl font-bold text-[var(--fg)]">{value}</p>
              <p className="text-xs text-[var(--fg-muted)] mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-[var(--border)] overflow-x-auto">
          {tabs.map(({ id, label, icon:Icon, badge }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-all whitespace-nowrap flex-shrink-0 ${tab===id?'border-[var(--accent)] text-[var(--accent)]':'border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]'}`}>
              <Icon style={{width:14,height:14}} />
              {label}
              {badge ? <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">{badge}</span> : null}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ─────────────────────────────────── */}
        {tab==='overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6">
              <h3 className="font-display font-semibold text-[var(--fg)] mb-4 flex items-center gap-2">
                <Users style={{width:16,height:16}} className="text-[var(--accent)]" /> {t.recentUsersLabel}
              </h3>
              <div className="space-y-3">
                {recentUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center gap-3">
                    <Avatar u={u} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--fg)] truncate">{u.display_name||u.username}</p>
                      <p className="text-xs text-[var(--fg-muted)]">@{u.username}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {u.is_banned && <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-medium">{t.filterBanned}</span>}
                      <p className="text-xs text-[var(--fg-muted)]">{format(new Date(u.created_at),'MMM d',{locale})}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6">
              <h3 className="font-display font-semibold text-[var(--fg)] mb-4 flex items-center gap-2">
                <Flag style={{width:16,height:16}} className="text-red-400" /> {t.moderationSummary}
              </h3>
              <div className="space-y-3">
                {[
                  { label:t.pendingReports, value:stats.reportCount, color:'#e85d75', action:()=>setTab('reports') },
                  { label:t.bannedUsersCount, value:stats.bannedCount, color:'#7c5cbf', action:()=>setTab('users') },
                ].map(({ label, value, color, action }) => (
                  <button key={label} onClick={action} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[var(--bg-subtle)] transition-colors">
                    <span className="text-sm text-[var(--fg)]">{label}</span>
                    <span className="font-display text-lg font-bold" style={{color}}>{value}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ─────────────────────────────────────── */}
        {tab==='users' && (
          <div>
            <div className="flex flex-wrap gap-3 mb-5">
              <div className="relative flex-1 min-w-48">
                <Search style={{width:15,height:15}} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
                <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder={t.searchUsersPlaceholder} onKeyDown={e=>e.key==='Enter'&&fetchUsers()}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] text-sm" />
              </div>
              {[
                { id:'all', label:t.filterAll },
                { id:'banned', label:t.filterBanned },
                { id:'shadow_banned', label:t.filterShadow },
                { id:'admins', label:t.filterAdmins },
              ].map(f => (
                <button key={f.id} onClick={()=>setUserFilter(f.id)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${userFilter===f.id?'bg-[var(--accent)] text-white border-[var(--accent)]':'border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]'}`}>
                  {f.label}
                </button>
              ))}
              <button onClick={fetchUsers} className="p-2.5 rounded-xl border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]">
                <RefreshCw style={{width:14,height:14}} className={loading?'animate-spin':''} />
              </button>
            </div>
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)]">
                    {['User','@',t.joinedLabel,t.statusColLabel,t.actionsLabel].map(h=>(
                      <th key={h} className={`text-left px-5 py-3 text-xs font-semibold text-[var(--fg-muted)] uppercase ${h==='@'||h===t.joinedLabel?'hidden md:table-cell':''} ${h===t.actionsLabel?'text-right':''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-12"><Loader2 style={{width:20,height:20}} className="animate-spin mx-auto text-[var(--fg-muted)]" /></td></tr>
                  ) : users.map((u:any) => (
                    <tr key={u.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-subtle)] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar u={u} />
                          <p className="text-sm font-medium text-[var(--fg)]">{u.display_name||u.username}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell"><p className="text-xs text-[var(--fg-muted)]">@{u.username}</p></td>
                      <td className="px-5 py-3.5 hidden md:table-cell"><span className="text-xs text-[var(--fg-muted)]">{format(new Date(u.created_at),'MMM d, yyyy',{locale})}</span></td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {u.is_admin      && <span className="px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-[10px] font-bold">Admin</span>}
                          {u.is_banned     && <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold">{t.filterBanned}</span>}
                          {u.shadow_banned && <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 text-[10px] font-bold">{t.filterShadow}</span>}
                          {!u.is_admin&&!u.is_banned&&!u.shadow_banned && <span className="text-xs text-[var(--fg-muted)]">—</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 justify-end flex-wrap">
                          {!u.is_banned
                            ? <button onClick={()=>setConfirm({title:t.banConfirmTitle,desc:t.banConfirmDesc,onConfirm:()=>doUserAction(u.id,'ban','Admin action')})} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-all"><Ban style={{width:12,height:12}}/>{t.banAction}</button>
                            : <button onClick={()=>doUserAction(u.id,'unban')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-emerald-400 hover:bg-emerald-500/10 transition-all"><Unlock style={{width:12,height:12}}/>{t.unbanAction}</button>
                          }
                          {!u.shadow_banned && <button onClick={()=>doUserAction(u.id,'shadow_ban')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-purple-400 hover:bg-purple-500/10 transition-all"><UserX style={{width:12,height:12}}/>{t.shadowAction}</button>}
                          <button onClick={()=>doUserAction(u.id,u.is_admin?'remove_admin':'make_admin')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all">
                            <Shield style={{width:12,height:12}}/>{u.is_admin?t.demoteAction:t.makeAdminAction}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── STORIES ───────────────────────────────────── */}
        {tab==='stories' && (
          <div>
            <div className="flex flex-wrap gap-3 mb-5">
              <div className="relative flex-1 min-w-48">
                <Search style={{width:15,height:15}} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
                <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder={lang==='tr'?'Hikaye ara...':'Search stories...'} onKeyDown={e=>e.key==='Enter'&&fetchStories()}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] text-sm" />
              </div>
              {[
                {id:'all',label:t.filterAll},{id:'featured',label:t.featuredBadge},
                {id:'locked',label:t.lockedBadge},{id:'flagged',label:t.flaggedBadge}
              ].map(f=>(
                <button key={f.id} onClick={()=>setStoryFilter(f.id)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${storyFilter===f.id?'bg-[var(--accent)] text-white border-[var(--accent)]':'border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]'}`}>
                  {f.label}
                </button>
              ))}
              <button onClick={fetchStories} className="p-2.5 rounded-xl border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]">
                <RefreshCw style={{width:14,height:14}} className={loading?'animate-spin':''} />
              </button>
            </div>
            <div className="space-y-3">
              {loading ? <div className="flex justify-center py-12"><Loader2 style={{width:20,height:20}} className="animate-spin text-[var(--accent)]"/></div>
              : stories.map((s:any) => (
                <div key={s.id} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-display font-semibold text-[var(--fg)] truncate">{s.baslik}</p>
                      {s.is_featured && <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold flex items-center gap-1"><Star style={{width:9,height:9}}/>{t.featuredBadge}</span>}
                      {s.is_locked   && <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-bold flex items-center gap-1"><Lock style={{width:9,height:9}}/>{t.lockedBadge}</span>}
                      {s.moderation_status==='flagged' && <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold">{t.flaggedBadge}</span>}
                    </div>
                    <p className="text-xs text-[var(--fg-muted)]">@{s.profiles?.username} · {s.goruntuleme?.toLocaleString()} {t.readsLabel2} · {format(new Date(s.created_at),'MMM d, yyyy',{locale})}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
                    <a href={`/story/${s.slug}`} target="_blank" className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-all" title={t.viewAction}><Eye style={{width:13,height:13}}/></a>
                    <button onClick={()=>doStoryAction(s.id,s.is_featured?'unfeature':'feature')} title={s.is_featured?t.unfeatureAction:t.featureAction}
                      className={`p-1.5 rounded-lg transition-all ${s.is_featured?'text-amber-400 hover:bg-amber-500/10':'text-[var(--fg-muted)] hover:text-amber-400 hover:bg-amber-500/10'}`}><Star style={{width:13,height:13}}/></button>
                    <button onClick={()=>doStoryAction(s.id,s.is_locked?'unlock':'lock')} title={s.is_locked?t.unlockAction:t.lockAction}
                      className={`p-1.5 rounded-lg transition-all ${s.is_locked?'text-blue-400 hover:bg-blue-500/10':'text-[var(--fg-muted)] hover:text-blue-400 hover:bg-blue-500/10'}`}>
                      {s.is_locked?<Unlock style={{width:13,height:13}}/>:<Lock style={{width:13,height:13}}/>}
                    </button>
                    <button onClick={()=>doStoryAction(s.id,s.moderation_status==='flagged'?'unflag':'flag')} title={t.flagAction}
                      className={`p-1.5 rounded-lg transition-all ${s.moderation_status==='flagged'?'text-red-400 hover:bg-red-500/10':'text-[var(--fg-muted)] hover:text-red-400 hover:bg-red-500/10'}`}><Flag style={{width:13,height:13}}/></button>
                    {s.durum!=='taslak' && <button onClick={()=>doStoryAction(s.id,'unpublish')} title={t.unpublishAction} className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-amber-400 hover:bg-amber-500/10 transition-all"><Globe style={{width:13,height:13}}/></button>}
                    <button onClick={()=>setConfirm({title:t.deleteStoryConfirmTitle,desc:t.deleteStoryConfirmDesc,onConfirm:()=>doStoryAction(s.id,'delete')})}
                      className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 style={{width:13,height:13}}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── COMMENTS ──────────────────────────────────── */}
        {tab==='comments' && (
          <div>
            <div className="flex gap-3 mb-5">
              {[{id:'all',label:t.allCommentsFilter},{id:'flagged',label:t.flaggedCommentsFilter}].map(f=>(
                <button key={f.id} onClick={()=>setCommentFilter(f.id)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${commentFilter===f.id?'bg-[var(--accent)] text-white border-[var(--accent)]':'border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]'}`}>
                  {f.label}
                </button>
              ))}
              <button onClick={fetchComments} className="p-2.5 rounded-xl border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]">
                <RefreshCw style={{width:14,height:14}} className={loading?'animate-spin':''} />
              </button>
            </div>
            <div className="space-y-3">
              {loading ? <div className="flex justify-center py-12"><Loader2 style={{width:20,height:20}} className="animate-spin text-[var(--accent)]"/></div>
              : comments.map((c:any) => (
                <div key={c.id} className={`bg-[var(--card)] rounded-2xl border p-4 ${c.is_deleted?'opacity-50 border-red-500/20':c.moderation_flag?'border-amber-500/30':'border-[var(--border)]'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-sm font-medium text-[var(--fg)]">@{c.profiles?.username}</span>
                        <span className="text-xs text-[var(--fg-muted)]">{t.onStoryLabel}</span>
                        <a href={`/story/${c.hikayeler?.slug}`} target="_blank" className="text-xs text-[var(--accent)] hover:underline truncate max-w-[200px]">{c.hikayeler?.baslik}</a>
                        {c.moderation_flag && <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold">{t.flaggedBadge}</span>}
                        {c.is_deleted      && <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold">{t.deletedBadge}</span>}
                      </div>
                      <p className={`text-sm leading-relaxed ${c.is_deleted?'line-through text-[var(--fg-muted)]':'text-[var(--fg)]'}`}>{c.icerik}</p>
                      <p className="text-xs text-[var(--fg-muted)] mt-1">{format(new Date(c.created_at),lang==='tr'?'d MMM yyyy, HH:mm':'MMM d, yyyy · h:mm a',{locale})}</p>
                    </div>
                    {!c.is_deleted && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={()=>doCommentAction(c.id,c.moderation_flag?'unflag':'flag')}
                          className={`p-1.5 rounded-lg transition-all ${c.moderation_flag?'text-amber-400 hover:bg-amber-500/10':'text-[var(--fg-muted)] hover:text-amber-400 hover:bg-amber-500/10'}`}>
                          <Flag style={{width:13,height:13}}/>
                        </button>
                        <button onClick={()=>setConfirm({title:t.deleteCommentConfirmTitle,desc:t.deleteCommentConfirmDesc,onConfirm:()=>doCommentAction(c.id,'delete')})}
                          className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 style={{width:13,height:13}}/></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── REPORTS ───────────────────────────────────── */}
        {tab==='reports' && (
          <div>
            <div className="flex gap-3 mb-5 flex-wrap">
              {[
                {id:'pending',label:t.pendingStatus},{id:'reviewed',label:t.reviewedStatus},
                {id:'resolved',label:t.resolvedStatus},{id:'dismissed',label:t.dismissedStatus},{id:'all',label:t.filterAll}
              ].map(f=>(
                <button key={f.id} onClick={()=>setReportFilter(f.id)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${reportFilter===f.id?'bg-[var(--accent)] text-white border-[var(--accent)]':'border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]'}`}>
                  {f.label}
                  {f.id==='pending'&&stats.reportCount>0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">{stats.reportCount}</span>}
                </button>
              ))}
              <button onClick={fetchReports} className="p-2.5 rounded-xl border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]">
                <RefreshCw style={{width:14,height:14}} className={loading?'animate-spin':''} />
              </button>
            </div>
            <div className="space-y-4">
              {loading ? <div className="flex justify-center py-12"><Loader2 style={{width:20,height:20}} className="animate-spin text-[var(--accent)]"/></div>
              : reports.length===0 ? (
                <div className="text-center py-16 text-[var(--fg-muted)]">
                  <Flag style={{width:32,height:32}} className="mx-auto mb-3 opacity-30"/>
                  <p>{t.noReportsText} {reportFilter===t.filterAll?'':reportFilter} {lang==='tr'?'rapor':'reports'}</p>
                </div>
              ) : reports.map((r:any) => (
                <div key={r.id} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${r.target_type==='story'?'bg-blue-500/15 text-blue-400':r.target_type==='comment'?'bg-purple-500/15 text-purple-400':'bg-amber-500/15 text-amber-400'}`}>{r.target_type}</span>
                        <ReasonBadge reason={r.reason} />
                        {statusBadge(r.status)}
                      </div>
                      <p className="text-xs text-[var(--fg-muted)]">
                        {t.reportedByLabel} <strong className="text-[var(--fg)]">@{r.reporter?.username||'unknown'}</strong> · {format(new Date(r.created_at),lang==='tr'?'d MMM yyyy, HH:mm':'MMM d, yyyy · h:mm a',{locale})}
                      </p>
                      {r.details   && <p className="text-sm text-[var(--fg-muted)] mt-2 italic">"{r.details}"</p>}
                      {r.admin_note && <p className="text-xs text-[var(--accent)] mt-1.5">{t.adminNoteLabel} {r.admin_note}</p>}
                    </div>
                  </div>
                  {r.status==='pending' && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-[var(--border)]">
                      <button onClick={()=>doReportAction(r.id,'resolve')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"><CheckCircle style={{width:12,height:12}}/>{t.resolveAction}</button>
                      <button onClick={()=>doReportAction(r.id,'delete_content')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"><Trash2 style={{width:12,height:12}}/>{t.deleteContentAction}</button>
                      <button onClick={()=>setConfirm({title:t.banConfirmTitle,desc:t.banConfirmDesc,onConfirm:()=>doReportAction(r.id,'ban_user',undefined,'Reported content violation')})}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all"><Ban style={{width:12,height:12}}/>{t.banUserAction}</button>
                      <button onClick={()=>doReportAction(r.id,'dismiss')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-all"><Info style={{width:12,height:12}}/>{t.dismissAction}</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AI USAGE ──────────────────────────────────── */}
        {tab==='ai' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-[var(--fg-muted)]">{t.last7DaysLabel}</p>
              <button onClick={fetchAI} className="p-2.5 rounded-xl border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]">
                <RefreshCw style={{width:14,height:14}} className={loading?'animate-spin':''} />
              </button>
            </div>
            {loading||!aiData ? <div className="flex justify-center py-16"><Loader2 style={{width:24,height:24}} className="animate-spin text-[var(--accent)]"/></div> : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  {[
                    {label:t.totalAiCallsLabel, value:aiData.totalCalls},
                    {label:t.uniqueUsersLabel,  value:aiData.summaries.length},
                    {label:t.suspiciousLabel,   value:aiData.summaries.filter((s:any)=>s.suspicious).length},
                  ].map(({label,value})=>(
                    <div key={label} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5">
                      <p className="font-display text-3xl font-bold text-[var(--fg)]">{value}</p>
                      <p className="text-xs text-[var(--fg-muted)] mt-1">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 mb-6">
                  <h3 className="font-display font-semibold text-[var(--fg)] mb-5">{t.dailyRequestsLabel}</h3>
                  <div className="flex items-end gap-2 h-24">
                    {aiData.daily.map((d:any) => {
                      const max = Math.max(...aiData.daily.map((x:any)=>x.count),1)
                      const pct = (d.count/max)*100
                      return (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] text-[var(--fg-muted)] font-mono">{d.count}</span>
                          <div className="w-full rounded-t-md" style={{height:`${Math.max(pct,4)}%`,background:'linear-gradient(180deg,#e8a030,#d4840f)',minHeight:4}} />
                          <span className="text-[9px] text-[var(--fg-muted)] font-mono">{d.date.slice(5)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
                  <div className="px-5 py-4 border-b border-[var(--border)]">
                    <h3 className="font-display font-semibold text-[var(--fg)]">{t.topUsersLabel}</h3>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)]">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--fg-muted)] uppercase">User</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--fg-muted)] uppercase">{t.callsLabel}</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--fg-muted)] uppercase hidden md:table-cell">{t.statusColLabel}</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--fg-muted)] uppercase">{t.actionsLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiData.summaries.map((s:any) => (
                        <tr key={s.user_id} className={`border-b border-[var(--border)] transition-colors ${s.suspicious?'bg-red-500/5':'hover:bg-[var(--bg-subtle)]'}`}>
                          <td className="px-5 py-3.5">
                            <p className="text-sm font-medium text-[var(--fg)]">{s.display_name||s.username}</p>
                            <p className="text-xs text-[var(--fg-muted)]">@{s.username}</p>
                          </td>
                          <td className="px-5 py-3.5"><span className="font-display font-bold text-[var(--fg)]">{s.total_calls}</span></td>
                          <td className="px-5 py-3.5 hidden md:table-cell">
                            {s.suspicious
                              ? <span className="flex items-center gap-1 text-xs text-red-400 font-medium"><AlertTriangle style={{width:12,height:12}}/>{t.suspiciousLabel}</span>
                              : <span className="text-xs text-[var(--fg-muted)]">{t.normalLabel}</span>}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {s.suspicious && (
                              <button onClick={()=>setConfirm({title:t.banConfirmTitle,desc:`${t.suspiciousLabel} AI usage.`,onConfirm:()=>doUserAction(s.user_id,'ban','Excessive AI usage')})}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 ml-auto transition-all">
                                <Ban style={{width:12,height:12}}/>{t.banAction}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>


        {/* ── ANNOUNCEMENTS ─────────────────────────────── */}
        {tab==='announcements' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-[var(--fg-muted)]">{t.onlyOneActive}</p>
              <button
                onClick={() => setAnnForm({ title:'', message:'', active:false })}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:scale-105"
                style={{ background:'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                <Plus style={{width:14,height:14}}/> {t.newAnnouncement}
              </button>
            </div>

            {/* Create / Edit Form */}
            {annForm && (
              <div className="bg-[var(--card)] rounded-2xl border border-[var(--accent)]/30 p-5 mb-6 animate-fade-in">
                <h3 className="font-display font-semibold text-[var(--fg)] mb-4">
                  {annForm.id ? t.editAnn : t.newAnnouncement}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">{t.announcementTitle}</label>
                    <input type="text" value={annForm.title} onChange={e=>setAnnForm(f=>f?{...f,title:e.target.value}:f)}
                      placeholder={t.annTitlePlaceholder}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">{t.announcementMessage}</label>
                    <textarea value={annForm.message} onChange={e=>setAnnForm(f=>f?{...f,message:e.target.value}:f)}
                      rows={4} placeholder={t.annMessagePlaceholder}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] text-sm resize-none" />
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={annForm.active} onChange={e=>setAnnForm(f=>f?{...f,active:e.target.checked}:f)}
                      className="w-4 h-4 rounded accent-[var(--accent)]" />
                    <span className="text-sm text-[var(--fg)]">{t.activateAnn}</span>
                  </label>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={async () => {
                    if (!annForm.title.trim() || !annForm.message.trim()) return
                    setAnnSaving(true)
                    if (annForm.id) {
                      await fetch('/api/admin/announcements', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:annForm.id, title:annForm.title, message:annForm.message, active:annForm.active}) })
                    } else {
                      await fetch('/api/admin/announcements', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({title:annForm.title, message:annForm.message, active:annForm.active}) })
                    }
                    setAnnForm(null); setAnnSaving(false); fetchAnn()
                  }} disabled={annSaving || !annForm.title.trim() || !annForm.message.trim()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                    style={{ background:'linear-gradient(135deg,#d4840f,#e8a030)' }}>
                    {annSaving ? <Loader2 style={{width:14,height:14}} className="animate-spin"/> : null}
                    {annForm.id ? t.saveAnn : t.createAnn}
                  </button>
                  <button onClick={()=>setAnnForm(null)}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--fg-muted)] transition-all">
                    {t.cancelAnn}
                  </button>
                </div>
              </div>
            )}

            {/* Announcements list */}
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 style={{width:20,height:20}} className="animate-spin text-[var(--accent)]"/></div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-16 text-[var(--fg-muted)]">
                <Megaphone style={{width:32,height:32}} className="mx-auto mb-3 opacity-30"/>
                <p>{t.noAnnouncements}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((a:any) => (
                  <div key={a.id} className={`bg-[var(--card)] rounded-2xl border p-5 transition-all ${a.active?'border-[var(--accent)]/40 bg-[var(--accent)]/3':'border-[var(--border)]'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h4 className="font-display font-semibold text-[var(--fg)]">{a.title}</h4>
                          {a.active
                            ? <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>{t.announcementActive}</span>
                            : <span className="px-2.5 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--fg-muted)] text-[10px] font-medium">{t.announcementInactive}</span>
                          }
                        </div>
                        <p className="text-sm text-[var(--fg-muted)] leading-relaxed whitespace-pre-wrap">{a.message}</p>
                        <p className="text-xs text-[var(--fg-muted)] mt-2 opacity-60">{format(new Date(a.created_at), lang==='tr'?'d MMM yyyy':'MMM d, yyyy', {locale})}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Toggle active */}
                        <button
                          onClick={async () => {
                            await fetch('/api/admin/announcements', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:a.id, active:!a.active}) })
                            fetchAnn()
                          }}
                          title={a.active ? t.deactivateAnn : t.activateAnn}
                          className={`p-1.5 rounded-lg transition-all ${a.active?'text-emerald-400 hover:bg-emerald-500/10':'text-[var(--fg-muted)] hover:text-emerald-400 hover:bg-emerald-500/10'}`}>
                          {a.active ? <ToggleRight style={{width:16,height:16}}/> : <ToggleLeft style={{width:16,height:16}}/>}
                        </button>
                        {/* Edit */}
                        <button onClick={()=>setAnnForm({id:a.id, title:a.title, message:a.message, active:a.active})}
                          className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all">
                          <Pencil style={{width:14,height:14}}/>
                        </button>
                        {/* Delete */}
                        <button onClick={()=>setConfirm({title:t.deleteAnnConfirm, desc:t.deleteAnnDesc, onConfirm:async()=>{ await fetch(`/api/admin/announcements?id=${a.id}`,{method:'DELETE'}); fetchAnn(); setConfirm(null) }})}
                          className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all">
                          <Trash2 style={{width:14,height:14}}/>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {/* ── WAITLIST ──────────────────────────────────── */}
        {tab==='waitlist' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display font-semibold text-[var(--fg)]">
                  {lang==='tr' ? 'Premium Bekleme Listesi' : 'Premium Waitlist'}
                </h3>
                <p className="text-sm text-[var(--fg-muted)] mt-0.5">
                  {waitlistTotal} {lang==='tr' ? 'kişi kayıtlı' : 'people registered'}
                </p>
              </div>
              <button
                onClick={() => {
                  const csv = 'email,lang,date\n' + waitlist.map((w:any) => `${w.email},${w.lang},${w.created_at}`).join('\n')
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url  = URL.createObjectURL(blob)
                  const a    = document.createElement('a')
                  a.href = url; a.download = 'premium-waitlist.csv'; a.click()
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--accent)]/50 transition-all"
              >
                <Download style={{width:14,height:14}}/> {lang==='tr' ? 'CSV İndir' : 'Download CSV'}
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><Loader2 style={{width:20,height:20}} className="animate-spin text-[var(--accent)]"/></div>
            ) : waitlist.length === 0 ? (
              <div className="text-center py-16 text-[var(--fg-muted)]">
                <Mail style={{width:32,height:32}} className="mx-auto mb-3 opacity-30"/>
                <p>{lang==='tr' ? 'Henüz kayıt yok.' : 'No signups yet.'}</p>
              </div>
            ) : (
              <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)]">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--fg-muted)] uppercase">E-posta</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--fg-muted)] uppercase hidden md:table-cell">{lang==='tr'?'Dil':'Lang'}</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--fg-muted)] uppercase">{lang==='tr'?'Tarih':'Date'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waitlist.map((w:any, i:number) => (
                      <tr key={w.id} className={`border-b border-[var(--border)] hover:bg-[var(--bg-subtle)] transition-colors ${i===0?'bg-[var(--accent)]/3':''}`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <Mail style={{width:13,height:13}} className="text-[var(--fg-muted)]"/>
                            <span className="text-sm text-[var(--fg)]">{w.email}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--bg-subtle)] text-[var(--fg-muted)]">{w.lang?.toUpperCase()}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-[var(--fg-muted)]">{format(new Date(w.created_at), lang==='tr'?'d MMM yyyy':'MMM d, yyyy', {locale})}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      {confirm && <ConfirmModal title={confirm.title} desc={confirm.desc} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)} />}
    </div>
  )
}

