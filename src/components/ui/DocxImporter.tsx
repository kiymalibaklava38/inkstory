'use client'

import { useState, useRef } from 'react'
import { FileUp, Loader2, FileText, X, Check } from 'lucide-react'
import { useLang } from '@/lib/i18n'

interface Props {
  onImport: (html: string) => void
}

export function DocxImporter({ onImport }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef              = useRef<HTMLInputElement>(null)
  const { lang } = useLang()

  const processFile = async (file: File) => {
    // Dosya kontrolü
    if (!file.name.match(/\.(docx|doc)$/i)) {
      setError(lang === 'tr' ? 'Sadece .docx veya .doc dosyaları desteklenir.' : 'Only .docx or .doc files are supported.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(lang === 'tr' ? 'Dosya 10MB\'dan büyük olamaz.' : 'File must be under 10MB.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // mammoth dinamik import
      const mammoth = await import('mammoth')

      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.convertToHtml({ arrayBuffer })

      if (!result.value || result.value.trim().length < 10) {
        throw new Error(lang === 'tr' ? 'Dosya boş veya okunamıyor.' : 'File appears empty or unreadable.')
      }

      // HTML'i temizle — sadece temel formatlamayı tut
      let html = result.value
        .replace(/<img[^>]*>/gi, '')                  // resimleri kaldır
        .replace(/<table[^>]*>[\s\S]*?<\/table>/gi, '') // tabloları kaldır
        .replace(/ style="[^"]*"/gi, '')               // inline style'ları kaldır
        .replace(/<span[^>]*>/gi, '')                  // span'ları kaldır
        .replace(/<\/span>/gi, '')
        .replace(/\s+/g, ' ')
        .trim()

      onImport(html)
      setSuccess(
        lang === 'tr'
          ? `"${file.name}" başarıyla içe aktarıldı.`
          : `"${file.name}" imported successfully.`
      )
    } catch (err: any) {
      setError(err.message || (lang === 'tr' ? 'Dosya okunamadı.' : 'Could not read file.'))
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  return (
    <div className="w-full">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !loading && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
          dragging
            ? 'border-[var(--accent)] bg-[var(--accent)]/8 scale-[1.01]'
            : 'border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--bg-subtle)]'
        } ${loading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".docx,.doc"
          onChange={handleFile}
          className="hidden"
        />

        {loading ? (
          <>
            <Loader2 style={{ width: 28, height: 28 }} className="animate-spin text-[var(--accent)]" />
            <p className="text-sm text-[var(--fg-muted)]">
              {lang === 'tr' ? 'Dosya işleniyor...' : 'Processing file...'}
            </p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#d4840f22,#f0c04033)' }}>
              <FileUp style={{ width: 22, height: 22 }} className="text-[var(--accent)]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[var(--fg)]">
                {lang === 'tr' ? 'Word dosyanı buraya sürükle veya tıkla' : 'Drag your Word file here or click'}
              </p>
              <p className="text-xs text-[var(--fg-muted)] mt-1">
                {lang === 'tr' ? '.docx veya .doc · Maks 10MB' : '.docx or .doc · Max 10MB'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <X style={{ width: 14, height: 14 }} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="flex items-start gap-2 mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <Check style={{ width: 14, height: 14 }} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-400">{success}</p>
        </div>
      )}

      {/* Warning */}
      {!error && !success && (
        <p className="text-[10px] text-[var(--fg-muted)] mt-2 text-center opacity-60">
          {lang === 'tr'
            ? 'İçe aktarma mevcut editör içeriğinin üzerine yazar.'
            : 'Import will replace current editor content.'}
        </p>
      )}
    </div>
  )
}
