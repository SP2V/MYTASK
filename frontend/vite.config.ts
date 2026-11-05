import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    // Let Vitest load the Edge Function tests in ../backend; the dev server
    // keeps Vite's default (project folder only).
    ...(process.env.VITEST
      ? { fs: { allow: [__dirname, path.resolve(__dirname, '../backend')] } }
      : {}),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    pool: 'threads',
    setupFiles: './src/test/setup.ts',
    css: true,
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      // Pure logic of the Supabase Edge Function (no Deno APIs).
      '../backend/tests/**/*.test.ts',
    ],
    exclude: ['node_modules', 'e2e', 'dist'],
  },
})
