# Vue 3 常用知识点总结

## 核心概念
- 组合式 API：使用 `setup()`、`ref`、`reactive`、`computed`、`watch` 组织逻辑
- 单文件组件：`<template> + <script setup> + <style>`，推荐 `script setup`
- 响应式系统：基于 Proxy，模板自动解包 `ref`，JS 中需 `.value`
- 生命周期：`onMounted`、`onUpdated`、`onUnmounted`、`onActivated`/`onDeactivated`
- 模板语法：`v-bind`、`v-on`、`v-if`/`v-else`、`v-show`、`v-for`、`key`

## 组合式 API
- `ref`：标量或 DOM 引用；模板自动解包但 JS 访问用 `.value`
- `reactive`：对象/数组深度响应；避免对其结构解构，否则丢失响应式
- `toRef`/`toRefs`：从 `reactive` 创建保持响应的 `ref`
- `computed`：缓存派生值；可写 `computed({ get, set })` 实现双向
- `watch`：监听 `ref`、getter、数组源；选项 `immediate`、`deep`、`flush: 'post'`
- `watchEffect`：自动收集依赖，适合副作用；清理函数在回调里返回
- 实用辅助：`readonly`、`shallowReactive`、`markRaw`、`nextTick`

## <script setup> 宏
- `defineProps`/`defineEmits`：在编译期注入，支持 TS 类型推断
- `defineExpose`：对父组件暴露方法/状态以供 `ref` 访问
- `defineSlots`/`useSlots`、`useAttrs`：插槽与属性管理
- `defineModel`：组件内的 `v-model` 简化（3.4+），支持多模型与修饰符
- `defineOptions({ name })`：设置组件名便于调试与递归

## 组件通信
- Props → 子；`emits` → 父，事件命名 `update:modelValue` 配合 `v-model`
- 多 `v-model`：`v-model:title`、`v-model:open` 分别映射对应 prop
- 插槽：`<slot>` 与具名插槽；作用域插槽传递渲染上下文
- `provide`/`inject`：跨层级共享；用 `Symbol` 作为 key 更安全
- 暴露实例：父用模板 `ref` 调用子组件通过 `defineExpose` 暴露的方法

## 样式与模板
- `scoped`：局部样式隔离；深度选择器用 `:deep()` 作用到子组件
- 类与样式绑定：`class` 支持对象/数组；`style` 支持对象
- 表单修饰符：`v-model.number`、`v-model.trim`、`v-model.lazy` 控制输入
- 条件与列表：`v-if`/`v-show` 取舍（频繁切换用 `v-show`）；`v-for` 必须 `key`

## 路由与状态
- 路由（Vue Router 4）：`createRouter` + `createWebHistory`；导航守卫 `beforeEach`
- 组合式：`useRoute` 获取当前路由；`useRouter` 进行导航
- 滚动行为：`scrollBehavior` 保持历史或自定义滚动位置
- 状态（Pinia）：`defineStore`；`getters` 派生，`actions` 业务；`storeToRefs` 解构响应
- 持久化：Pinia 插件或手动 `localStorage` 同步；注意序列化和初始化时机

## 渲染与性能
- 代码拆分：动态导入与 `defineAsyncComponent`；路由懒加载
- 缓存：`<KeepAlive>` 缓存被包裹的动态组件；配合 `onActivated`/`onDeactivated`
- 过渡：`<Transition>` 单节点过渡；`<TransitionGroup>` 列表过渡需稳定 `key`
- 门户：`<Teleport to="#id">` 把子树渲染到目标容器
- Suspense：异步组件占位与完成态；适合数据预取的 Loading/Done UI
- 性能实践：避免不必要的 `deep` watch、稳定 `key`、减少频繁创建函数/对象

## TypeScript 与类型
- 组件 props/emit 类型：`defineProps<T>()`、`defineEmits<E>()` 提供静态校验
- 模板 `ref` 类型：`const el = ref<HTMLElement | null>(null)`，使用前判空
- 事件与插槽类型：通过接口或泛型约束提高可维护性
- 组合式类型：为 composable 返回结构定义明确类型以提升可读性

## 常见模式
- Composables：以 `useXxx` 命名共享逻辑，返回最小必要的 API
- 数据获取：在 `onMounted` 或路由守卫中触发；错误与 Loading 状态同构
- 表单封装：用受控组件与 `v-model` 聚合验证（如自定义输入组件）
- 权限与路由：路由 `meta` 标注权限，守卫中校验并重定向
- 国际化：Vue I18n 组合式接口；避免在模板中做复杂逻辑

## 易踩坑与建议
- 解构 `reactive` 会失去响应式；用 `toRefs` 或只解构 `computed/ref`
- Props 是只读；需要本地可变状态时复制到本地 `ref`/`reactive`
- `watch` 深度监听昂贵；优先监听具体 `ref` 或 getter
- 频繁条件切换用 `v-show` 减少节点创建；复杂 DOM 改变用 `Transition`
- 组件 `name` 有助于调试与 `<KeepAlive include>`；用 `defineOptions({ name })`
- 事件校验：声明 `emits`，避免拼写错误与未使用事件
- SSR/水合：避免在渲染期间访问只存在于浏览器的 API；用 `onMounted`

## 工具与测试
- DevTools：组件树、响应式依赖、事件/路由检查
- 测试：Vue Test Utils + Vitest；优先测试逻辑（composables）与交互而非样式
