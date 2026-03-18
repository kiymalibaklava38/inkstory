# 🔐 InkStory Security Guide

A complete reference of every security control implemented and the steps needed to activate them in production.

---

## Architecture Overview

```
Browser  →  Next.js Middleware  →  API Routes  →  Supabase
             (rate limit,           (auth,         (RLS,
              CSP headers,          validation,     storage
              scanner block)        sanitization)   policies)
```

---

## 1. Authentication

### How it works
- All session checks use `supabase.auth.getUser()` — this validates the JWT **against the Supabase server** on every call. It cannot be forged by a tampered cookie.
- `getSession()` is **never used** in server-side code because it only reads from the cookie without re-validating.
- Protected routes are guarded in **both** middleware (redirect) and API routes (401 JSON).

### Files
| File | Purpose |
|------|---------|
| `src/lib/auth-helpers.ts` | `requireAuth()`, `requireAdmin()`, `requireOwnership()` |
| `src/lib/supabase/middleware.ts` | Session refresh + protected route redirect |
| `src/middleware.ts` | Applies session check to all routes |

### Supabase Dashboard settings
Go to **Authentication → Settings**:
- ✅ Enable email confirmation
- ✅ Minimum password length: **8**
- ✅ Enable rate limiting on sign-in/sign-up
- ✅ Set JWT expiry to **1 hour** (access token), 7 days (refresh token)
- ✅ Enable leaked password protection

---

## 2. Rate Limiting

### Limits configured
| Endpoint | Limit | Window |
|----------|-------|--------|
| `/login`, `/register` | 10 req | 15 min |
| `/api/ai/write` | 20 req | 1 min |
| `/api/upload/*` | 10 req | 5 min |
| `/api/comments` | 15 req | 1 min |
| All other `/api/*` | 100 req | 1 min |

### Backend
- Uses **Upstash Redis** (persistent, works across serverless instances)
- Falls back to **in-memory Map** if Redis is not configured (fine for dev, not for production at scale)

