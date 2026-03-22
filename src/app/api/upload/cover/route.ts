import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth()
    if (authError) return authError

    let formData: FormData
    try { formData = await req.formData() }
    catch { return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 }) }

    const file = formData.get('file')
    const storyId = formData.get('storyId')

    if (!(file instanceof File))
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    if (typeof storyId !== 'string' || !/^[0-9a-f-]{36}$/.test(storyId))
      return NextResponse.json({ error: 'Valid story ID is required.' }, { status: 400 })

    if (!ALLOWED.includes(file.type))
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP allowed.' }, { status: 415 })

    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: 'Cover must be under 5MB.' }, { status: 413 })

    const supabase = await createClient()

    // Verify ownership
    const { data: story } = await supabase
      .from('hikayeler').select('id').eq('id', storyId).eq('yazar_id', user.id).single()
    if (!story)
      return NextResponse.json({ error: 'Story not found or access denied.' }, { status: 404 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg'
    const storagePath = `${storyId}/cover.${ext}`

    console.log('[Cover] Uploading to kapaklar/', storagePath)

    const { error: uploadError } = await supabase.storage
      .from('kapaklar')
      .upload(storagePath, buffer, { contentType: file.type, upsert: true, cacheControl: '3600' })

    if (uploadError) {
      console.error('[Cover] Storage error:', JSON.stringify(uploadError))
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from('kapaklar').getPublicUrl(storagePath)

    await supabase.from('hikayeler')
      .update({ kapak_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', storyId).eq('yazar_id', user.id)

    return NextResponse.json({ url: publicUrl })
  } catch (e: any) {
    console.error('[Cover] Unexpected error:', e?.message)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
