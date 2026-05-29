import React from 'react';
import { createRoot } from 'react-dom/client';
import { registerMicroApps, start } from 'qiankun';
import App from './App.jsx';
import { microApps } from './microApps.js';
import './styles.css';

registerMicroApps(microApps, {
  beforeLoad: [
    (app) => {
      window.dispatchEvent(
        new CustomEvent('micro-app-status', {
          detail: { name: app.name, status: 'loading' },
        }),
      );
      return Promise.resolve();
    },
  ],
  afterMount: [
    (app) => {
      window.dispatchEvent(
        new CustomEvent('micro-app-status', {
          detail: { name: app.name, status: 'mounted' },
        }),
      );
      return Promise.resolve();
    },
  ],
  afterUnmount: [
    (app) => {
      window.dispatchEvent(
        new CustomEvent('micro-app-status', {
          detail: { name: app.name, status: 'idle' },
        }),
      );
      return Promise.resolve();
    },
  ],
});

start({
  prefetch: 'all',
  sandbox: {
    experimentalStyleIsolation: true,
  },
});

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
