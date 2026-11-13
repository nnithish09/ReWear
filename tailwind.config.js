/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#FAF7F2',
        cream: '#F3EDE3',
        sand: '#E8DFD0',
        line: '#E3DACB',
        ink: '#2B2926',
        muted: '#6F6A62',
        clay: { DEFAULT: '#B5754F', dark: '#9A603E', soft: '#F1DFD2' },
        sage: { DEFAULT: '#8FA68A', soft: '#E3EBDF' },
        blush: { DEFAULT: '#D9A5A0', soft: '#F6E4E1' },
        mist: { DEFAULT: '#7F9DB0', soft: '#E2EBF0' },
        butter: { DEFAULT: '#D8BE6F', soft: '#F6EFD3' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(43,41,38,0.04), 0 8px 24px -12px rgba(43,41,38,0.12)',
        lift: '0 2px 4px rgba(43,41,38,0.05), 0 18px 36px -16px rgba(43,41,38,0.22)',
      },
      borderRadius: { '2xl': '1.25rem', '3xl': '1.75rem' },
    },
  },
  plugins: [],
};
