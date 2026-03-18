interface Props {
  size?: number
  className?: string
}

export function InkLogo({ size = 32, className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
    >
      {/* Hexagonal ink drop base */}
      <path
        d="M16 2L28 9V23L16 30L4 23V9L16 2Z"
        fill="url(#logoBase)"
        opacity="0.12"
      />
      {/* Pen nib shape */}
      <path
        d="M16 5L10 17L16 14L22 17L16 5Z"
        fill="url(#logoNib)"
      />
      {/* Ink drop stem */}
      <path
        d="M16 14L16 25"
        stroke="url(#logoNib)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Ink drop at bottom */}
      <circle cx="16" cy="26" r="1.5" fill="url(#logoNib)" />
      {/* Highlight on nib */}
      <path
        d="M16 8L19 15"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="logoBase" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d4840f"/>
          <stop offset="1" stopColor="#f0c040"/>
        </linearGradient>
        <linearGradient id="logoNib" x1="10" y1="5" x2="22" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e8a030"/>
          <stop offset="1" stopColor="#f5c842"/>
        </linearGradient>
      </defs>
    </svg>
  )
}
