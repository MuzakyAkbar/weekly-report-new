import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:3001'
  const openbravoUrl = env.VITE_OPENBRAVO_URL || 'http://36.93.9.238:8080'

  return {
    base: '/activity-report/',
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      port: 3000,
      proxy: {
        // Backend Node.js — lebih spesifik, harus di atas
        '/api/query': {
          target: backendUrl,
          changeOrigin: true,
        },
        // Openbravo REST API
        '/api/openbravo': {
          target: openbravoUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/openbravo/, '/openbravo')
        }
      }
    }
  }
})