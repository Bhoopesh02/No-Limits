/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
  },
  test: {
    css: true,
  },
});
