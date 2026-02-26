/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                'orbital': {
                    50: '#eef9f0',
                    100: '#d6f1db',
                    200: '#b0e3bc',
                    300: '#7dcf91',
                    400: '#4db864',
                    500: '#2d9e47',
                    600: '#1f7f37',
                    700: '#1a652e',
                    800: '#185027',
                    900: '#154222',
                    950: '#0a2513',
                },
                'space': {
                    800: '#0f172a',
                    850: '#0c1322',
                    900: '#080e1a',
                    950: '#050a12',
                },
                'stress-safe': '#22c55e',
                'stress-monitor': '#f59e0b',
                'stress-critical': '#ef4444',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            boxShadow: {
                'glow-green': '0 0 20px rgba(45, 158, 71, 0.3)',
                'glow-amber': '0 0 20px rgba(245, 158, 11, 0.3)',
                'glow-red': '0 0 20px rgba(239, 68, 68, 0.3)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.4s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
};
