import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-fraunces)', 'serif'],
        sans: ['var(--font-manrope)', 'sans-serif'],
      },
      colors: {
        workspace: '#080a0f',
        panel: '#181c26',
        'panel-hover': '#1f2430',
        'border-panel': '#2a3040',
        'border-subtle': '#3a4052',
        accent: '#c9a96e',
        'accent-dim': '#b8955a',
        paper: '#faf8f5',
        'text-primary': '#e8e4dc',
        'text-secondary': '#a8adb8',
        'text-muted': '#6a7080',
      },
    },
  },
  plugins: [],
}
export default config
