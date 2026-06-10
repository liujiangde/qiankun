import { useEffect, useMemo, useState } from 'react'
import {
  getMicroAppEntry,
  hostRoutes,
  HOST_ROUTE_CHANGE_EVENT,
  microRouteByAppName,
  normalizeEntryUrl
} from './routes.js'

const initialMicroStatuses = Object.fromEntries(
  Object.keys(microRouteByAppName).map((appName) => [appName, 'idle'])
)

const initialMicroErrors = Object.fromEntries(
  Object.keys(microRouteByAppName).map((appName) => [appName, ''])
)

function navigateTo(path) {
  // pushState 不会自动触发 popstate，所以主应用额外派发一个内部路由事件。
  // 事件名和 payload 都与浏览器原生 popstate 分离，避免子应用误把它当成浏览器前进后退。
  window.history.pushState({}, '', path)
  window.dispatchEvent(
    new CustomEvent(HOST_ROUTE_CHANGE_EVENT, {
      detail: { path, source: 'host-nav' }
    })
  )
}

function getCurrentPath() {
  return window.location.pathname || '/'
}

function isActiveRoute(path, route) {
  return route.path === '/' ? path === route.path : path.startsWith(route.path)
}

function getActiveRoute(path) {
  return (
    hostRoutes.find((route) => route.path !== '/' && path.startsWith(route.path)) || hostRoutes[0]
  )
}

function buildMicroFailureHint(route, message) {
  if (!route?.appName) return null
  const entry = normalizeEntryUrl(getMicroAppEntry(route))
  return {
    title: `${route.label} 加载失败`,
    message: message || `无法访问子应用入口：${entry}`,
    entry,
    command: route.devCommand
  }
}

// 主应用只维护“哪个微应用应该显示”和“微应用当前生命周期状态”。
// 业务页面由 qiankun 注入到 #micro-app-container，避免主应用直接耦合子应用实现。
export default function App() {
  const [path, setPath] = useState(getCurrentPath)
  const [microStatuses, setMicroStatuses] = useState(initialMicroStatuses)
  const [microErrors, setMicroErrors] = useState(initialMicroErrors)

  useEffect(() => {
    const handleRoute = () => setPath(getCurrentPath())
    const handleStatus = (event) => {
      const { name, status, message = '' } = event.detail || {}

      // 只接受已注册子应用的状态，避免无关事件污染主应用状态。
      if (name && Object.prototype.hasOwnProperty.call(initialMicroStatuses, name)) {
        setMicroStatuses((current) => ({
          ...current,
          [name]: status
        }))
        setMicroErrors((current) => ({
          ...current,
          [name]: status === 'error' ? message : ''
        }))
      }
    }

    // popstate 处理浏览器前进后退，HOST_ROUTE_CHANGE_EVENT 处理主应用按钮导航。
    window.addEventListener('popstate', handleRoute)
    window.addEventListener(HOST_ROUTE_CHANGE_EVENT, handleRoute)
    // micro-app-status 来自 apps/main/src/main.jsx 中的 qiankun 生命周期钩子。
    window.addEventListener('micro-app-status', handleStatus)
    return () => {
      window.removeEventListener('popstate', handleRoute)
      window.removeEventListener(HOST_ROUTE_CHANGE_EVENT, handleRoute)
      window.removeEventListener('micro-app-status', handleStatus)
    }
  }, [])

  const activeRoute = useMemo(() => getActiveRoute(path), [path])
  // activeRoute.appName 是主应用和 qiankun 注册表之间的关联点。
  // 没有 appName 的路由展示主应用首页，有 appName 的路由展示微应用容器。
  const isMicroRoute = Boolean(activeRoute.appName)
  const microStatus = activeRoute.appName ? microStatuses[activeRoute.appName] : 'idle'
  const microError = activeRoute.appName ? microErrors[activeRoute.appName] : ''
  const failureHint = useMemo(
    () => (microStatus === 'error' ? buildMicroFailureHint(activeRoute, microError) : null),
    [activeRoute, microError, microStatus]
  )

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">Q</span>
          <div>
            <strong>Qiankun Lab</strong>
            <span>React/Vue workspace</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Application navigation">
          {hostRoutes.map((route) => (
            <button
              className={isActiveRoute(path, route) ? 'nav-item active' : 'nav-item'}
              key={route.path}
              onClick={() => navigateTo(route.path)}
              type="button"
            >
              {route.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Micro Frontend Host</p>
            <h1>{activeRoute.title}</h1>
          </div>
          <span className={`status status-${microStatus}`}>{microStatus}</span>
        </header>

        {!isMicroRoute && (
          <section className="overview">
            <div className="metric">
              <span>Registered apps</span>
              <strong>2</strong>
            </div>
            <div className="metric">
              <span>Host port</span>
              <strong>7100</strong>
            </div>
            <div className="metric">
              <span>React app port</span>
              <strong>7101</strong>
            </div>
            <div className="metric">
              <span>Vue app port</span>
              <strong>7102</strong>
            </div>
          </section>
        )}

        {isMicroRoute && failureHint && (
          <section className="micro-feedback" role="alert">
            <strong>{failureHint.title}</strong>
            <span>{failureHint.message}</span>
            <dl>
              <div>
                <dt>入口地址</dt>
                <dd>{failureHint.entry}</dd>
              </div>
              <div>
                <dt>启动命令</dt>
                <dd>{failureHint.command}</dd>
              </div>
            </dl>
          </section>
        )}

        <section
          className={isMicroRoute ? 'micro-panel visible' : 'micro-panel'}
          aria-label="Micro app viewport"
        >
          {/* qiankun 会把当前激活的子应用挂载到这个容器中。 */}
          <div id="micro-app-container" />
        </section>
      </main>
    </div>
  )
}
