/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#0a0a0f',
          card: '#12131a',
          border: '#1e2028',
          'border-glow': '#00ff8820',
        },
        neon: {
          green: '#00ff88',
          'green-dim': '#00cc6a',
          red: '#ff3366',
          'red-dim': '#cc2952',
          amber: '#ffb000',
          cyan: '#00d4ff',
          purple: '#a855f7',
        },
        gray: {
          850: '#1a1b23',
          950: '#0d0e12',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Share Tech Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scanline': 'scanline 8s linear infinite',
        'flicker': 'flicker 0.15s infinite',
        'data-stream': 'dataStream 20s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00ff8840, 0 0 10px #00ff8820' },
          '100%': { boxShadow: '0 0 10px #00ff8860, 0 0 20px #00ff8830, 0 0 30px #00ff8810' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.95' },
        },
        dataStream: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '0% 100%' },
        },
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(#1e202810 1px, transparent 1px),
                         linear-gradient(90deg, #1e202810 1px, transparent 1px)`,
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      backgroundSize: {
        'grid': '20px 20px',
      },
    },
  },
  plugins: [],
}
