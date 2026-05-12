/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Tajawal', 'sans-serif'],
        display: ['Outfit', 'Tajawal', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#6366f1', // Indigo (Stripe/SaaS style)
          light: '#818cf8',
          dark: '#4f46e5',
        },
        secondary: {
          DEFAULT: '#f97316', // Orange as secondary accent
          light: '#fb923c',
          dark: '#ea580c',
        },
        navy: {
          DEFAULT: '#111827', // Crisp dark gray/black (Apple style)
          light: '#1f2937',
          dark: '#030712',
        },
        slate: {
          50: '#fcfcfd', // Slightly warmer, extremely light gray
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        success: '#10b981',
        danger: '#ef4444',
      },
      boxShadow: {
        'premium': '0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -1px rgba(0, 0, 0, 0.02)', // Softer, more diffused
        'premium-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)', // Subtle elevation
      }
    },
  },
  plugins: [],
}
