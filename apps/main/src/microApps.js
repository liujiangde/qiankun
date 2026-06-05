export const microApps = [
  {
    name: 'react-dashboard',
    entry: '//localhost:7101',
    container: '#micro-app-container',
    activeRule: '/react-dashboard',
    props: {
      routerBase: '/react-dashboard',
      from: 'qiankun-host',
    },
  },
  {
    name: 'vue3-app',
    entry: '//localhost:7102',
    container: '#micro-app-container',
    activeRule: '/vue3-app',
    props: {
      routerBase: '/vue3-app',
      from: 'qiankun-host',
    },
  },
];
