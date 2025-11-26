import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: 'src', replacement: path.resolve(process.cwd(), 'src') },
      { find: /^src\/(.*)/, replacement: path.resolve(process.cwd(), 'src') + '/$1' },
    ],
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  define: {
    // Make API URL available at build time for production
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_API_URL || 'http://127.0.0.1:8000'
    ),
  },
})
