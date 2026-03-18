# ✒️ InkStory — Write Your World

A premium global story writing and reading platform built with **Next.js 14 + Supabase + AI**.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🌙 Dark / Light Mode | System preference + manual toggle, persisted |
| 🤖 AI Writing Assistant | Continue, Improve, Emotional depth, Dialogue, Description, Plot twist, Next chapter |
| 🔔 Realtime Notifications | Live likes, comments, follows via Supabase Realtime |
| 📖 Reading Modes | Light / Dark / Sepia — per-chapter preference |
| 🔐 Admin Panel | User management, story moderation, stats |
| 💾 Library | Save stories for later |
| 👥 Follow System | Follow writers |
| 💬 Comments | Per-story comments |
| ❤️ Likes | Story likes |
| 🔍 Search | Full-text Turkish/English search |
| 📊 Writer Dashboard | Manage stories, chapters, status |

---

## 🚀 Quick Start

### 1. Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. **SQL Editor → New Query** → paste & run `supabase-schema.sql` (from the Hikayeci project)
3. **SQL Editor → New Query** → paste & run `supabase-update.sql`

### 2. Environment

```bash
cp .env.local.example .env.local
# Fill in your Supabase URL and anon key
```

**Authentication → URL Configuration:**
- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`

### 3. Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🗺️ Page Map

```
/                          → Homepage (real stats)
/stories                   → Browse stories
/story/[slug]              → Story detail
/story/[slug]/chapter/[n]  → Reading mode (3 themes)
/search                    → Search
/profile/[username]        → Writer profile
/login                     → Sign in
/register                  → Create account
/write                     → Write story + AI panel
/dashboard                 → Writer dashboard
/library                   → Saved stories
/notifications             → Realtime notifications
/admin                     → Admin panel (admin only)
/terms                     → Terms of service
```

---

## 🤖 AI Writing Assistant

The AI panel in the editor makes real calls to Claude via the Anthropic API.

**Actions available:**
- **Continue with AI** — generates the next 2–3 paragraphs
- **Improve Writing** — elevates prose quality
- **Make it More Emotional** — deepens feeling and sensory detail
- **Strengthen Dialogue** — makes conversations more natural
- **Add Descriptive Detail** — richer show-don't-tell imagery
- **Suggest Plot Twist** — surprising story direction
- **Suggest Next Chapter** — chapter title + outline

Each suggestion can be **Accepted** (inserted into editor), **Regenerated**, or **Rejected**.

> **Note:** The AI panel calls `https://api.anthropic.com/v1/messages` directly from the browser. In production, proxy this through a Next.js API route to keep your key server-side.

---

## 🔔 Realtime Notifications

Uses Supabase Realtime channels. Run this SQL to enable:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.yorumlar;
ALTER PUBLICATION supabase_realtime ADD TABLE public.begeniler;
ALTER PUBLICATION supabase_realtime ADD TABLE public.takip;
```

---

## 🔐 Admin Access

```sql
UPDATE public.profiles SET is_admin = true WHERE username = 'your_username';
```

Then visit `/admin`.

---

## 🚢 Deploy to Vercel

```bash
vercel
```

Add environment variables in Vercel dashboard. Update Supabase URLs to your production domain.

---

## 🎨 Design System

| Token | Value |
|-------|-------|
| Primary font | Cormorant Garamond (display) |
| Body font | DM Sans |
| Reading font | Lora |
| Brand color | `#d4840f` (nib amber) |
| Dark bg | `#060d18` |
| Light bg | `#fafaf8` |

---

Happy writing! ✒️
