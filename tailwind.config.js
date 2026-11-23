/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Cinzel', 'Georgia', 'serif'],
      },
      colors: {
        tabletop: {
          base: '#110c08',
          wood: '#1c140e',
          elevated: '#261c14',
          parchment: '#efe4cf',
          brass: '#c89b3c',
          terracotta: '#b84a27',
          sea: '#245c7a',
        },
        catan: {
          sea: '#0e4a6f',
          seaDeep: '#082f49',
          parchment: '#fdf6e3',
          gold: '#d97706',
          wood: '#15803d',
          brick: '#b91c1c',
          sheep: '#65a30d',
          wheat: '#eab308',
          ore: '#475569',
          desert: '#d6bc8b',
        }
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.65', transform: 'scale(1.12)' },
        }
      },
      animation: {
        pulseGlow: 'pulseGlow 1.6s ease-in-out infinite',
      }
    },
  },
  plugins: [],
};

