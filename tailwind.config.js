/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        nimbus: {
          bg: '#0b0d12',
          surface: '#12151c',
          sunken: '#0e1117',
          border: 'rgba(255,255,255,0.05)',
          borderStrong: 'rgba(255,255,255,0.08)',
          text: '#e6e8ee',
          heading: '#f2f4f9',
          subtle: '#8a92a3',
          faint: '#6b7285',
          disabled: '#3b414f',
          purple: '#7c5cff',
          purpleDark: '#5a3fff',
          purpleSoft: '#c1b3ff',
          cyan: '#22d3ee',
          amber: '#f0b429',
          green: '#34d399',
          pink: '#ff6b9d',
          orange: '#ff8a5b',
        },
      },
    },
  },
  plugins: [],
};
