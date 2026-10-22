/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        veritas: {
          navy: "#0E1726",
          navyLight: "#1E293B",
          navyBorder: "#334155",
          amber: "#F2B84B",
          amberLight: "#FEF3C7",
          amberDark: "#B45309",
          green: "#10B981",
          greenLight: "#D1FAE5",
          red: "#EF4444",
          redLight: "#FEE2E2",
          slate: "#64748B",
          bg: "#F8FAFC",
          card: "#FFFFFF"
        }
      },
      fontSize: {
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }], // 16px minimum projector resolution
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      }
    },
  },
  plugins: [],
}
