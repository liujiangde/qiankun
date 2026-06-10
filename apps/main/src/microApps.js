import { getMicroAppEntry, microRoutes } from './routes.js'

// qiankun 的核心配置：每个对象描述一个可以被主应用挂载的子应用。
export const microApps = microRoutes.map((route) => ({
  name: route.appName,
  // entry 支持环境变量覆盖，方便本地、测试、部署环境使用不同子应用地址。
  entry: getMicroAppEntry(route),
  // 子应用最终会被 qiankun 渲染到主应用里的这个 DOM 节点。
  container: '#micro-app-container',
  // 浏览器路径匹配 activeRule 时，qiankun 才会加载并挂载这个子应用。
  activeRule: route.path,
  props: {
    // routerBase 传给子应用，让子应用知道自己挂载在主应用的哪个路径下。
    routerBase: route.routerBase,
    from: 'qiankun-host'
  }
}))
