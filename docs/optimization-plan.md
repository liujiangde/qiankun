# 项目持续优化计划

本文档用于跟踪当前 qiankun 微前端工作区的持续优化事项。

## 当前范围

当前工作区包含：

- `apps/main`：qiankun 主应用，端口 `7100`
- `apps/react-dashboard`：React 子应用，端口 `7101`
- `apps/vue3-app`：Vue 3 子应用，端口 `7102`

## 推进顺序

建议按以下顺序推进：

1. 运行稳定性
2. 微前端边界治理
3. 包体积和加载性能
4. 请求层与业务代码整理
5. 仓库卫生
6. 工程化、Lint 和测试

## 阶段一：运行稳定性

目标：优先修复会直接影响本地开发、子应用加载和路由切换的问题。

### 任务

- [ ] 删除生产环境风险代码，尤其是 Vue 组件中的 `debugger`。
- [ ] 删除主应用中的死代码，例如 `{false && ...}` 和长期注释的 UI 块。
- [ ] 将 `apps/main/src/microApps.js` 中写死的子应用入口改为配置化。
- [ ] 增加子应用入口环境变量：
  - `VITE_REACT_DASHBOARD_ENTRY=http://localhost:7101`
  - `VITE_VUE3_APP_ENTRY=http://localhost:7102`
- [ ] 补充三个应用的启动说明。
- [ ] 增加服务就绪检查，避免 qiankun 出现 `LOADING_SOURCE_CODE: Failed to fetch`。
- [ ] 将 qiankun 的 `prefetch: 'all'` 改为 `false` 或受控预加载策略。

### 验收标准

- [ ] `pnpm dev` 可以稳定启动主应用、React 子应用和 Vue 子应用。
- [ ] `http://localhost:7100/react-dashboard` 可以正常挂载。
- [ ] `http://localhost:7100/vue3-app` 可以正常挂载。
- [ ] 从 Vue 页面切换到 React 页面时，URL 不再残留或污染 `vue3-app` 路径。
- [ ] `pnpm build` 构建成功。

## 阶段二：微前端边界治理

目标：减少主应用与子应用之间的路由、样式和生命周期互相影响。

### 任务

- [ ] 重新评估 Vue 子应用在 qiankun 模式下的路由策略。
- [ ] 考虑在 qiankun 模式下让 Vue 子应用使用 `createWebHashHistory()`。
- [ ] 如仍需独立运行 Vue 子应用，独立模式保留 `createWebHistory()`。
- [ ] 确保 Vue 子应用卸载时清理应用实例、路由副作用、图表实例、定时器和全局监听。
- [ ] 保持主应用内部导航事件与浏览器原生 `popstate` 分离。
- [ ] 在合适时统一主应用路由元信息和微应用注册元信息，避免重复维护。
- [ ] 为子应用不可用场景增加主应用侧的加载态和错误态。

### 验收标准

- [ ] Vue 子应用可以反复挂载和卸载。
- [ ] 从 Vue 子应用切换到 React 子应用后，URL 不被 Vue 路由污染。
- [ ] 子应用服务不可用时，主应用可以展示清晰提示。

## 阶段三：包体积和加载性能

目标：降低 Vue 子应用资源体积，避免主应用首屏加载不必要的子应用资源。

### 当前发现

- Vue 子应用当前会产出约 `1MB` 级别的 JavaScript chunk。
- Vue 子应用当前会产出约 `350KB` 的 CSS 资源。
- 主要原因大概率是全量注册 Element Plus、全量引入 Element Plus CSS，以及全量引入 ECharts。

### 任务

- [ ] 将 Element Plus 全量注册改为按需使用。
- [ ] 如果可以使用组件级样式，移除全局 `import 'element-plus/dist/index.css'`。
- [ ] 将 `import * as echarts from 'echarts'` 改为 `echarts/core`，只注册实际使用的图表、组件和渲染器。
- [ ] 在 `apps/vue3-app/vite.config.js` 中配置 `manualChunks`。
- [ ] 至少拆分以下 vendor chunk：
  - `vue-vendor`
  - `element-plus`
  - `echarts`
- [ ] 保留现有路由级懒加载，并在必要时继续拆分重页面内部组件。
- [ ] 在包体积优化后重新评估 qiankun 预加载策略。

