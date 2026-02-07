import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'gywd-bg': '#0f172a',
        'gywd-surface': '#1e293b',
        'gywd-border': '#334155',
        'gywd-text': '#e2e8f0',
        'gywd-muted': '#94a3b8',
        'gywd-blue': '#3b82f6',
        'gywd-green': '#22c55e',
        'gywd-amber': '#f59e0b',
        'gywd-red': '#ef4444',
        'gywd-purple': '#a855f7',
      },
    },
  },
  plugins: [],
};

export default config;
