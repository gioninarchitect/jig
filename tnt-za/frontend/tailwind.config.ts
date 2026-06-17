import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Origin design system
        primary: '#C9A84C',        // or-gold
        'primary-light': '#D4B86A', // or-gold-bright
        'primary-dark': '#8B6914',  // or-gold-muted
        'primary-pale': '#E8D5A3',  // or-gold-light
        dark: '#0A0A0A',            // or-black
        'dark-2': '#141414',        // or-dark
        'dark-3': '#1C1C1C',        // or-dark-2
        accent: '#1C1C1C',
        'or-black': '#0A0A0A',
        'or-gold': '#C9A84C',
        'or-gold-muted': '#8B6914',
        'or-gold-bright': '#D4B86A',
        'or-gold-light': '#E8D5A3',
        'or-dark': '#141414',
        'or-dark-2': '#1C1C1C',
        'or-white': '#F5F0E8',
        'or-grey-2': '#A89F8C',
        danger: '#DC2626',
        warning: '#F8C242',
        success: '#22C55E',
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