### Setup (production required)
1. Create a free database at [console.upstash.com](https://console.upstash.com)
2. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to your env
3. Without these, rate limiting still works via in-memory (resets on cold starts)

### Files
`src/lib/ratelimit.ts`

---

## 3. Input Validation

All user input is validated with **Zod** before touching the database. Every API route calls `parseOrError()` and returns a `400` if validation fails.

### Schemas defined
| Schema | Validates |
|--------|-----------|
| `RegisterSchema` | email, password (min 8 + uppercase + number), username |
| `LoginSchema` | email format, password presence |
| `CreateStorySchema` | title max 200, description max 1000, valid categoryId |
| `CreateChapterSchema` | UUID storyId, title, HTML content max 200KB |
| `CommentSchema` | UUID storyId, text max 2000 chars |
| `UpdateProfileSchema` | username regex `[a-z0-9_]`, bio max 300, valid URL |
| `AiWriteSchema` | action enum, text 10–10000 chars |

### Files
`src/lib/validation.ts`

---

## 4. HTML Sanitization (XSS Prevention)

TipTap produces HTML. Before storing or rendering it:

- **Server-side**: `sanitizeHtml()` runs **isomorphic-dompurify** with an allowlist of safe tags
- **Allowed tags**: `p, br, strong, em, u, s, h1–h4, ul, ol, li, blockquote, hr, span, a`
- **Stripped**: `<script>`, `<iframe>`, `style=`, `onclick=`, `onerror=`, `data:` URIs, `javascript:` URIs
- All `<a>` tags get `rel="noopener noreferrer"` and `target="_blank"` injected automatically

### Files
`src/lib/sanitize.ts`

---

## 5. File Upload Security

Every uploaded image goes through **5 checks**:

| Check | Where |
|-------|-------|
| MIME type allowlist (JPEG/PNG/WebP only) | Client + Server |
| File size limit (2MB avatar, 5MB cover) | Client + Server |
| Empty file rejection | Server |
| **Magic bytes verification** (prevents MIME spoofing) | Server only |
| Safe storage path generation (no path traversal) | Server only |

The magic bytes check reads the first 8–12 bytes of the file buffer and compares them against known signatures — so renaming `malware.php` to `photo.jpg` won't work.

### Files
`src/lib/upload-security.ts`, `src/app/api/upload/avatar/route.ts`, `src/app/api/upload/cover/route.ts`

---

## 6. SQL Injection Protection

InkStory has **zero raw SQL** in application code. All database access goes through the Supabase client which uses **parameterized queries** by default. The Supabase PostgREST API never interpolates user strings into SQL.

Additionally:
- All IDs passed to queries are validated as UUIDs first (`/^[0-9a-f-]{36}$/.test(id)`)
- Zod schemas validate and coerce types before any DB call
- RLS policies enforce data boundaries even if application logic has a bug

---

## 7. Row Level Security (RLS)

Run `supabase-security.sql` in the Supabase SQL Editor. It configures:

### Policies per table
| Table | Who can SELECT | Who can INSERT | Who can UPDATE | Who can DELETE |
|-------|---------------|----------------|----------------|----------------|
| profiles | Everyone | Auth user (own) | Own user + Admin | Admin only |
| hikayeler | Published = public; drafts = own | Auth user | Own author | Own author |
| bolumler | Published chapters of published stories | Own author | Own author | Own author |
| yorumlar | On published stories | Auth users | — | Own commenter |
| begeniler | Everyone | Auth user | — | Own user |
| takip | Everyone | Auth user | — | Own user |
| okuma_listesi | Own user only | Own user | — | Own user |
| audit_log | Admins only | System | — | Nobody |

### Admin helper
```sql
-- Make yourself admin (replace username)
UPDATE public.profiles SET is_admin = true WHERE username = 'your_username';
```

---

## 8. Security Headers

Applied to every response via middleware:

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | Strict allowlist | Prevents XSS, code injection |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer leakage |
| `Strict-Transport-Security` | `max-age=31536000` (prod only) | Forces HTTPS |
| `Permissions-Policy` | Disables camera, mic, geo, payment | Reduces attack surface |

### Files
`src/lib/security-headers.ts`, `src/middleware.ts`

---

## 9. API Key Protection

| Key | Env var | Exposed to browser? |
|-----|---------|---------------------|
| Supabase URL | `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes (safe, public by design) |
| Supabase anon key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes (safe, limited by RLS) |
| Anthropic API key | `ANTHROPIC_API_KEY` | ❌ No — server-side only |
| Upstash Redis token | `UPSTASH_REDIS_REST_TOKEN` | ❌ No — server-side only |

The Anthropic key is **never** in a `NEXT_PUBLIC_*` variable. The frontend calls `/api/ai/write` (your own Next.js server), which then calls Anthropic server-to-server.

---

## 10. Audit Logging

The `audit_log` table records sensitive actions:

```sql
-- Example: log an admin ban
SELECT public.log_audit(
  'admin_ban',
  'profiles',
  'user-uuid-here',
  '{"reason": "spam"}'::jsonb
);
```

Only admins can read the audit log. No one can delete entries.

---

## Production Deployment Checklist

Before going live, verify every item:

### Supabase
- [ ] `supabase-schema.sql` executed
- [ ] `supabase-update.sql` executed (adds `is_admin`)
- [ ] `supabase-security.sql` executed (RLS + audit log)
- [ ] Email confirmation enabled
- [ ] Password requirements set (min 8, uppercase, number)
- [ ] Rate limiting enabled in Auth settings
- [ ] Auth redirect URLs set to production domain

### Environment Variables (Vercel / hosting)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `ANTHROPIC_API_KEY` set (no NEXT_PUBLIC_ prefix)
- [ ] `UPSTASH_REDIS_REST_URL` set
- [ ] `UPSTASH_REDIS_REST_TOKEN` set
- [ ] `NODE_ENV=production` set
- [ ] `NEXT_PUBLIC_SITE_URL` set to production URL

### Code
- [ ] No `console.log` of sensitive data in production
- [ ] `next build` passes with no type errors
- [ ] All API routes return proper HTTP status codes

### DNS / Infrastructure
- [ ] HTTPS enabled (Vercel provides this automatically)
- [ ] Custom domain configured in Supabase Auth redirect URLs
- [ ] Supabase project is not in "paused" state

---

## Security Contact

Found a vulnerability? Please report it privately to: **security@inkstory.com**

Do not open a public GitHub issue for security vulnerabilities.
