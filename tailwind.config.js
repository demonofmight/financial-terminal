/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Modern Dark Theme
        terminal: {
          bg: '#000000',           // Pure black background
          card: '#0a0a0a',         // Near black cards
          'card-hover': '#111111', // Hover state
          border: '#1a1a1a',       // Subtle borders
        },
        // Muted accent colors (professional, not neon)
        accent: {
          green: '#22c55e',        // Positive values
          red: '#ef4444',          // Negative values
          amber: '#f59e0b',        // Warning/neutral
          blue: '#3b82f6',         // Info/links
          cyan: '#06b6d4',         // Secondary accent
          purple: '#8b5cf6',       // Special highlights
        },
        // Legacy neon aliases for backwards compatibility
        neon: {
          green: '#22c55e',
          'green-dim': '#16a34a',
          red: '#ef4444',
          'red-dim': '#dc2626',
          amber: '#f59e0b',
          cyan: '#06b6d4',
          purple: '#8b5cf6',
        },
        // Text colors
        text: {
          primary: '#e5e5e5',
          secondary: '#a3a3a3',
          muted: '#737373',
          dim: '#525252',
        },
        gray: {
          850: '#18181b',
          950: '#09090b',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Share Tech Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.2s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
