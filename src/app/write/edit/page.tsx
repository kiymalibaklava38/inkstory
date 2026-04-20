'use client'

import { useState, useEffect, Suspense } from 'react' // Suspense'i ekledik
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n'
import { Save, ArrowLeft, Loader2, Check } from 'lucide-react'
import Link from 'next/link'
import { ALL_CATEGORIES } from '@/lib/categories'
import { validateImageClient } from '@/lib/upload-security'

// 1. Asıl sayfa mantığını bu bileşene taşıyoruz
function EditStoryContent() {
  const [form, setForm] = useState({
    title: '', description: '', categoryId: '', tags: '', status: 'draft' as 'draft' | 'published' | 'tamamlandi'
  })
  const [coverFile, setCoverFile]     = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [currentCover, setCurrentCover] = useState<string | null>(null)
  const [storySlug, setStorySlug]     = useState('')
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [success, setSuccess]         = useState(false)
  const [error, setError]             = useState('')

  const router       = useRouter()
  const searchParams = useSearchParams() // Artık burada kullanmak güvenli
  const storyId      = searchParams.get('id')
  const supabase     = createClient()
  const { lang }     = useLang()

  useEffect(() => {
    const init = async () => {
      // storyId yoksa işlem yapma
      if (!storyId) { router.push('/dashboard'); return }
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('hikayeler')
        .select('*, kategoriler(id,slug)')
        .eq('id', storyId)
        .eq('yazar_id', user.id)
        .single()

      if (!data) { router.push('/dashboard'); return }

      const statusMap: Record<string, 'draft' | 'published' | 'tamamlandi'> = {
        taslak:       'draft',
        yayinda:      'published',
        tamamlandi:   'tamamlandi',
      }

      setForm({
        title:       data.baslik || '',
        description: data.aciklama || '',
        categoryId:  data.kategoriler?.slug || '',
        tags:        (data.etiketler || []).join(', '),
        status:      statusMap[data.durum] || 'draft',
      })
      setCurrentCover(data.kapak_url || null)
      setStorySlug(data.slug)
      setLoading(false)
    }
    init()
  }, [storyId])

  // ... save fonksiyonu ve JSX kısmının geri kalanı aynı kalacak ...
  // (Save fonksiyonunu ve return içindeki JSX'i buraya aynen yapıştır)
  
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>
  
  return (
    /* JSX Kodlarını buraya aynen koy */
    <div>...</div>
  )
}

// 2. Export ettiğimiz ana bileşen Suspense ile sarmalanıyor
export default function EditStoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    }>
      <EditStoryContent />
    </Suspense>
  )
}