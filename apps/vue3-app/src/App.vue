<script setup>
import { ref, computed, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ThemeKey, ThemeMutatorKey } from './injectionKeys.js'

const router = useRouter()
const route = useRoute()
const active = computed(() => route.path)
const onSelect = (index) => router.push(index)

const theme = ref('light')
const setTheme = (val) => {
  theme.value = val
}
provide(ThemeKey, theme)
provide(ThemeMutatorKey, setTheme)
</script>

<template>
  <el-container>
    <el-header>
      <el-row align="middle" justify="space-between">
        <el-menu mode="horizontal" :default-active="active" @select="onSelect" :ellipsis="false">
          <el-menu-item index="/">首页</el-menu-item>
          <el-menu-item index="/demo">演示组件</el-menu-item>
          <el-menu-item index="/hong">Hong 组件</el-menu-item>
          <el-menu-item index="/dial/pool">拨测池管理</el-menu-item>
          <el-menu-item index="/trafficForwarding">流量转发</el-menu-item>
          <el-menu-item index="/trafficWarning">流量告警</el-menu-item>
          <el-menu-item index="/trafficForwardingAlert">流量转发告警</el-menu-item>
          <el-menu-item index="/probeGroup">探针分组</el-menu-item>
          <el-menu-item index="/nextPage">告警规则</el-menu-item>
        </el-menu>
        <el-space>
          <el-select v-model="theme" style="width: 140px">
            <el-option label="Light" value="light" />
            <el-option label="Dark" value="dark" />
          </el-select>
        </el-space>
      </el-row>
    </el-header>
    <el-main>
      <RouterView />
    </el-main>
  </el-container>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}

/* 其余样式使用 Element Plus 组件默认样式 */
</style>
