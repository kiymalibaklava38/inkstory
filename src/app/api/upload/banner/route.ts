import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth()
    if (authError) {
      console.error('[Banner] Auth error')
      return authError
    }

    let formData: FormData
    try {
      formData = await req.formData()
    } catch (e) {
      console.error('[Banner] FormData parse error:', e)
      return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 })
    }

    const file = formData.get('file')
    if (!(file instanceof File)) {
      console.error('[Banner] No file in formdata')
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }

    console.log('[Banner] file type:', file.type, 'size:', file.size)

    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP allowed.' }, { status: 415 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Banner must be under 5MB.' }, { status: 413 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg'
    const storagePath = `${user.id}/banner.${ext}`

    console.log('[Banner] Uploading to path:', storagePath)

    const supabase = await createClient()
    const { error: uploadError } = await supabase.storage
      .from('banners')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
        cacheControl: '3600',
      })

    if (uploadError) {
      console.error('[Banner] Supabase storage error:', JSON.stringify(uploadError))
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(storagePath)

    console.log('[Banner] Success, url:', publicUrl)

    const { error: dbErr } = await supabase
      .from('profiles')
      .update({ banner_url: publicUrl })
      .eq('id', user.id)

    if (dbErr) {
      console.error('[Banner] DB update error:', dbErr.message)
    }

    return NextResponse.json({ url: publicUrl })

  } catch (e: any) {
    console.error('[Banner] Unexpected error:', e?.message || e)
    return NextResponse.json({ error: 'Server error: ' + (e?.message || 'unknown') }, { status: 500 })
  }
}
