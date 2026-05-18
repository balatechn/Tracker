import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#0078d4',
          600: '#106ebe',
          700: '#005a9e',
          800: '#004578',
          900: '#003060',
        },
        surface: '#f3f2f1',
        status: {
          active: '#107c10',
          'active-bg': '#dff6dd',
          warning: '#d83b01',
          'warning-bg': '#fed9cc',
          danger: '#a4262c',
          'danger-bg': '#fde7e9',
          neutral: '#605e5c',
          'neutral-bg': '#edebe9',
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
