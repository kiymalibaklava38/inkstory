import { z } from 'zod'

// ── Shared primitives ─────────────────────────────────────

const username = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-z0-9_]+$/, 'Username may only contain lowercase letters, numbers, and underscores')

const displayName = z
  .string()
  .max(60, 'Display name must be at most 60 characters')
  .optional()
  .nullable()

const bio = z
  .string()
  .max(300, 'Bio must be at most 300 characters')
  .optional()
  .nullable()

const website = z
  .string()
  .url('Must be a valid URL')
  .max(200)
  .optional()
  .nullable()
  .or(z.literal(''))
  .transform(v => v === '' ? null : v)

const storyTitle = z
  .string()
  .min(1, 'Title is required')
  .max(200, 'Title must be at most 200 characters')
  .trim()

const storyDescription = z
  .string()
  .max(1000, 'Description must be at most 1000 characters')
  .optional()
  .nullable()

const chapterTitle = z
  .string()
  .min(1, 'Chapter title is required')
  .max(200, 'Chapter title must be at most 200 characters')
  .trim()

// HTML content from TipTap – max 200KB to prevent payload bombs
const htmlContent = z
  .string()
  .max(200_000, 'Chapter content is too large (max 200KB)')
  .default('')

const commentText = z
  .string()
  .min(1, 'Comment cannot be empty')
  .max(2000, 'Comment must be at most 2000 characters')
  .trim()

// ── Auth schemas ──────────────────────────────────────────

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address').max(254),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  username,
  displayName,
})

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address').max(254),
  password: z.string().min(1, 'Password is required').max(128),
})

// ── Story schemas ─────────────────────────────────────────

export const CreateStorySchema = z.object({
  title:       storyTitle,
  description: storyDescription,
  categoryId:  z.string().regex(/^\d+$/, 'Invalid category').optional().nullable(),
  tags: z
    .string()
    .max(200, 'Tags string too long')
    .optional()
    .default(''),
  status: z.enum(['draft', 'published']).default('draft'),
})

export const UpdateStorySchema = z.object({
  title:       storyTitle.optional(),
  description: storyDescription,
  categoryId:  z.string().regex(/^\d+$/).optional().nullable(),
  tags:        z.string().max(200).optional(),
  status:      z.enum(['taslak', 'yayinda', 'tamamlandi']).optional(),
})

// ── Chapter schemas ───────────────────────────────────────

export const CreateChapterSchema = z.object({
  storyId: z.string().uuid('Invalid story ID'),
  title:   chapterTitle,
  content: htmlContent,
  publish: z.boolean().default(false),
})

export const UpdateChapterSchema = z.object({
  title:   chapterTitle,
  content: htmlContent,
  publish: z.boolean().default(false),
})

// ── Comment schema ────────────────────────────────────────

export const CommentSchema = z.object({
  storyId:   z.string().uuid('Invalid story ID'),
  chapterId: z.string().uuid().optional().nullable(),
  content:   commentText,
  parentId:  z.string().uuid().optional().nullable(),
})

// ── Profile schema ────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  username,
  displayName,
  bio,
  website,
})

// ── AI Writing schema ─────────────────────────────────────

export const AiWriteSchema = z.object({
  action: z.enum([
    'continue', 'improve', 'emotional', 'dialogue',
    'descriptive', 'plot_twist', 'next_chapter',
  ]),
  text: z
    .string()
    .min(10, 'Please write at least a few words before using AI assistance')
    .max(10_000, 'Text is too long for AI processing'),
  storyTitle: z
    .string()
    .max(200)
    .optional()
    .nullable(),
})

// ── File upload schema ────────────────────────────────────

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_AVATAR_SIZE  = 2 * 1024 * 1024   // 2 MB
export const MAX_COVER_SIZE   = 5 * 1024 * 1024   // 5 MB

export function validateImageUpload(
  file: File,
  maxSize: number = MAX_AVATAR_SIZE
): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
    return { ok: false, error: 'Only JPEG, PNG, and WebP images are allowed.' }
  }
  if (file.size > maxSize) {
    const mb = (maxSize / 1024 / 1024).toFixed(0)
    return { ok: false, error: `File size must be under ${mb}MB.` }
  }
  return { ok: true }
}

// ── Helper ────────────────────────────────────────────────

/** Parse a Zod schema and return a user-friendly first error message, or null on success. */
export function parseOrError<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { data: T; error: null } | { data: null; error: string } {
  const result = schema.safeParse(data)
  if (result.success) return { data: result.data, error: null }
  const first = result.error.errors[0]
  return { data: null, error: first?.message ?? 'Validation error' }
}
