/**
 * Server-side file upload security.
 *
 * Validates:
 * - MIME type (from Content-Type header AND magic bytes)
 * - File size limits
 * - Filename sanitisation
 * - Path traversal prevention
 */

// Magic byte signatures for allowed image types
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png':  [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header (WebP)
}

const ALLOWED_MIME_TYPES = Object.keys(MAGIC_BYTES)
const MAX_AVATAR_BYTES   = 2 * 1024 * 1024   //  2 MB
const MAX_COVER_BYTES    = 5 * 1024 * 1024   //  5 MB

export interface UploadValidationResult {
  ok: true
  ext: string
  safeFilename: string
} | {
  ok: false
  error: string
}

/**
 * Validate an image File object client-side (type, size, name).
 * A second check using magic bytes runs server-side.
 */
export function validateImageClient(
  file: File,
  purpose: 'avatar' | 'cover' = 'avatar'
): UploadValidationResult {
  const maxBytes = purpose === 'avatar' ? MAX_AVATAR_BYTES : MAX_COVER_BYTES

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { ok: false, error: 'Only JPEG, PNG, and WebP images are allowed.' }
  }

  if (file.size > maxBytes) {
    const mb = (maxBytes / 1024 / 1024).toFixed(0)
    return { ok: false, error: `Image must be smaller than ${mb} MB.` }
  }

  if (file.size === 0) {
    return { ok: false, error: 'File is empty.' }
  }

  const ext = file.type === 'image/jpeg' ? 'jpg'
            : file.type === 'image/png'  ? 'png'
            : 'webp'

  const safeFilename = `upload.${ext}`
  return { ok: true, ext, safeFilename }
}

/**
 * Server-side: read magic bytes from an ArrayBuffer to verify true file type.
 * Called inside API routes after receiving the file buffer.
 */
export function verifyMagicBytes(buffer: ArrayBuffer, claimedMime: string): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 12))
  const signatures = MAGIC_BYTES[claimedMime]
  if (!signatures) return false

  return signatures.some(sig =>
    sig.every((byte, i) => bytes[i] === byte)
  )
}

/**
 * Generate a safe storage path for a user upload.
 * Prevents path traversal and filename injection.
 *
 * @param userId   - Supabase user UUID (already trusted)
 * @param purpose  - 'avatar' | 'cover'
 * @param mimeType - validated MIME type
 */
export function buildSafeStoragePath(
  userId: string,
  purpose: 'avatar' | 'cover',
  mimeType: string
): string {
  // Sanitize userId — should already be a UUID but be explicit
  const safeUserId = userId.replace(/[^a-zA-Z0-9\-]/g, '')
  const ext = mimeType === 'image/jpeg' ? 'jpg'
            : mimeType === 'image/png'  ? 'png'
            : 'webp'

  const timestamp = Date.now()
  return `${safeUserId}/${purpose}_${timestamp}.${ext}`
}

/**
 * Sanitize a user-provided filename for display only (never for storage paths).
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._\-\s]/g, '')   // strip special chars
    .replace(/\.\./g, '')                   // prevent path traversal
    .slice(0, 100)                          // max length
    .trim()
}
