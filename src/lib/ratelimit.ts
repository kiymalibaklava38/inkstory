import { NextRequest, NextResponse } from 'next/server'

// ── Types ─────────────────────────────────────────────────

interface RateLimitConfig {
  /** Max requests per window */
  limit: number
  /** Window size in seconds */
  windowSec: number
  /** Prefix for the cache key */
  prefix: string
}

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number   // unix timestamp ms
}

// ── In-memory store (development / no-Redis fallback) ─────

const memStore = new Map<string, { count: number; reset: number }>()

function inMemoryCheck(key: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now()
  const entry = memStore.get(key)

  if (!entry || now > entry.reset) {
    memStore.set(key, { count: 1, reset: now + windowSec * 1000 })
    return { success: true, remaining: limit - 1, reset: now + windowSec * 1000 }
  }

  entry.count++
  const remaining = Math.max(0, limit - entry.count)
  return {
    success: entry.count <= limit,
    remaining,
    reset: entry.reset,
  }
}

// ── Upstash Redis check ───────────────────────────────────

async function upstashCheck(
  key: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    // Fall back to in-memory
    return inMemoryCheck(key, limit, windowSec)
  }

  try {
    // Use Redis INCR + EXPIRE atomic pipeline
    const pipeline = [
      ['INCR', key],
      ['EXPIRE', key, String(windowSec)],
    ]

    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pipeline),
    })

    if (!res.ok) return inMemoryCheck(key, limit, windowSec)

    const data = await res.json()
    const count = data[0]?.result as number ?? 1

    return {
      success: count <= limit,
      remaining: Math.max(0, limit - count),
      reset: Date.now() + windowSec * 1000,
    }
  } catch {
    return inMemoryCheck(key, limit, windowSec)
  }
}

// ── Public API ────────────────────────────────────────────

/**
 * Get the client IP from request headers (works behind Vercel/Cloudflare).
 */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}

/**
 * Check rate limit for a request.
 * Returns a 429 NextResponse if exceeded, or null if allowed.
 */
export async function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const ip  = getClientIp(req)
  const key = `rl:${config.prefix}:${ip}`

  const result = await upstashCheck(key, config.limit, config.windowSec)

  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Too many requests. Please slow down.',
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
          'X-RateLimit-Limit':     String(config.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset':     String(result.reset),
        },
      }
    )
  }

  return null
}

// ── Pre-configured rate limiters ─────────────────────────

/** Auth endpoints: 10 attempts / 15 min */
export const authLimiter: RateLimitConfig = {
  limit: 10, windowSec: 900, prefix: 'auth',
}

/** AI writing: 20 requests / min per IP */
export const aiLimiter: RateLimitConfig = {
  limit: 20, windowSec: 60, prefix: 'ai',
}

/** File uploads: 10 uploads / 5 min */
export const uploadLimiter: RateLimitConfig = {
  limit: 10, windowSec: 300, prefix: 'upload',
}

/** General API: 100 requests / min */
export const apiLimiter: RateLimitConfig = {
  limit: 100, windowSec: 60, prefix: 'api',
}

/** Comment posting: 15 / min */
export const commentLimiter: RateLimitConfig = {
  limit: 15, windowSec: 60, prefix: 'comment',
}
