import path from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import qiankun from 'vite-plugin-qiankun'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    qiankun('vue3-app', {
      useDevMode: true
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 7102,
    strictPort: true,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    proxy: {
      '/cloudmonitor': {
        target: 'http://localhost:31880',
        changeOrigin: true
      }
    }
  }
})
