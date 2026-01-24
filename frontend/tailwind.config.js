/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Base layers
        canvas: '#F5F5F4',
        surface: '#FFFFFF',
        // Functional accents
        acid: {
          DEFAULT: '#D9F99D',
          50: '#F7FEE7',
          100: '#ECFCCB',
          200: '#D9F99D',
          300: '#BEF264',
          400: '#A3E635',
          500: '#84CC16',
        },
        alert: '#FCD34D',
        // Legacy primary colors (kept for compatibility)
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      boxShadow: {
        'technical': '0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0,0,0,0.02)',
        'floating': '0 8px 20px -4px rgba(0, 0, 0, 0.1), 0 4px 8px -2px rgba(0, 0, 0, 0.05)',
        'glow': '0 0 15px rgba(217, 249, 157, 0.4)',
        'glow-acid': '0 0 10px rgba(217, 249, 157, 0.3)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      borderRadius: {
        'lg': '0.6rem',
        'xl': '0.8rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
