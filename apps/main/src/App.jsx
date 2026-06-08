import { useEffect, useMemo, useState } from 'react';

const routes = [
  { path: '/', label: 'Host Overview', title: 'Host Overview' },
  {
    path: '/react-dashboard',
    label: 'React Dashboard',
    title: 'React Dashboard',
    appName: 'react-dashboard',
  },
  {
    path: '/vue3-app',
    label: 'Vue3 App',
    title: 'Vue3 App',
    appName: 'vue3-app',
  },
];

const initialMicroStatuses = {
  'react-dashboard': 'idle',
  'vue3-app': 'idle',
};

const initialMicroErrors = {
  'react-dashboard': '',
  'vue3-app': '',
};

const HOST_ROUTE_CHANGE_EVENT = 'host-route-change';

function navigateTo(path) {
  // pushState 不会自动触发 popstate，所以主应用额外派发一个内部路由事件。
  window.history.pushState({}, '', path);
  window.dispatchEvent(new Event(HOST_ROUTE_CHANGE_EVENT));
}

function getCurrentPath() {
  return window.location.pathname || '/';
}

function isActiveRoute(path, route) {
  return route.path === '/'
    ? path === route.path
    : path.startsWith(route.path);
}

function getActiveRoute(path) {
  return (
    routes.find((route) => route.path !== '/' && path.startsWith(route.path)) ||
    routes[0]
  );
}

// 这个组件只负责主应用外壳：侧边栏、状态区、子应用容器，不渲染子应用业务页面。
export default function App() {
  const [path, setPath] = useState(getCurrentPath);
  const [microStatuses, setMicroStatuses] = useState(initialMicroStatuses);
  const [microErrors, setMicroErrors] = useState(initialMicroErrors);

  useEffect(() => {
    const handleRoute = () => setPath(getCurrentPath());
    const handleStatus = (event) => {
      const { name, status, message = '' } = event.detail || {};

      // 只接受已注册子应用的状态，避免无关事件污染主应用状态。
      if (
        name &&
        Object.prototype.hasOwnProperty.call(initialMicroStatuses, name)
      ) {
        setMicroStatuses((current) => ({
          ...current,
          [name]: status,
        }));
        setMicroErrors((current) => ({
          ...current,
          [name]: status === 'error' ? message : '',
        }));
      }
    };

    // popstate 处理浏览器前进后退，HOST_ROUTE_CHANGE_EVENT 处理主应用按钮导航。
    window.addEventListener('popstate', handleRoute);
    window.addEventListener(HOST_ROUTE_CHANGE_EVENT, handleRoute);
    // micro-app-status 来自 apps/main/src/main.jsx 中的 qiankun 生命周期钩子。
    window.addEventListener('micro-app-status', handleStatus);
    return () => {
      window.removeEventListener('popstate', handleRoute);
      window.removeEventListener(HOST_ROUTE_CHANGE_EVENT, handleRoute);
      window.removeEventListener('micro-app-status', handleStatus);
    };
  }, []);

  const activeRoute = useMemo(() => getActiveRoute(path), [path]);
  const isMicroRoute = Boolean(activeRoute.appName);
  const microStatus = activeRoute.appName
    ? microStatuses[activeRoute.appName]
    : 'idle';
  const microError = activeRoute.appName
    ? microErrors[activeRoute.appName]
    : '';

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
          {routes.map((route) => (
            <button
              className={
                isActiveRoute(path, route) ? 'nav-item active' : 'nav-item'
              }
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
          <span className={`status status-${microStatus}`}>
            {microStatus}
          </span>
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

        {isMicroRoute && microStatus === 'error' && (
          <section className="micro-feedback" role="alert">
            <strong>子应用加载失败</strong>
            <span>{microError || '请确认对应子应用服务已经启动。'}</span>
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
  );
}
