import { createApp } from 'vue'
import { qiankunWindow, renderWithQiankun } from 'vite-plugin-qiankun/dist/helper'
import './style.css'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { createAppRouter } from './router/index.js'

let app = null

function render(props = {}) {
  const container = props.container
  const mountPoint = container
    ? container.querySelector('#app')
    : document.getElementById('app')
  const router = createAppRouter(props.routerBase || '/')

  app = createApp(App)
  app.use(ElementPlus).use(router).mount(mountPoint)
}

renderWithQiankun({
  bootstrap() {
    return Promise.resolve()
  },
  mount(props) {
    render(props)
    return Promise.resolve()
  },
  unmount() {
    app?.unmount()
    app = null
    return Promise.resolve()
  }
})

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render()
}
