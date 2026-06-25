export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Single brand accent for a clean institutional look
        brand: {
          DEFAULT: '#2563eb',
          600: '#2563eb',
          500: '#3b82f6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        bounceDot: {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '40%': { transform: 'translateY(-5px)', opacity: '1' }
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.25s ease-out both',
        bounceDot: 'bounceDot 1.2s infinite ease-in-out'
      }
    }
  },
  plugins: []
};
