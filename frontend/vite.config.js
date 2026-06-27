import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 本地开发时把 /api 代理到后端 8000；生产由 Nginx 反代
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
