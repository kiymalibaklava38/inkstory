// ── Tam kategori listesi ──────────────────────────────────
export interface Category {
  slug:    string
  tr:      string
  en:      string
  ikon:    string
  renk:    string
  group:   'genre' | 'literary'
}

export const ALL_CATEGORIES: Category[] = [
  // Türler
  { slug: 'romantik',        tr: 'Romantik',        en: 'Romance',         ikon: '💕', renk: '#e11d48', group: 'genre' },
  { slug: 'fantastik',       tr: 'Fantastik',        en: 'Fantasy',         ikon: '🧙', renk: '#7c3aed', group: 'genre' },
  { slug: 'korku',           tr: 'Korku',            en: 'Horror',          ikon: '👻', renk: '#1e293b', group: 'genre' },
  { slug: 'gizem',           tr: 'Gizem',            en: 'Mystery',         ikon: '🔍', renk: '#0d9488', group: 'genre' },
  { slug: 'bilim-kurgu',     tr: 'Bilim Kurgu',      en: 'Sci-Fi',          ikon: '🚀', renk: '#0369a1', group: 'genre' },
  { slug: 'macera',          tr: 'Macera',           en: 'Adventure',       ikon: '⚔️', renk: '#d97706', group: 'genre' },
  { slug: 'dram',            tr: 'Dram',             en: 'Drama',           ikon: '🎭', renk: '#9f1239', group: 'genre' },
  { slug: 'polisiye',        tr: 'Polisiye',         en: 'Detective',       ikon: '🕵️', renk: '#374151', group: 'genre' },
  { slug: 'gerilim',         tr: 'Gerilim',          en: 'Thriller',        ikon: '😰', renk: '#7f1d1d', group: 'genre' },
  { slug: 'mizah',           tr: 'Mizah',            en: 'Comedy',          ikon: '😄', renk: '#ca8a04', group: 'genre' },
  { slug: 'genclik',         tr: 'Gençlik',          en: 'Youth',           ikon: '🌱', renk: '#16a34a', group: 'genre' },
  // Edebi / Özel
  { slug: 'siir',            tr: 'Şiir',             en: 'Poetry',          ikon: '✍️', renk: '#9333ea', group: 'literary' },
  { slug: 'tarihi',          tr: 'Tarihi',           en: 'Historical',      ikon: '🏛️', renk: '#92400e', group: 'literary' },
  { slug: 'klasik-romanlar', tr: 'Klasik Romanlar',  en: 'Classic Novels',  ikon: '📜', renk: '#78350f', group: 'literary' },
  { slug: 'psikolojik',      tr: 'Psikolojik',       en: 'Psychological',   ikon: '🧠', renk: '#4c1d95', group: 'literary' },
  { slug: 'distopya',        tr: 'Distopya',         en: 'Dystopia',        ikon: '🌑', renk: '#1f2937', group: 'literary' },
  { slug: 'deneme',          tr: 'Deneme',           en: 'Essay',           ikon: '📝', renk: '#065f46', group: 'literary' },
  { slug: 'fanfiction',      tr: 'Fanfiction',       en: 'Fanfiction',      ikon: '⭐', renk: '#be185d', group: 'literary' },
  { slug: 'kisa-hikaye',     tr: 'Kısa Hikaye',      en: 'Short Story',     ikon: '📖', renk: '#0f766e', group: 'literary' },
]

export function getCategoryBySlug(slug: string): Category | undefined {
  return ALL_CATEGORIES.find(c => c.slug === slug)
}

export function getCategoryName(slug: string, lang: 'tr' | 'en'): string {
  const cat = getCategoryBySlug(slug)
  return cat ? cat[lang] : slug
}

export const GENRE_CATEGORIES    = ALL_CATEGORIES.filter(c => c.group === 'genre')
export const LITERARY_CATEGORIES = ALL_CATEGORIES.filter(c => c.group === 'literary')
