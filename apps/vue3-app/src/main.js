import { createApp } from 'vue'
import { qiankunWindow, renderWithQiankun } from 'vite-plugin-qiankun/dist/helper'
import './style.css'
import App from './App.vue'
import { ElLoading, ElMessage } from 'element-plus'
import { createAppRouter } from './router/index.js'
import { AUTH_EXPIRED_EVENT } from './utils/request.js'

let app = null
let router = null
let authExpiredHandler = null

function setupAuthExpiredHandler() {
  if (authExpiredHandler) return
  authExpiredHandler = (event) => {
    ElMessage.error(event?.detail?.message || '登录状态已失效，请重新登录')
  }
  window.addEventListener(AUTH_EXPIRED_EVENT, authExpiredHandler)
}

function teardownAuthExpiredHandler() {
  if (!authExpiredHandler) return
  window.removeEventListener(AUTH_EXPIRED_EVENT, authExpiredHandler)
  authExpiredHandler = null
}

// render 同时支持两种运行方式：被 qiankun 挂载，以及作为普通 Vue 应用独立运行。
function render(props = {}) {
  // 防御重复 mount：qiankun 正常会先 unmount 再 mount，这里避免异常时残留旧实例。
  teardownVueApp()

  const container = props.container
  const mountPoint = container ? container.querySelector('#app') : document.getElementById('app')
  router = createAppRouter({
    base: props.routerBase || '/',
    // qiankun 模式使用 hash 路由，避免 Vue 内部路由污染主应用 pathname。
    useHash: qiankunWindow.__POWERED_BY_QIANKUN__
  })

  app = createApp(App)
  // Element Plus 组件由 unplugin-vue-components 自动按需导入，这里只注册服务类指令。
  app.use(ElLoading).use(router).mount(mountPoint)
  // 请求层只广播认证失效事件，入口统一决定如何提示用户。
  setupAuthExpiredHandler()
}

function teardownVueApp() {
  if (app) {
    // app.unmount() 会触发组件 onUnmounted/onBeforeUnmount，并让 Vue Router 释放 history 监听。
    app.unmount()
    app = null
  }
  router = null
  teardownAuthExpiredHandler()
}

renderWithQiankun({
  bootstrap() {
    return Promise.resolve()
  },
  mount(props) {
    // qiankun 激活 /vue3-app 时会调用 mount，并把 container、routerBase 等 props 传进来。
    render(props)
    return Promise.resolve()
  },
  unmount() {
    // 卸载时释放入口层和各组件副作用，避免再次进入子应用时复用旧状态。
    teardownVueApp()
    return Promise.resolve()
  }
})

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  // 直接访问 http://localhost:7102 时走独立运行模式，便于单独开发 Vue 子应用。
  render()
}
