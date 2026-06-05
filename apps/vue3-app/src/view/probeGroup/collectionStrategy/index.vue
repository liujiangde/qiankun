<script setup>
/**
 * 探针分组 - 采集策略详情页（壳组件）
 *
 * 路由 query：id、name、type（与探针分组列表「采集策略」跳转一致）
 * - 子页面统一通过 tfRouteRule/list 拉取策略列表
 * - ROUTE_TYPE_CONFIG：中文类型 → strategyKind；unknown 时 activeStrategyComponent 仍用 PhysicalStrategy，并 el-alert 提示
 * - 子组件仅挂载一个，具体表单与保存逻辑在 PhysicalStrategy / VirtualMachineStrategy / ContainerStrategy
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import PhysicalStrategy from './PhysicalStrategy.vue'
import VirtualMachineStrategy from './VirtualMachineStrategy.vue'
import ContainerStrategy from './ContainerStrategy.vue'

const route = useRoute()
const router = useRouter()

/** 探针分组 ID，来自路由 ?id= */
const groupId = computed(() => String(route.query.id ?? ''))
/** 分组名称展示用，来自路由 ?name= */
const groupName = computed(() => String(route.query.name ?? ''))
/** 原始类型文案，与探针分组列表「类型」列一致 */
const rawType = computed(() => String(route.query.type ?? '').trim())

/** collectionStrategy 路由类型兼容：中文 + vm/pm/container（含 physical 历史值） */
const ROUTE_TYPE_CONFIG = {
  物理: { kind: 'pm', badge: '物理机' },
  pm: { kind: 'pm', badge: '物理机' },
  physical: { kind: 'pm', badge: '物理机' },
  虚拟机: { kind: 'vm', badge: '虚拟机' },
  虚机: { kind: 'vm', badge: '虚拟机' },
  vm: { kind: 'vm', badge: '虚拟机' },
  容器: { kind: 'container', badge: '容器' },
  container: { kind: 'container', badge: '容器' }
}

const resolvedRouteTypeConfig = computed(() => {
  const normalized = rawType.value.toLowerCase()
  return ROUTE_TYPE_CONFIG[rawType.value] ?? ROUTE_TYPE_CONFIG[normalized]
})

/** 将中文类型映射为子组件分支：pm | vm | container | unknown */
const strategyKind = computed(() => resolvedRouteTypeConfig.value?.kind ?? 'unknown')

const typeBadge = computed(() => resolvedRouteTypeConfig.value?.badge ?? '未指定类型')

/** 与 strategyKind 对应要挂载的子组件；unknown 时按物理机 */
const STRATEGY_COMPONENT_BY_KIND = {
  pm: PhysicalStrategy,
  vm: VirtualMachineStrategy,
  container: ContainerStrategy
}

const activeStrategyComponent = computed(() => {
  const k = strategyKind.value === 'unknown' ? 'pm' : strategyKind.value
  return STRATEGY_COMPONENT_BY_KIND[k] ?? null
})

/** 与设计稿一致：分组: 名称 (类型说明) */
const groupSubtitleLine = computed(() => {
  const name = groupName.value || '—'
  const typeHint = typeBadge.value || rawType.value || '未指定类型'
  return `分组: ${name} (${typeHint})`
})

/** 返回探针分组列表 */
function goBack() {
  router.push({ name: 'dial-probeGroup' })
}

</script>

<template>
  <div class="page">
    <!-- 返回列表 -->
    <div class="page-head">
      <el-button link type="primary" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        返回探针分组
      </el-button>
    </div>
    <!-- 标题区：分组信息与关闭 -->
    <header class="strategy-page-header">
      <div class="strategy-page-header__info">
        <h2 class="strategy-page-header__title">采集策略设置</h2>
        <p class="strategy-page-header__subtitle">
          {{ groupSubtitleLine }}
          <span v-if="groupId" class="strategy-page-header__id"> · ID {{ groupId }}</span>
        </p>
      </div>
    </header>

    <!-- 策略表单：按类型动态挂载唯一子组件，统一传入 groupId / groupName -->
    <div class="card">
      <el-alert
        v-if="strategyKind === 'unknown'"
        type="warning"
        :closable="false"
        show-icon
        class="type-alert"
        title="未识别分组类型，已按物理机策略展示；请从探针分组列表进入以携带类型。"
      />

      <component
        :is="activeStrategyComponent"
        v-if="activeStrategyComponent"
        :group-id="groupId"
        :group-name="groupName"
      />
    </div>
  </div>
</template>

<style scoped>
/* 页面与页头布局 */
.page {
  padding: 16px;
}
.page-head {
  margin-bottom: 12px;
}
.strategy-page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding-bottom: 8px;
  margin-bottom: 8px;
}
.strategy-page-header__info {
  min-width: 0;
}
.strategy-page-header__title {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.3;
}
.strategy-page-header__subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}
.strategy-page-header__id {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}
.card {
  min-height: 200px;
  padding: 0;
  background: var(--el-bg-color);
}
.type-alert {
  margin-bottom: 16px;
}
</style>
