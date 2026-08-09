/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#05070c',
          card: '#0f131c',
          cardHover: '#182030',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        syne: ['Syne', 'sans-serif'],
        grotesk: ['"Space Grotesk"', 'sans-serif'],
        script: ['Satisfy', 'cursive'],
        vibes: ['"Great Vibes"', 'cursive'],
        serif: ['"Playfair Display"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      transitionTimingFunction: {
        'fluid': 'cubic-bezier(0.32, 0.72, 0, 1)',
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      animation: {
        'radar-pulse': 'radarPulse 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        'status-blink': 'statusBlink 1.5s ease-in-out infinite alternate',
      },
      keyframes: {
        radarPulse: {
          '0%': { transform: 'scale(0.85)', opacity: '0.8' },
          '100%': { transform: 'scale(1.4)', opacity: '0' },
        },
        statusBlink: {
          '0%': { opacity: '0.4' },
          '100%': { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
