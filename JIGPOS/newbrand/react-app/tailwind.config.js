/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        'jig-black': '#0A0A0A',
        'jig-slate': {
          DEFAULT: '#1E1E1E',
          light: '#2A2A2A',
          mid: '#3A3A3A',
        },
        'jig-purple': {
          DEFAULT: '#7C3AED',
          dark: '#6D28D9',
          light: '#8B5CF6',
        },
        'jig-amber': {
          DEFAULT: '#D97706',
          dark: '#B45309',
          light: '#F59E0B',
        },
        'jig-green': {
          DEFAULT: '#15803D',
          dark: '#166534',
          light: '#22C55E',
        },
        'jig-red': {
          DEFAULT: '#DC2626',
          dark: '#B91C1C',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        heading: ['Anton', 'sans-serif'],
        accent: ['Oswald', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
