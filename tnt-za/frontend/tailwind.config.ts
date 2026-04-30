import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#C9A84C',
        'primary-light': '#D4B96A',
        'primary-dark': '#A88B3D',
        dark: '#0A0A0A',
        'dark-2': '#141414',
        accent: '#1A1A1A',
        danger: '#DC3545',
        warning: '#E8A317',
        success: '#198754',
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
