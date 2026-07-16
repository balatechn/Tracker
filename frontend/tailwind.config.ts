import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#e9f0f8',
          100: '#c5d8ef',
          500: '#2b579a',   // Office blue
          600: '#1f4278',
          700: '#1a3660',
          800: '#132848',
          900: '#0c1a30',
        },
        surface: '#f2f2f2',
        status: {
          active:      '#375623',
          'active-bg': '#e2efda',
          warning:     '#833c00',
          'warning-bg':'#fce4d6',
          danger:      '#c00000',
          'danger-bg': '#ffd7d7',
          neutral:     '#595959',
          'neutral-bg':'#f2f2f2',
        },
      },
      fontFamily: {
        sans: ['Calibri', 'Aptos', '"Segoe UI"', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.08)',
        'card-hover': '0 2px 4px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        DEFAULT: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        full: '9999px',
      },
    },
  },
  plugins: [],
};

export default config;
