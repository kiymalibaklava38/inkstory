import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans:    ['"Cabinet Grotesk"', '"DM Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
        reading: ['"Lora"', 'Georgia', 'serif'],
      },
      colors: {
        // InkStory brand
        ink: {
          50:  '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
          950: '#060d18',
        },
        nib: {
          50:  '#fdf6ec',
          100: '#faebd4',
          200: '#f5d5a3',
          300: '#efbc6b',
          400: '#e8a030',
          500: '#d4840f',
          600: '#b8680b',
          700: '#924f0e',
          800: '#773f13',
          900: '#623514',
        },
        // Reading mode
        sepia: {
          bg:   '#f8f4ed',
          text: '#3d2b1f',
          muted:'#8c6d5a',
        },
      },
      backgroundImage: {
        'ink-gradient':    'linear-gradient(135deg, #060d18 0%, #1a2f4a 50%, #0d1f33 100%)',
        'nib-gradient':    'linear-gradient(135deg, #d4840f, #e8a030)',
        'hero-mesh':       'radial-gradient(ellipse at 20% 50%, rgba(100,160,220,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(212,132,15,0.12) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(6,13,24,0.8) 0%, transparent 70%)',
      },
      boxShadow: {
        'nib':    '0 0 40px rgba(212,132,15,0.2)',
        'card':   '0 4px 24px rgba(6,13,24,0.08)',
        'card-hover': '0 12px 40px rgba(6,13,24,0.15)',
        'glow':   '0 0 60px rgba(100,160,220,0.15)',
      },
      animation: {
        'fade-up':    'fadeUp 0.5s ease forwards',
        'fade-in':    'fadeIn 0.3s ease forwards',
        'shimmer':    'shimmer 1.5s infinite',
        'pulse-nib':  'pulseNib 2s ease-in-out infinite',
        'typewriter': 'typewriter 0.05s steps(1) forwards',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseNib: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(212,132,15,0.3)' },
          '50%':      { boxShadow: '0 0 40px rgba(212,132,15,0.6)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
