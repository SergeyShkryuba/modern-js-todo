import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves this project from /modern-js-todo/, so asset URLs have
  // to be relative to that prefix rather than to the domain root.
  base: process.env['GITHUB_PAGES'] === 'true' ? '/modern-js-todo/' : '/',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
