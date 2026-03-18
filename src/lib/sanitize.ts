/**
 * Sanitizes HTML from TipTap before storing to DB or rendering.
 * Uses isomorphic-dompurify so it works in both Node.js and browser.
 *
 * Allows only safe story-writing tags; strips scripts, iframes, onclick, etc.
 */

// We use a dynamic require so this module is SSR-safe without top-level
// window/document references during module parse.

let _purify: any = null

function getPurify() {
  if (_purify) return _purify
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const createDOMPurify = require('isomorphic-dompurify')
  _purify = createDOMPurify
  return _purify
}

/** Tags allowed in story/chapter HTML */
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's',
  'h1', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li',
  'blockquote', 'hr',
  'span', 'a',
]

/** Attributes allowed on specific tags */
const ALLOWED_ATTR = ['href', 'target', 'rel', 'class']

/** Options passed to DOMPurify */
const PURIFY_CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  // Force all links to open in new tab safely
  ADD_ATTR: ['target'],
  // Strip any data: or javascript: URIs
  FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
  // Don't allow SVG or MathML
  USE_PROFILES: { html: true },
}

/**
 * Sanitize user-generated HTML content (TipTap output).
 * Safe to call server-side and client-side.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') return ''

  const DOMPurify = getPurify()
  const clean = DOMPurify.sanitize(dirty, PURIFY_CONFIG)

  // Force noopener/noreferrer on all links
  return clean.replace(/<a\s/gi, '<a rel="noopener noreferrer" target="_blank" ')
}

/**
 * Strip ALL HTML tags — for plain text contexts (search indexing, previews, etc.)
 */
export function stripHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Escape special characters to prevent XSS in plain text rendered contexts.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
