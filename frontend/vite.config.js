import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// JS config avoids TS config bundling issues on some setups.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
})
