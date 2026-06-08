# React/Vue Qiankun 微前端工作区

这是一个基于 `pnpm workspace` 的 qiankun 微前端项目，包含一个主应用和两个子应用。

## 目录结构

```text
apps/
  main/              # qiankun 主应用，端口 7100
  react-dashboard/   # React 子应用，端口 7101
  vue3-app/          # Vue 3 子应用，端口 7102
```

## 环境变量

复制 `.env.example` 后按需调整子应用入口：

```bash
cp .env.example .env.local
```

默认配置：

```text
VITE_REACT_DASHBOARD_ENTRY=http://localhost:7101
VITE_VUE3_APP_ENTRY=http://localhost:7102
VITE_API_BASE_URL=
VITE_AUTH_TOKEN_KEY=access_token
VITE_USE_MOCK_TB_DETECTION_ALERT=false
VITE_USE_MOCK_TF_FORWARDING_ALERT=true
VITE_USE_MOCK_NEXT_PAGE_LIST=true
VITE_USE_MOCK_ALERT_CONTENT_TAGS=true
VITE_USE_MOCK_SCOPE_APIS=false
VITE_USE_MOCK_TF_ROUTE_RULE=true
```

主应用会优先读取环境变量；没有配置时使用本地默认端口。
Vue 子应用请求层会读取 `VITE_API_BASE_URL` 作为接口前缀；为空时使用当前站点 origin，开发环境可继续走 Vite proxy。

## 学习入口

建议按下面顺序阅读源码：

1. `apps/main/src/microApps.js`：理解 qiankun 如何注册 React/Vue 子应用。
2. `apps/main/src/main.jsx`：理解 qiankun 生命周期、错误处理和主应用状态联动。
3. `apps/main/src/App.jsx`：理解主应用外壳、导航和子应用挂载容器。
4. `apps/vue3-app/src/main.js`：理解 Vue 子应用如何同时支持 qiankun 挂载和独立运行。
5. `apps/vue3-app/src/router/index.js`：理解 qiankun 模式下的 hash 路由隔离。
6. `apps/vue3-app/vite.config.js`：理解开发服务跨域、Element Plus 按需导入和构建分包策略。
7. `apps/vue3-app/src/utils/request.js`：理解公共请求层如何统一 baseURL、token、`401` 处理、错误处理和重复请求取消。
8. `apps/vue3-app/src/config/mock.js`：理解本地 mock 开关如何集中管理。
9. `apps/vue3-app/src/mocks/dial.js`、`apps/vue3-app/src/mocks/trafficForwarding.js`、`apps/vue3-app/src/mocks/probeGroup.js`：理解本地 mock 数据如何从页面中隔离。
10. `apps/vue3-app/src/api/dial.js`、`apps/vue3-app/src/api/trafficForwarding.js`、`apps/vue3-app/src/api/probeGroup.js`：理解页面如何通过业务 API 模块访问后端。
11. `tests/e2e/smoke.spec.js`：理解如何用浏览器冒烟测试防止路由切换回归。

## 常用命令

安装依赖：

```bash
pnpm install
```

启动全部应用：

```bash
pnpm dev
```

检查三个服务是否可访问：

```bash
pnpm check:services
```

运行浏览器冒烟测试：

```bash
pnpm test:e2e
```

执行当前完整检查：

```bash
pnpm check
```

分别启动应用：

```bash
pnpm dev:main
pnpm dev:react-dashboard
pnpm dev:vue3-app
```

构建全部 workspace：

```bash
pnpm build
```

## 访问地址

主应用：

```text
http://localhost:7100
```

子应用挂载地址：

```text
http://localhost:7100/react-dashboard
http://localhost:7100/vue3-app
```

## 常见问题

### 点击 Vue 页面时报 `LOADING_SOURCE_CODE: Failed to fetch`

通常是 `vue3-app` 服务没有启动，或者 `VITE_VUE3_APP_ENTRY` 指向的地址不可访问。

处理方式：

```bash
pnpm dev:vue3-app
pnpm check:services
```

### 点击 React 页面时报加载失败

通常是 `react-dashboard` 服务没有启动，或者 `VITE_REACT_DASHBOARD_ENTRY` 指向的地址不可访问。

处理方式：

```bash
pnpm dev:react-dashboard
pnpm check:services
```

### Playwright 提示缺少浏览器

首次运行冒烟测试时，如果提示缺少 Chromium，可以执行：

```bash
pnpm exec playwright install chromium
```
