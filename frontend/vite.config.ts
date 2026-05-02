import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['@testing-library/jest-dom/vitest']
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000'
    }
  }
});
