import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  qiankunWindow,
  renderWithQiankun,
} from 'vite-plugin-qiankun/dist/helper';
import App from './App.jsx';
import './styles.css';

let root;

function render(props = {}) {
  const container = props.container
    ? props.container.querySelector('#root')
    : document.getElementById('root');

  root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App hostProps={props} />
    </React.StrictMode>,
  );
}

renderWithQiankun({
  bootstrap() {
    return Promise.resolve();
  },
  mount(props) {
    render(props);
    return Promise.resolve();
  },
  unmount() {
    root?.unmount();
    root = null;
    return Promise.resolve();
  },
});

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render();
}
