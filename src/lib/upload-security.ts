/**
 * Upload Security — client + server side validation
 * Magic bytes check, MIME validation, size limits
 */

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type AllowedMime = typeof ALLOWED_MIME_TYPES[number]

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024  // 2 MB
export const MAX_COVER_BYTES  = 5 * 1024 * 1024  // 5 MB
export const MAX_BANNER_BYTES = 5 * 1024 * 1024  // 5 MB

// Magic byte signatures
const MAGIC: Record<AllowedMime, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png':  [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
}

export type UploadPurpose = 'avatar' | 'cover' | 'banner'

// ── CLIENT SIDE ───────────────────────────────────────────

/**
 * Validates a file by reading its actual magic bytes (first 8 bytes).
 * Works in browser — returns a Promise.
 * Catches renamed files (e.g. PDF renamed to .png).
 */
export async function validateImageClient(
  file: File,
  purpose: UploadPurpose = 'avatar'
): Promise<{ ok: true; ext: string } | { ok: false; error: string }> {
  const maxBytes =
    purpose === 'avatar' ? MAX_AVATAR_BYTES :
    purpose === 'banner' ? MAX_BANNER_BYTES :
    MAX_COVER_BYTES

  if (file.size === 0)
    return { ok: false, error: 'Dosya boş.' }

  if (file.size > maxBytes)
    return { ok: false, error: `Dosya ${(maxBytes / 1024 / 1024).toFixed(0)} MB'dan küçük olmalı.` }

  // Read first 8 bytes for magic byte check
  const slice  = file.slice(0, 8)
  const buffer = await slice.arrayBuffer()
  const bytes  = new Uint8Array(buffer)

  const detectedMime = detectMimeFromBytes(bytes)

  if (!detectedMime)
    return { ok: false, error: 'Lütfen geçerli bir görsel dosyası seçin (JPEG, PNG veya WebP).' }

  const ext = detectedMime === 'image/jpeg' ? 'jpg'
            : detectedMime === 'image/png'  ? 'png'
            : 'webp'

  return { ok: true, ext }
}

function detectMimeFromBytes(bytes: Uint8Array): AllowedMime | null {
  for (const mime of Object.keys(MAGIC) as AllowedMime[]) {
    const sigs = MAGIC[mime]
    for (const sig of sigs) {
      if (sig.every((b, i) => bytes[i] === b)) return mime
    }
  }
  return null
}

// ── SERVER SIDE ───────────────────────────────────────────

/**
 * Server-side magic bytes check on an ArrayBuffer.
 */
export function verifyMagicBytes(buffer: ArrayBuffer, claimedMime: string): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 12))
  const sigs  = MAGIC[claimedMime as AllowedMime]
  if (!sigs) return false
  return sigs.some(sig => sig.every((b, i) => bytes[i] === b))
}

/**
 * Generate safe storage path.
 */
export function buildSafeStoragePath(
  userId: string,
  purpose: UploadPurpose,
  mimeType: string
): string {
  const safeId = userId.replace(/[^a-zA-Z0-9\-]/g, '')
  const ext    = mimeType === 'image/jpeg' ? 'jpg'
               : mimeType === 'image/png'  ? 'png'
               : 'webp'
  return `${safeId}/${purpose}_${Date.now()}.${ext}`
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-\s]/g, '').replace(/\.\./g, '').slice(0, 100).trim()
}
