import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  // Load .env from the repo root so frontend and backend share one file.
  // Vite only exposes VITE_* variables to the browser bundle regardless.
  envDir: fileURLToPath(new URL('..', import.meta.url)),
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    // `@/...` resolves to `src/...`. Mirrored in tsconfig.app.json so the
    // editor + tsc agree with the bundler. Adopt incrementally — existing
    // relative imports keep working.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
