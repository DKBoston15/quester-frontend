import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  resolve: {
    alias: {
      '$lib': new URL('./src/lib', import.meta.url).pathname,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    reporters: ['verbose'],
    silent: false,
    hideSkippedTests: false,
    onConsoleLog: (log, type) => {
      // Suppress expected error logs during tests
      if (type === 'stderr' || type === 'stdout') {
        if (
          log.includes('Authentication error detected:') ||
          log.includes('Failed to parse:') ||
          log.includes('Failed to parse SSE message:') ||
          log.includes('SyntaxError: Unexpected token') ||
          log.includes('at JSON.parse') ||
          log.includes('at processSSEStream') ||
          log.includes('at processTicksAndRejections')
        ) {
          return false;
        }
      }
      return true;
    },
  },
});