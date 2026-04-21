/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Geist',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        mono: [
          '"Geist Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      colors: {
        ink: {
          0: '#0a0a0b',
          50: '#121214',
          100: '#17171a',
          200: '#1c1c20',
          300: '#26262b',
        },
      },
      boxShadow: {
        // Premium depth: inset top highlight + soft ambient drop
        depth:
          '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 40px -20px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(20,184,166,0.3), 0 0 40px -5px rgba(20,184,166,0.4)',
        'glow-soft': '0 0 32px -8px rgba(20,184,166,0.35)',
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
