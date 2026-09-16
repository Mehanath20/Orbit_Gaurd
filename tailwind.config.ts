import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-void': '#000000',
        'bg-surface': '#0a0a0a',
        'accent-cyan': '#00d4ff',
        'risk-critical': '#ff2d55',
        'risk-high': '#ff9500',
        'risk-moderate': '#ffd60a',
        'risk-low': '#30d158',
      },
      fontFamily: {
        space: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        inter: ['Inter', 'sans-serif'],
      },
      backdropBlur: {
        '20': '20px',
      },
      animation: {
        'pulse-critical': 'pulse-glow-critical 2s ease-in-out infinite',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        spin: 'spin 0.8s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
