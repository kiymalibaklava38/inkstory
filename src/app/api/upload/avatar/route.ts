import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, uploadLimiter } from '@/lib/ratelimit'
import { requireAuth } from '@/lib/auth-helpers'
import { verifyMagicBytes, buildSafeStoragePath, MAX_AVATAR_BYTES, ALLOWED_MIME_TYPES } from '@/lib/upload-security'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // Rate limit uploads
  const limited = await checkRateLimit(req, uploadLimiter)
  if (limited) return limited

  // Auth
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  // Parse multipart form
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  }

  // ── Server-side validation ─────────────────────────────

  // 1. MIME type check (from Content-Type)
  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return NextResponse.json(
      { error: 'Only JPEG, PNG, and WebP images are allowed.' },
      { status: 415 }
    )
  }

  // 2. Size check
  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json({ error: 'Avatar must be smaller than 2 MB.' }, { status: 413 })
  }

  if (file.size === 0) {
    return NextResponse.json({ error: 'File is empty.' }, { status: 400 })
  }

  // 3. Magic bytes verification — prevents MIME spoofing
  const buffer = await file.arrayBuffer()
  if (!verifyMagicBytes(buffer, file.type)) {
    return NextResponse.json(
      { error: 'File content does not match the declared type.' },
      { status: 415 }
    )
  }

  // ── Upload to Supabase Storage ─────────────────────────
  const supabase = await createClient()
  const storagePath = buildSafeStoragePath(user.id, 'avatar', file.type)

  const { error: uploadError } = await supabase.storage
    .from('avatarlar')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
      cacheControl: '3600',
    })

  if (uploadError) {
    console.error('[Avatar Upload] Storage error:', uploadError.message)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage.from('avatarlar').getPublicUrl(storagePath)

  // Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (updateError) {
    console.error('[Avatar Upload] Profile update error:', updateError.message)
    return NextResponse.json({ error: 'Upload succeeded but profile update failed.' }, { status: 500 })
  }

  return NextResponse.json({ url: publicUrl }, { status: 200 })
}