### 验收标准

- [ ] Vue 子应用不再产出 `1MB+` 的 JavaScript chunk。
- [ ] 主应用首屏不再提前加载 Vue 子应用资源，除非明确配置了预加载。
- [ ] `pnpm build` 构建成功，且没有明显性能退化。

## 阶段四：请求层与业务代码整理

目标：将迁移和演示阶段遗留代码整理成稳定的业务边界。

### 任务

- [ ] 所有 HTTP 请求统一走 `apps/vue3-app/src/utils/request.js`。
- [ ] 页面组件中避免混用原生 `fetch` 和 `axios`。
- [ ] 请求层增加来自环境变量的 `baseURL`。
- [ ] 请求拦截器增加认证 token 注入。
- [ ] 增加集中化 `401` 处理。
- [ ] 增加统一错误提示策略。
- [ ] 对可能重复触发的查询增加请求取消能力。
- [ ] 将页面内 API 逻辑拆到业务 API 模块：
  - `src/api/dial.js`
  - `src/api/probeGroup.js`
  - `src/api/trafficForwarding.js`
- [ ] 替换模拟接口和 TODO，或将 mock 逻辑隔离到明确的 mock 模块中。

### 验收标准

- [ ] 业务页面不再包含临时的请求实现。
- [ ] mock API 逻辑被隔离或删除。
- [ ] API 模块提供稳定的函数名和统一的响应归一化处理。

## 阶段五：仓库卫生

目标：删除迁移遗留文件，让仓库更干净、可维护。

### 任务

- [ ] 删除已提交或未跟踪的迁移产物：
  - `.DS_Store`
  - `.specstory`
  - `.pnpm-store`
  - `*.zip`
  - 子应用内的 `dist`
  - 子应用内的 `node_modules`
- [ ] 扩展根目录 `.gitignore`：
  - `.pnpm-store/`
  - `*.zip`
  - `apps/**/dist/`
  - `apps/**/node_modules/`
- [ ] 判断是否保留 `apps/vue3-app/.vscode/extensions.json`。
- [ ] 保持根目录 `pnpm-lock.yaml` 作为唯一 workspace 锁文件。
- [ ] 将构建工具类依赖移动到合适的 `devDependencies`。
- [ ] 删除不再使用的模板资源，例如默认 Vite/Vue logo。

### 验收标准

- [ ] `git status --short --ignored` 不再显示可避免的应用目录生成产物。
- [ ] workspace 只保留根目录一个锁文件。
- [ ] app 目录中只保留源码和必要配置。

## 阶段六：工程化、Lint 和测试

目标：用工具和测试防止重复回归。

### 任务

- [ ] 增加适配 React、Vue 和普通 JavaScript 的 ESLint。
- [ ] 增加 Prettier 统一格式。
- [ ] 增加 lint 规则拦截：
  - `debugger`
  - 未使用变量
  - 意外的全局副作用
- [ ] 增加 `pnpm lint`。
- [ ] 增加 `pnpm check`，执行构建和 lint。
- [ ] 增加浏览器冒烟测试。
- [ ] 冒烟测试覆盖以下路由：
  - `/`
  - `/react-dashboard`
  - `/vue3-app`
- [ ] 增加从 Vue 页面切换到 React 页面后的路由测试。
- [ ] 增加子应用服务缺失时的测试或明确文档说明。

### 验收标准

- [ ] `pnpm lint` 通过。
- [ ] `pnpm check` 通过。
- [ ] 冒烟测试证明两个子应用都能正常挂载。
- [ ] 路由切换问题不再回归。

## 推荐第一轮迭代

第一轮建议选择风险最高、改动最小的一组任务：

1. 删除 `debugger` 和主应用死代码。
2. 将子应用入口改成环境变量。
3. 补充 `7100`、`7101`、`7102` 的启动和排错说明。
4. 关闭 qiankun 全量预加载。
5. 清理仓库迁移产物并更新 `.gitignore`。
6. 增加 `/react-dashboard` 和 `/vue3-app` 的基础冒烟测试。

## 验证命令

每个阶段完成后建议执行：

```bash
pnpm install
pnpm build
pnpm dev
```

本地手动验证地址：

```text
http://localhost:7100
http://localhost:7100/react-dashboard
http://localhost:7100/vue3-app
```
