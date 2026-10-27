/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0D9488', // Teal 600 (VECDIM clinical primary)
          primaryDark: '#0F766E',
          primaryLight: '#CCFBF1',
          dark: '#0F172A', // Slate 900
          slate: '#334155',
          muted: '#64748B',
          surface: '#F8FAFC', // Slate 50 canvas
          card: '#FFFFFF',
          border: '#E2E8F0',
        },
        who: {
          susceptible: '#10B981', // >= 98%
          susceptibleLight: '#D1FAE5',
          possible: '#F59E0B', // 90% - 97.9%
          possibleLight: '#FEF3C7',
          resistant: '#EF4444', // < 90%
          resistantLight: '#FEE2E2',
        },
        gps: {
          high: '#10B981', // <= 10m
          moderate: '#F59E0B', // 10.1m - 50m
          low: '#EF4444', // > 50m
          signal: '#0284C7',
        },
      },
      fontFamily: {
        sans: ['Inter-Regular', 'system-ui', 'sans-serif'],
        'inter-medium': ['Inter-Medium', 'system-ui', 'sans-serif'],
        'inter-semibold': ['Inter-SemiBold', 'system-ui', 'sans-serif'],
        'inter-bold': ['Inter-Bold', 'system-ui', 'sans-serif'],
        bricolage: ['BricolageGrotesque-Bold', 'system-ui', 'sans-serif'],
        'bricolage-regular': ['BricolageGrotesque-Regular', 'system-ui', 'sans-serif'],
        'bricolage-semibold': ['BricolageGrotesque-SemiBold', 'system-ui', 'sans-serif'],
        'bricolage-bold': ['BricolageGrotesque-Bold', 'system-ui', 'sans-serif'],
        'bricolage-extrabold': ['BricolageGrotesque-ExtraBold', 'system-ui', 'sans-serif'],
        mono: ['Courier New', 'Courier', 'monospace'],
      },
    },
  },
  plugins: [],
};
