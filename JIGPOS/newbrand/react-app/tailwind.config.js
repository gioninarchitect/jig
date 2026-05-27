/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        'or-black': '#0E0E0E',
        'origin-slate': {
          DEFAULT: '#1A1A1A',
          light: '#222222',
          mid: '#3A3A3A',
        },
        'or-gold': {
          DEFAULT: '#C9A84C',
          dark: '#8B6914',
          light: '#F8C242',
        },
        'origin-gold': {
          DEFAULT: '#C9A84C',
          dark: '#8B6914',
          light: '#D4B96A',
        },
        'origin-red': {
          DEFAULT: '#DC2626',
          dark: '#B91C1C',
        },
        'origin-cream': '#F5F0E8',
        success: '#22C55E',
        warning: '#F8C242',
        error: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        heading: ['Barlow Condensed', 'sans-serif'],
        accent: ['Barlow Condensed', 'sans-serif'],
        body: ['Barlow', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
