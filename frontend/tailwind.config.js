/** Night-Watch console tokens — see repo DESIGN.md. Do not invent new accents. */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Linear-ladder surfaces on #010102 canvas. Hierarchy via lift + hairline.
        night: {
          950: '#010102', // canvas
          900: '#0f1011', // panel / raised
          850: '#141516', // wells, selected, hover fill
          800: '#18191a', // deepest wells, table heads
          700: '#23252a', // hairline
          600: '#34343a', // hairline-strong
          500: '#3e3e44', // hairline-tertiary
        },
        ink: {
          100: '#f7f8f8',
          400: '#d0d6e0',
          500: '#8a8f98',
        },
        // THE accent. Brand mark, primary CTA, focus ring, links. Nothing else.
        brand: {
          DEFAULT: '#5e6ad2',
          hover: '#828fff',
        },
        sev: {
          critical: '#f2555a',
          high: '#ff9f43',
          medium: '#e3b008',
          low: '#3ddc97',
        },
        // Back-compat aliases for any stragglers during migration.
        dark: {
          900: '#010102',
          800: '#0f1011',
          700: '#141516',
          600: '#23252a',
          500: '#34343a',
          400: '#3e3e44',
          300: '#4a4a52',
        },
        accent: {
          primary: '#5e6ad2',
          secondary: '#8a8f98',
          success: '#3ddc97',
          warning: '#e3b008',
          danger: '#f2555a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        micro: ['11px', { lineHeight: '16px', letterSpacing: '0.08em' }],
      },
      borderRadius: {
        md: '8px', // buttons, inputs
        lg: '12px', // panels, cards
      },
    },
  },
  plugins: [],
}
