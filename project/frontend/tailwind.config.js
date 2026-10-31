/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060B18', // Deepest background
          900: '#0A1226', // Main dark canvas
          850: '#0E1A36', // Elevated background
          800: '#142347', // Card surface
          750: '#1A2C58', // Card hover / border
          700: '#22386E', // Distinct borders
          600: '#2E4C93',
        },
        cyan: {
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
        },
        royal: {
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        }
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.25)',
        'glow-blue': '0 0 30px -5px rgba(37, 99, 235, 0.3)',
        'glow-lg': '0 0 45px -10px rgba(6, 182, 212, 0.35)',
        'inner-glow': 'inset 0 0 20px rgba(6, 182, 212, 0.1)',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.03)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      },
      animation: {
        'scanline': 'scanline 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulseGlow 4s ease-in-out infinite',
        'float-slow': 'float 5s ease-in-out infinite',
      }
    },
  },
  plugins: [],
};
