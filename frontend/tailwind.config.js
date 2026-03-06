/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand colors - dark theme (default)
        'brand-bg': '#0D091F',
        'brand-surface': '#191333',
        'brand-primary': '#FFFFFF',
        'brand-secondary': '#A9A2C2',
        'brand-accent': '#C056F0',
        'brand-accent-hover': '#a845d0',
        // Logo color system
        'logo-purple': '#9333EA',
        'logo-purple-deep': '#7C3AED',
        'logo-purple-bright': '#C056F0',
        'logo-pink': '#EC4899',
        'logo-yellow': '#F5E04E',
        'logo-dark': '#0B0B10',
        // Shared colors for both themes
        'card-light-bg': '#FFFFFF',
        'card-light-text-primary': '#111827',
        'card-light-text-secondary': '#6B7280',
        'tag-green-bg': '#E0F2F1',
        'tag-green-text': '#0D9488',
        'badge-pink-bg': '#F472B6',
        'badge-purple-start': '#A855F7',
        'badge-purple-end': '#D946EF',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Sora', 'sans-serif'],
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0, transform: 'translateY(10px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        popIn: {
          '0%': { transform: 'scale(0.95)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 }
        },
        cartBump: {
          '0%, 100%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(0.9)' },
          '50%': { transform: 'scale(1.2)' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 }
        },
        dropdownIn: {
          '0%': { transform: 'translateY(-10px) scale(0.95)', opacity: 0 },
          '100%': { transform: 'translateY(0) scale(1)', opacity: 1 }
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-in-out forwards',
        popIn: 'popIn 0.3s ease-out forwards',
        cartBump: 'cartBump 0.4s ease-in-out',
        slideInLeft: 'slideInLeft 0.3s ease-out forwards',
        dropdownIn: 'dropdownIn 0.2s ease-out forwards',
      },
      backgroundImage: {
        'footer-dots': 'radial-gradient(circle at center, rgba(169, 162, 194, 0.08) 1px, transparent 1px)',
      },
      backgroundSize: {
        'footer-dots': '20px 20px',
      },
    },
  },
  plugins: [],
}

