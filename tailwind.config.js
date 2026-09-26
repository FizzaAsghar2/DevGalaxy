/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: {
          900: '#04060f',
          800: '#070b1a',
          700: '#0b1026',
          600: '#111936',
        },
        nebula: {
          violet: '#8b5cf6',
          indigo: '#6366f1',
          cyan: '#22d3ee',
          magenta: '#e879f9',
        },
        category: {
          pages: '#a78bfa',
          features: '#60a5fa',
          database: '#34d399',
          apis: '#fb923c',
          users: '#f87171',
          frontend: '#fbbf24',
          backend: '#38bdf8',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(139, 92, 246, 0.6)',
        'glow-sm': '0 0 20px -6px rgba(139, 92, 246, 0.55)',
        panel: '0 24px 60px -20px rgba(0, 0, 0, 0.9)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.04)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
        'float-slow': 'float-slow 7s ease-in-out infinite',
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 2.4s linear infinite',
      },
    },
  },
  plugins: [],
}
