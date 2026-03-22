'use client'

import { BadgeCheck } from 'lucide-react'

interface Props {
  size?: number
  badge?: string // 'author' | 'editor' | 'staff'
  className?: string
}

const BADGE_COLORS: Record<string, string> = {
  author: '#d4840f',  // amber — default
  editor: '#5ba3d9',  // blue
  staff:  '#7c5cbf',  // purple
}

export function VerifiedBadge({ size = 16, badge = 'author', className = '' }: Props) {
  const color = BADGE_COLORS[badge] || BADGE_COLORS.author

  return (
    <span
      title={badge === 'staff' ? 'InkStory Ekibi' : badge === 'editor' ? 'Editör' : 'Doğrulanmış Yazar'}
      className={`inline-flex flex-shrink-0 ${className}`}
      style={{ color }}
    >
      <BadgeCheck style={{ width: size, height: size }} fill={color} color="white" />
    </span>
  )
}
