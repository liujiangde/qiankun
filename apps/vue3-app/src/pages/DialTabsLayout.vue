<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()

const tabRoutes = {
  pool: '/dial/pool',
  source: '/dial/source',
  rule: '/dial/rule',
  viz: '/dial/viz',
  probeGroup: '/dial/probeGroup'
}

const pathToTab = (path) => {
  if (path === '/dial/pool') return 'pool'
  if (path === '/dial/source') return 'source'
  if (path === '/dial/rule') return 'rule'
  if (path === '/dial/viz') return 'viz'
  if (path === '/dial/probeGroup') return 'probeGroup'
  return 'pool'
}

const activeTab = computed({
  get: () => pathToTab(route.path),
  set: (name) => {
    const path = tabRoutes[name]
    if (path && path !== route.path) router.push(path)
  }
})

function onTabChange(name) {
  const path = tabRoutes[name]
  if (path && path !== route.path) {
    router.push(path)
    return
  }
  if (!path) ElMessage.info('该模块暂未实现（示例页面）')
}
</script>

<template>
  <div class="page">
    <el-tabs v-model="activeTab" class="top-tabs" @tab-change="onTabChange">
      <el-tab-pane label="拨测池管理" name="pool" />
      <el-tab-pane label="拨测源管理" name="source" />
      <el-tab-pane label="拨测规则" name="rule" />
      <el-tab-pane label="拨测可视化" name="viz" />
      <el-tab-pane label="探针分组" name="probeGroup" />
    </el-tabs>
    <router-view />
  </div>
</template>

<style scoped>
.page {
  padding: 16px;
}

.top-tabs {
  margin-bottom: 12px;
}
</style>
