import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  addGlobalUncaughtErrorHandler,
  registerMicroApps,
  start,
} from 'qiankun';
import App from './App.jsx';
import { microApps } from './microApps.js';
import './styles.css';

// qiankun 抛出的全局错误通常只带有字符串消息，这里从消息中反查是哪一个子应用失败。
function getErrorAppName(message = '') {
  return microApps.find((app) => message.includes(`'${app.name}'`))?.name;
}

// 主应用 UI 不直接依赖 qiankun 内部状态，而是通过自定义事件接收生命周期结果。
function dispatchMicroAppStatus(name, status, message) {
  window.dispatchEvent(
    new CustomEvent('micro-app-status', {
      detail: { name, status, message },
    }),
  );
}

// 注册子应用时顺便绑定生命周期钩子，用于驱动顶部状态和错误提示。
registerMicroApps(microApps, {
  beforeLoad: [
    (app) => {
      dispatchMicroAppStatus(app.name, 'loading');
      return Promise.resolve();
    },
  ],
  afterMount: [
    (app) => {
      dispatchMicroAppStatus(app.name, 'mounted');
      return Promise.resolve();
    },
  ],
  afterUnmount: [
    (app) => {
      dispatchMicroAppStatus(app.name, 'idle');
      return Promise.resolve();
    },
  ],
});

// 子应用入口不可访问时会进入这里，例如 vue3-app 服务未启动导致 Failed to fetch。
addGlobalUncaughtErrorHandler((event) => {
  const message =
    event?.message || event?.reason?.message || event?.error?.message || '';
  const appName = getErrorAppName(message);

  if (appName) {
    dispatchMicroAppStatus(appName, 'error', message);
  }
});

start({
  // 本项目先关闭预加载，避免主应用首屏提前请求未访问的子应用资源。
  prefetch: false,
  sandbox: {
    // 样式隔离可以降低子应用样式污染主应用或其他子应用的概率。
    experimentalStyleIsolation: true,
  },
});

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
