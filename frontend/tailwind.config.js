export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Legacy tokens kept for any admin pages still referencing them
        ink: '#0b1020',
        campus: '#7c3aed',
        leaf: '#22c55e',
        warning: '#f59e0b',
        // Gamified neon palette
        violet: { glow: '#8b5cf6' },
        fuchsia: { glow: '#d946ef' },
        cyan: { glow: '#22d3ee' },
        lime: { glow: '#a3e635' }
      },
      fontFamily: {
        display: ['"Baloo 2"', 'ui-rounded', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 24px -4px rgba(139, 92, 246, 0.55)',
        'glow-cyan': '0 0 24px -4px rgba(34, 211, 238, 0.55)',
        'glow-fuchsia': '0 0 28px -6px rgba(217, 70, 239, 0.6)',
        card: '0 18px 40px -18px rgba(0, 0, 0, 0.6)'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' }
        },
        aurora: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(40px, -30px) scale(1.1)' },
          '66%': { transform: 'translate(-30px, 20px) scale(0.95)' }
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' }
        },
        pop: {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '70%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        'gradient-x': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' }
        },
        bounceDot: {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '40%': { transform: 'translateY(-6px)', opacity: '1' }
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-4deg)' },
          '50%': { transform: 'rotate(4deg)' }
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(139,92,246,0.6)' },
          '50%': { boxShadow: '0 0 0 10px rgba(139,92,246,0)' }
        }
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        aurora: 'aurora 18s ease-in-out infinite',
        shimmer: 'shimmer 2s infinite',
        pop: 'pop 0.4s ease-out both',
        'gradient-x': 'gradient-x 6s ease infinite',
        bounceDot: 'bounceDot 1.2s infinite ease-in-out',
        wiggle: 'wiggle 0.6s ease-in-out infinite',
        glowPulse: 'glowPulse 2s infinite'
      }
    }
  },
  plugins: []
};
