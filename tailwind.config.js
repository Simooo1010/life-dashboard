/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'media',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        // Warm neutral palette — calm, editorial
        canvas: {
          DEFAULT: '#F7F5F2',
          dark: '#18171A',
        },
        surface: {
          DEFAULT: '#EEEBE6',
          dark: '#222027',
        },
        border: {
          DEFAULT: '#DDD9D2',
          dark: '#2E2C33',
        },
        ink: {
          DEFAULT: '#1A1816',
          muted: '#6B6560',
          faint: '#A09B95',
          dark: '#F0EDE8',
          'muted-dark': '#9D9AA2',
          'faint-dark': '#5E5C65',
        },
        accent: {
          DEFAULT: '#C9671A',   // warm amber — primary action
          soft: '#F5E6D6',     // accent tint for light
          'soft-dark': '#3A2314',
        },
        semantic: {
          school: '#3B6FD4',   // blue — academic
          sport: '#2F9E5E',    // green — volleyball/sport
          health: '#D44B7A',   // rose — health
          finance: '#7C4DBC',  // purple — money
          newsletter: '#D4891A', // amber — newsletter
          inbox: '#6B7280',   // gray — inbox/other
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
