'use client'

import { validateImageClient, UploadPurpose } from '@/lib/upload-security'

/**
 * Shared image upload validator — use in avatar, banner, cover inputs.
 * Checks magic bytes client-side before sending to server.
 */
export async function validateAndPreview(
  file: File,
  purpose: UploadPurpose,
  onSuccess: (previewUrl: string, file: File) => void,
  onError: (msg: string) => void
) {
  const result = await validateImageClient(file, purpose)

  if (!result.ok) {
    onError(result.error)
    return
  }

  const previewUrl = URL.createObjectURL(file)
  onSuccess(previewUrl, file)
}
