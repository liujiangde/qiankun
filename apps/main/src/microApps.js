const getMicroAppEntry = (key, fallback) => import.meta.env[key] || fallback;

// qiankun 的核心配置：每个对象描述一个可以被主应用挂载的子应用。
export const microApps = [
  {
    name: 'react-dashboard',
    // entry 支持环境变量覆盖，方便本地、测试、部署环境使用不同子应用地址。
    entry: getMicroAppEntry(
      'VITE_REACT_DASHBOARD_ENTRY',
      '//localhost:7101',
    ),
    // 子应用最终会被 qiankun 渲染到主应用里的这个 DOM 节点。
    container: '#micro-app-container',
    // 浏览器路径匹配 activeRule 时，qiankun 才会加载并挂载这个子应用。
    activeRule: '/react-dashboard',
    props: {
      // routerBase 传给子应用，让子应用知道自己挂载在主应用的哪个路径下。
      routerBase: '/react-dashboard',
      from: 'qiankun-host',
    },
  },
  {
    name: 'vue3-app',
    entry: getMicroAppEntry('VITE_VUE3_APP_ENTRY', '//localhost:7102'),
    container: '#micro-app-container',
    activeRule: '/vue3-app',
    props: {
      // Vue 子应用在 qiankun 模式下会基于这个 base 生成 hash 路由。
      routerBase: '/vue3-app',
      from: 'qiankun-host',
    },
  },
];
