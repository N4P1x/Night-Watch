/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Night-Watch SOC console — flat, dense, no gradients
        night: {
          950: '#0B0E13', // app bg
          900: '#11151C', // panel
          850: '#161B24', // raised panel
          800: '#1B2130', // hover / input
          700: '#232B38', // border-strong / muted bg
          600: '#2E3849', // border-strongest
        },
        ink: {
          100: '#E6EBF2', // primary text
          400: '#8A94A6', // secondary
          500: '#6B7688', // tertiary
        },
        brand: {
          DEFAULT: '#F0A832', // lantern amber — primary actions only
          dim: '#8A6420',
        },
        sev: {
          critical: '#FF5C5C',
          high: '#FF9F43',
          medium: '#EACD3B',
          low: '#3DDC97',
        },
        // Back-compat aliases — old classes keep working, mapped to new palette
        dark: {
          900: '#0B0E13',
          800: '#11151C',
          700: '#161B24',
          600: '#232B38',
          500: '#2E3849',
          400: '#3A465C',
          300: '#4A5872',
        },
        accent: {
          primary: '#F0A832',
          secondary: '#8A94A6',
          success: '#3DDC97',
          warning: '#EACD3B',
          danger: '#FF5C5C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        micro: ['11px', { lineHeight: '16px', letterSpacing: '0.08em' }],
      },
      boxShadow: {
        none: 'none',
        panel: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -16px rgba(0,0,0,0.8)',
      },
      borderRadius: {
        md: '10px',
        lg: '12px',
      },
    },
  },
  plugins: [],
}
