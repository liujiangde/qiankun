<script setup>
import { ref, reactive, watchEffect, readonly, shallowReactive, markRaw, nextTick, inject } from 'vue'
import { ThemeKey, ThemeMutatorKey } from '../injectionKeys.js'

// 计数与 nextTick 示例：更新后读取 DOM
const count = ref(0)
const countEl = ref(null)
const domInfo = ref('')
const inc = async () => {
  count.value++
  await nextTick()
  domInfo.value = countEl.value ? `count 标签宽度 ${countEl.value.offsetWidth}px` : '未获取到元素'
}
const dec = async () => {
  count.value--
  await nextTick()
  domInfo.value = countEl.value ? `count 标签宽度 ${countEl.value.offsetWidth}px` : '未获取到元素'
}

// watchEffect 示例：自动依赖收集，并在回调中注册清理
const status = ref('')

watchEffect((onCleanup) => {
  const h = setTimeout(() => {
    status.value = `已同步值 ${count.value}`
  }, 600)
  onCleanup(() => {
    clearTimeout(h)
  })
})

// readonly 示例：对外只读，写入将被忽略并在开发环境警告
const innerScore = ref(100)
const publicScore = readonly(innerScore)
const tryWriteReadonly = () => { publicScore.value++ }

// shallowReactive 示例：仅追踪顶层属性，嵌套对象变更不触发更新
const shallowState = shallowReactive({ meta: { nested: { count: 0 } } })
const nestedIncNoTrigger = () => { shallowState.meta.nested.count++ }
const replaceTopTrigger = () => {
  shallowState.meta = { nested: { count: shallowState.meta.nested.count } }
}

// markRaw 示例：将第三方/大型对象标记为非响应式，内部变更不触发更新
const external = reactive({ raw: markRaw(new Map()) })
const addRawItemNoTrigger = () => { external.raw.set(Date.now(), Math.random()) }
const replaceRawTrigger = () => { external.raw = markRaw(new Map(external.raw)) }

const theme = inject(ThemeKey, ref('light'))
const setTheme = inject(ThemeMutatorKey, (v) => {})
</script>

<template>
  <el-card>
    <template #header>
      <div>演示组件</div>
    </template>
    <el-space>
      <el-tag type="info">主题 {{ theme }}</el-tag>
      <el-button @click="setTheme('light')">Light</el-button>
      <el-button @click="setTheme('dark')">Dark</el-button>
      <el-button type="primary" @click="inc">增加</el-button>
      <el-button type="warning" @click="dec">减少</el-button>
      <!-- nextTick：在 DOM 更新后读取元素尺寸 -->
      <el-tag type="success" ref="countEl">当前值 {{ count }}</el-tag>
      <el-tag type="info">{{ domInfo || '等待 DOM 更新...' }}</el-tag>
      <el-tag type="info">{{ status || '未同步' }}</el-tag>
    </el-space>

    <el-divider>readonly</el-divider>
    <el-space>
      <!-- readonly：只读代理，写入将被忽略 -->
      <el-tag type="success">{{publicScore.value}}只读分数 {{ publicScore }}</el-tag>
      <el-tag type="success">{{innerScore.value}}实际分数 {{ innerScore }}</el-tag>
      <el-button type="danger" @click="publicScore++">尝试写入只读分数</el-button>
      <el-button type="default" @click="innerScore++">实际分数+1（内部）</el-button>
    </el-space>

    <el-divider>shallowReactive</el-divider>
    <el-space>
      <!-- shallowReactive：嵌套变更不触发，顶层替换才触发 -->
      <el-tag type="warning">嵌套计数（显示可能不变） {{ shallowState.meta.nested.count }}</el-tag>
      <el-button @click="nestedIncNoTrigger">嵌套自增（不触发）</el-button>
      <el-button type="primary" @click="replaceTopTrigger">顶层替换（触发）</el-button>
    </el-space>

    <el-divider>markRaw</el-divider>
    <el-space>
      <!-- markRaw：非响应式对象，内部变更不触发；替换引用触发 -->
      <el-tag>raw Map 大小 {{ external.raw.size }}</el-tag>
      <el-button @click="addRawItemNoTrigger">向 raw 添加项（不触发）</el-button>
      <el-button type="primary" @click="replaceRawTrigger">替换 raw（触发）</el-button>
    </el-space>
  </el-card>
</template>

<style scoped>
</style>
