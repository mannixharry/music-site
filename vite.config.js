import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    // `npm run dev` serves the pages; `npm run dev:worker` serves the API on
    // 8787. Proxying keeps them on one origin, so the app's fetch('/api/...')
    // is the same line locally as in production. With no Worker running the
    // proxy just fails, and ContentProvider falls back to the committed
    // snapshot — which is exactly what it does in production if the API is down.
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
