import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, uploadLimiter } from '@/lib/ratelimit'
import { requireAuth } from '@/lib/auth-helpers'
import { verifyMagicBytes, buildSafeStoragePath, MAX_COVER_BYTES, ALLOWED_MIME_TYPES } from '@/lib/upload-security'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, uploadLimiter)
  if (limited) return limited

  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  let formData: FormData
  try { formData = await req.formData() }
  catch { return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 }) }

  const file = formData.get('file')
  const storyId = formData.get('storyId')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  }

  if (typeof storyId !== 'string' || !/^[0-9a-f-]{36}$/.test(storyId)) {
    return NextResponse.json({ error: 'Valid story ID is required.' }, { status: 400 })
  }

  // Verify user owns the story (prevent uploading covers to someone else's story)
  const supabase = await createClient()
  const { data: story } = await supabase
    .from('hikayeler')
    .select('id')
    .eq('id', storyId)
    .eq('yazar_id', user.id)
    .single()

  if (!story) {
    return NextResponse.json({ error: 'Story not found or access denied.' }, { status: 404 })
  }

  // Validate file
  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, and WebP images are allowed.' }, { status: 415 })
  }
  if (file.size > MAX_COVER_BYTES) {
    return NextResponse.json({ error: 'Cover image must be smaller than 5 MB.' }, { status: 413 })
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'File is empty.' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  if (!verifyMagicBytes(buffer, file.type)) {
    return NextResponse.json({ error: 'File content does not match declared type.' }, { status: 415 })
  }

  const storagePath = buildSafeStoragePath(storyId, 'cover', file.type)

  const { error: uploadError } = await supabase.storage
    .from('kapaklar')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
      cacheControl: '3600',
    })

  if (uploadError) {
    console.error('[Cover Upload] Storage error:', uploadError.message)
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('kapaklar').getPublicUrl(storagePath)

  await supabase
    .from('hikayeler')
    .update({ kapak_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', storyId)
    .eq('yazar_id', user.id)

  return NextResponse.json({ url: publicUrl }, { status: 200 })
}
