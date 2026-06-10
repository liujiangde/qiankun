export const HOST_ROUTE_CHANGE_EVENT = 'host-route-change'

// 主应用路由表是唯一的页面元信息来源。
// 带 appName 的路由会进一步派生为 qiankun 微应用注册配置。
export const hostRoutes = [
  {
    path: '/',
    label: 'Host Overview',
    title: 'Host Overview'
  },
  {
    path: '/react-dashboard',
    label: 'React Dashboard',
    title: 'React Dashboard',
    appName: 'react-dashboard',
    entryEnv: 'VITE_REACT_DASHBOARD_ENTRY',
    fallbackEntry: '//localhost:7101',
    routerBase: '/react-dashboard',
    devCommand: 'pnpm dev:react-dashboard'
  },
  {
    path: '/vue3-app',
    label: 'Vue3 App',
    title: 'Vue3 App',
    appName: 'vue3-app',
    entryEnv: 'VITE_VUE3_APP_ENTRY',
    fallbackEntry: '//localhost:7102',
    routerBase: '/vue3-app',
    devCommand: 'pnpm dev:vue3-app'
  }
]

// qiankun 只关心微应用路由，因此从 hostRoutes 中筛出带 appName 的项。
export const microRoutes = hostRoutes.filter((route) => route.appName)

export const microRouteByAppName = Object.fromEntries(
  microRoutes.map((route) => [route.appName, route])
)

// entry 支持环境变量覆盖；本地开发未配置时使用 fallbackEntry。
export function getMicroAppEntry(route) {
  return import.meta.env[route.entryEnv] || route.fallbackEntry
}

// 错误提示中展示完整 URL，避免用户看到 //localhost 这类协议相对地址时困惑。
export function normalizeEntryUrl(entry) {
  return entry.startsWith('//') ? `http:${entry}` : entry
}
