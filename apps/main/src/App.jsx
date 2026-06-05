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

const HOST_ROUTE_CHANGE_EVENT = 'host-route-change';

function navigateTo(path) {
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

export default function App() {
  const [path, setPath] = useState(getCurrentPath);
  const [microStatuses, setMicroStatuses] = useState(initialMicroStatuses);

  useEffect(() => {
    const handleRoute = () => setPath(getCurrentPath());
    const handleStatus = (event) => {
      const { name, status } = event.detail || {};

      if (
        name &&
        Object.prototype.hasOwnProperty.call(initialMicroStatuses, name)
      ) {
        setMicroStatuses((current) => ({
          ...current,
          [name]: status,
        }));
      }
    };

    window.addEventListener('popstate', handleRoute);
    window.addEventListener(HOST_ROUTE_CHANGE_EVENT, handleRoute);
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

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">Q</span>
          <div>
            <strong>Qiankun Lab</strong>
            <span>React workspace</span>
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
        {/* <header className="topbar">
          <div>
            <p className="eyebrow">Micro Frontend Host</p>
            <h1>{activeRoute.title}</h1>
          </div>
          <span className={`status status-${microStatus}`}>
            {microStatus}
          </span>
        </header> */}

        {false && (
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

        <section
          className={isMicroRoute ? 'micro-panel visible' : 'micro-panel'}
          aria-label="Micro app viewport"
        >
          <div id="micro-app-container" />
        </section>
      </main>
    </div>
  );
}
