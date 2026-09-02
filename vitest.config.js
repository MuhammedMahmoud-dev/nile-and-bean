import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The frontend is plain browser JS, so the tests need a DOM and a
    // localStorage. Each file gets a fresh window.
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    restoreMocks: true
  }
});
