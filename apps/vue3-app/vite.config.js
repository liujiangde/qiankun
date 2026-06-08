import path from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import qiankun from 'vite-plugin-qiankun'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    Components({
      resolvers: [
        ElementPlusResolver({
          importStyle: 'css'
        })
      ]
    }),
    qiankun('vue3-app', {
      useDevMode: true
    })
  ],
  resolve: {
    alias: {
      // 统一使用 @ 指向 src，避免深层业务文件出现大量相对路径。
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 7102,
    strictPort: true,
    cors: true,
    headers: {
      // qiankun 主应用会跨端口拉取子应用资源，开发环境需要允许跨域。
      'Access-Control-Allow-Origin': '*'
    },
    proxy: {
      '/cloudmonitor': {
        target: 'http://localhost:31880',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          const normalized = id.replace(/\\/g, '/')

          // 将 Vue 生态依赖拆出来，业务代码变化时可以减少基础框架 chunk 的缓存失效。
          if (
            normalized.includes('/vue@') ||
            normalized.includes('/vue-router@') ||
            normalized.includes('/@vue+') ||
            normalized.includes('/@vueuse+')
          ) {
            return 'vue-vendor'
          }

          // Element Plus 图标独立成包，避免和业务入口或 Vue 框架包混在一起。
          if (normalized.includes('/@element-plus+icons-vue@')) {
            return 'element-plus-icons'
          }

          // Element Plus 组件样式和运行时代码由按需导入插件处理，交给 Rollup 默认拆分更稳。
          if (normalized.includes('/element-plus@')) {
            return undefined
          }

          // ECharts 体积较大，独立 chunk 可以避免普通页面被迫加载图表库。
          if (normalized.includes('/echarts@') || normalized.includes('/zrender@')) {
            return 'echarts'
          }

          // HTTP 客户端独立出来，后续请求层重构时更容易观察体积变化。
          if (normalized.includes('/axios@')) {
            return 'http-vendor'
          }

          return 'vendor'
        }
      }
    }
  }
})
