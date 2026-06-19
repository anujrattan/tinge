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
        // ── Tinge Design System ──────────────────────────────────────────
        //
        // Brand direction: retro escapism · tropical sunsets · cinematic
        // outdoors · wearable art · modern streetwear
        //
        // Core palette:  coral #FF7A59  |  gold #FFC371
        //                ink   #1E1B22  |  cream #F7F3EA  |  sky #5DA9E9

        // PRIMARY BRAND COLOURS
        'brand-coral':        '#FF7A59',   // Sunset coral — primary CTA & key highlights
        'brand-coral-hover':  '#FF5E62',   // Hotter pressed/hover coral
        'brand-gold':         '#FFC371',   // Golden amber — gradient pair, stars, highlights
        'brand-sky':          '#5DA9E9',   // Sky/ocean blue — links, info, badges, cool contrast
        'brand-sky-hover':    '#4A94D5',   // Sky hover / active
        'brand-cream':        '#F7F3EA',   // Warm cream — hero text, light-mode base text
        'brand-ink':          '#1E1B22',   // Deep warm near-black — primary text on light bg

        // BACKWARD-COMPATIBLE ACCENT ALIAS  (brand-accent → coral)
        'brand-accent':       '#FF7A59',
        'brand-accent-hover': '#FF5E62',

        // DARK MODE SURFACES — warm espresso / charcoal
        'brand-bg':       '#1A1410',   // Page background — dark espresso
        'brand-surface':  '#231E1A',   // Cards, panels, nav — warm charcoal
        'brand-elevated': '#2C2620',   // Modals, popovers — raised surface

        // TEXT TOKENS  (theme-aware via CSS variables)
        'brand-primary':   '#F7F3EA',   // Body text on dark  (warm cream)
        'brand-secondary': '#9E9587',   // Secondary text on dark (warm mid-gray)

        // LOGO TOKENS — updated to warm brand palette
        'logo-purple':        '#FF7A59',   // backward-compat alias → coral
        'logo-purple-deep':   '#E6613E',   // deeper coral
        'logo-purple-bright': '#FF9966',   // lighter warm coral
        'logo-pink':          '#FFC371',   // backward-compat alias → gold
        'logo-yellow':        '#FFD97A',   // warm golden yellow
        'logo-dark':          '#1E1B22',   // warm near-black

        // CARD TOKENS
        'card-light-bg':             '#FFFFFF',
        'card-light-text-primary':   '#1E1B22',   // warm near-black on cards
        'card-light-text-secondary': '#6B6258',   // warm mid-gray on cards

        // STATUS / TAG TOKENS
        'tag-green-bg':      '#E0F2F1',
        'tag-green-text':    '#0D9488',
        'badge-pink-bg':     '#5DA9E9',   // "New" tag — sky blue (was pink; now distinct from coral CTA)
        'badge-purple-start':'#FF7A59',   // gradient badge start — coral
        'badge-purple-end':  '#FFC371',   // gradient badge end — gold

        // SEMANTIC ALIASES (new names, same values)
        'badge-sky-bg':       '#5DA9E9',
        'badge-sunset-start': '#FF7A59',
        'badge-sunset-end':   '#FFC371',
      },
      fontFamily: {
        // DM Sans pairs cleanly with Playfair Display — warm, modern, readable at small sizes
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['Sora', 'sans-serif'],
        playfair: ['"Playfair Display"', 'Georgia', 'serif'],
        grotesk: ['"Space Grotesk"', 'sans-serif'],
        oswald: ['Oswald', 'sans-serif'],
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
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)', opacity: '0.5' },
          '50%': { transform: 'translateY(-18px) scale(1.1)', opacity: '0.8' },
        },
        flicker: {
          '0%, 89%, 91%, 93%, 95%, 100%': { opacity: '1' },
          '90%, 92%, 94%': { opacity: '0.7' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        cinematicZoom: {
          '0%': { transform: 'scale(1) translateX(0px)' },
          '100%': { transform: 'scale(1.06) translateX(-8px)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        fadeInOverlay: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        qtyPop: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.25)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-in-out forwards',
        popIn: 'popIn 0.3s ease-out forwards',
        cartBump: 'cartBump 0.4s ease-in-out',
        slideInLeft: 'slideInLeft 0.3s ease-out forwards',
        dropdownIn: 'dropdownIn 0.2s ease-out forwards',
        float: 'float 7s ease-in-out infinite',
        flicker: 'flicker 8s linear infinite',
        blink: 'blink 1s step-end infinite',
        cinematicZoom: 'cinematicZoom 25s ease-in-out infinite alternate',
        slideInRight: 'slideInRight 0.3s cubic-bezier(0.32,0,0.67,0) forwards',
        slideOutRight: 'slideOutRight 0.3s cubic-bezier(0.33,1,0.68,1) forwards',
        fadeInOverlay: 'fadeInOverlay 0.25s ease forwards',
        qtyPop: 'qtyPop 0.2s ease-out forwards',
      },
      backgroundImage: {
        // Dot pattern — warm gray (was purple-tinted)
        'footer-dots': 'radial-gradient(circle at center, rgba(158, 149, 135, 0.10) 1px, transparent 1px)',
        // Brand gradient utilities
        'brand-sunset':  'linear-gradient(135deg, #FF7A59 0%, #FF5E62 50%, #FFC371 100%)',
        'brand-horizon': 'linear-gradient(180deg, rgba(255,122,89,0.12) 0%, rgba(255,195,113,0.06) 100%)',
        'brand-dawn':    'linear-gradient(180deg, #1A1410 0%, #231E1A 100%)',
      },
      backgroundSize: {
        'footer-dots': '20px 20px',
      },
    },
  },
  plugins: [],
}

