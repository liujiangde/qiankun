<script setup>
/**
 * 采集策略 Tab 栏：仅负责标签头与「+ 新增策略」
 *
 * 表单体在父组件单块 el-form 内通过 activePolicy 渲染；切换 Tab 用 :key="activeId" 重置校验状态
 */
defineProps({
  /** 当前分组下全部策略行（至少一项），展示为 Tab 文案 + name */
  policies: { type: Array, required: true },
  /** 当前激活策略 id，与 el-tabs v-model 双向绑定 */
  activeId: { type: String, required: true }
})

const emit = defineEmits([
  'update:activeId', // 用户切换 Tab，payload 为策略 id
  'add', // 点击「+ 新增策略」，父组件应 wrapAddPolicyWithValidate 后再调 usePolicyTabs.addPolicy
  'remove' // el-tabs 关闭，payload 为被关闭 Tab 的 name（即策略 id）
])
</script>

<template>
  <div class="policy-tab-bar">
    <!--
      仅展示 Tab 头，内容区由父组件渲染：
      父组件通过 activePolicy 计算当前策略，并用 :key="activeId" 控制表单校验状态重置
    -->
    <el-tabs
      :model-value="activeId"
      class="policy-tab-bar__tabs policy-tab-bar__tabs--headers-only"
      closable
      @update:model-value="emit('update:activeId', $event)"
      @tab-remove="emit('remove', $event)"
    >
      <el-tab-pane v-for="p in policies" :key="p.id" :name="p.id">
        <template #label>
          <span class="policy-tab-label">
            <span v-if="String(p?.status ?? '').toLowerCase() !== 'enable'" class="policy-tab-label__mark">*</span>
            <span>{{ p.name }}</span>
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>
    <el-button type="primary" link class="policy-tab-bar__add" @click="emit('add')">+ 新增策略</el-button>
  </div>
</template>

<style scoped>
.policy-tab-bar {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  margin-bottom: 20px;
}
.policy-tab-bar__tabs {
  flex: 1;
  min-width: 0;
}
.policy-tab-bar__tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}
/* 表单项在 Tab 下方单独渲染，仅使用 Tab 做切换 */
.policy-tab-bar__tabs--headers-only :deep(.el-tabs__content) {
  display: none;
}
.policy-tab-bar__add {
  flex-shrink: 0;
  margin-bottom: 10px;
  padding-left: 8px;
}
.policy-tab-label {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.policy-tab-label__mark {
  color: var(--el-color-danger);
  font-weight: 700;
  line-height: 1;
}
</style>
