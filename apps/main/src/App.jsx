import { useEffect, useMemo, useState } from 'react';

const routes = [
  { path: '/', label: 'Host Overview' },
  { path: '/react-dashboard', label: 'React Dashboard' },
];

function navigateTo(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function getCurrentPath() {
  return window.location.pathname || '/';
}

export default function App() {
  const [path, setPath] = useState(getCurrentPath);
  const [microStatus, setMicroStatus] = useState('idle');

  useEffect(() => {
    const handleRoute = () => setPath(getCurrentPath());
    const handleStatus = (event) => {
      if (event.detail?.name === 'react-dashboard') {
        setMicroStatus(event.detail.status);
      }
    };

    window.addEventListener('popstate', handleRoute);
    window.addEventListener('micro-app-status', handleStatus);
    return () => {
      window.removeEventListener('popstate', handleRoute);
      window.removeEventListener('micro-app-status', handleStatus);
    };
  }, []);

  const isMicroRoute = useMemo(
    () => path.startsWith('/react-dashboard'),
    [path],
  );

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
              className={path === route.path ? 'nav-item active' : 'nav-item'}
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
            <h1>{isMicroRoute ? 'React Dashboard' : 'Host Overview'}</h1>
          </div>
          <span className={`status status-${microStatus}`}>
            {microStatus}
          </span>
        </header>

        {!isMicroRoute && (
          <section className="overview">
            <div className="metric">
              <span>Registered apps</span>
              <strong>1</strong>
            </div>
            <div className="metric">
              <span>Host port</span>
              <strong>7100</strong>
            </div>
            <div className="metric">
              <span>Micro app port</span>
              <strong>7101</strong>
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
