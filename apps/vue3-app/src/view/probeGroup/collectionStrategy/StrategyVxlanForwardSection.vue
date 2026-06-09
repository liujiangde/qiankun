<script setup>
/**
 * VXLAN 转发配置公共区块（物理机 / 虚机 / 容器复用）
 *
 * 设计约定：
 * - 仅渲染字段，不持有业务状态；字段变化通过事件交回父组件写入
 * - 接收端增删不在本组件做边界判断（最多 3 个、至少 1 个），统一交由父组件组合函数处理
 */
import { CircleClose } from '@element-plus/icons-vue'

defineProps({
  /** 当前策略对象：须含 vni、rateLimit、receivers */
  policy: { type: Object, required: true }
})

const emit = defineEmits([
  'update-field', // 更新 vni / rateLimit 等顶层字段
  'update-receiver-ip', // 更新指定接收端 IP
  'add-receiver', // 新增接收端行（由父组件决定是否可加）
  'remove-receiver' // 删除接收端行（由父组件决定是否可删）
])

function updateField(field, value) {
  emit('update-field', field, value)
}

function updateReceiverIp(index, value) {
  emit('update-receiver-ip', index, value)
}
</script>

<template>
  <section class="form-block">
    <h3 class="block-title">VXLAN 协议转发</h3>
    <el-form-item label="标识 VNI" prop="vni" class="field-row">
      <el-input
        :model-value="policy.vni"
        class="field-input--vni"
        placeholder="请输入 VNI"
        clearable
        @update:model-value="updateField('vni', $event)"
      />
    </el-form-item>
    <el-form-item label="限速 (MB/s)" prop="rateLimit" class="field-row">
      <el-input-number
        :model-value="policy.rateLimit"
        class="field-input--rate-limit"
        :min="1"
        :max="100000"
        controls-position="right"
        @update:model-value="updateField('rateLimit', $event)"
      />
    </el-form-item>

    <!-- 接收端行：只负责渲染与触发事件，限制逻辑由父组件统一处理 -->
    <div class="receiver-head">
      <span class="receiver-head__text">接收端地址（最多 3 个）</span>
      <el-button type="primary" link @click="emit('add-receiver')">+ 添加接收端</el-button>
    </div>
    <div v-for="(row, idx) in policy.receivers" :key="row.id" class="receiver-row">
      <span class="receiver-index">接收端 {{ idx + 1 }}</span>
      <el-form-item :prop="`receivers.${idx}.ip`" class="receiver-form-item" label-width="0">
        <el-input
          :model-value="row.ip"
          placeholder="请输入 IP 地址"
          clearable
          class="receiver-input"
          @update:model-value="updateReceiverIp(idx, $event)"
        />
      </el-form-item>
      <el-button
        v-if="policy.receivers.length > 1"
        link
        type="danger"
        class="receiver-remove"
        @click="emit('remove-receiver', idx)"
      >
        <el-icon><CircleClose /></el-icon>
      </el-button>
    </div>
  </section>
</template>

<style scoped>
.receiver-row :deep(.el-form-item) {
  margin-bottom: 0;
  flex: 0 1 360px;
}
.field-input--vni {
  max-width: 120px;
  width: 100%;
}
.field-input--rate-limit {
  width: 160px;
}
.block-title {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.4;
}
.field-row {
  margin-bottom: 20px;
}
.field-row:last-child {
  margin-bottom: 0;
}
.receiver-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.receiver-head__text {
  font-size: 13px;
  color: var(--el-text-color-regular);
  flex: 1;
}
.receiver-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}
.receiver-form-item {
  margin-bottom: 0;
}
.receiver-row:last-child {
  margin-bottom: 0;
}
.receiver-index {
  flex-shrink: 0;
  width: 107px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}
.receiver-input {
  flex: 0 1 360px;
  max-width: 400px;
  min-width: 200px;
  width: 100%;
}
.receiver-remove {
  flex-shrink: 0;
  font-size: 18px;
}
</style>
