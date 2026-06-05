<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  result: {
    type: Object,
    default: () => ({})
  },
  total: {
    type: [Number, String],
    default: null
  },
  created: {
    type: [Number, String],
    default: null
  },
  updated: {
    type: [Number, String],
    default: null
  },
  failed: {
    type: [Number, String],
    default: null
  },
  reasons: {
    type: [Array, String, Object],
    default: undefined
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

function readCount(propName, resultKeys) {
  if (props[propName] !== null && props[propName] !== undefined) {
    return Number(props[propName]) || 0
  }

  const source = props.result || {}
  for (const key of resultKeys) {
    if (source[key] !== null && source[key] !== undefined) {
      return Number(source[key]) || 0
    }
  }
  return 0
}

const totalCount = computed(() => readCount('total', ['total', 'totalCount', 'count']))
const createdCount = computed(() => readCount('created', ['created', 'createSuccess', 'insertSuccess', 'addSuccess']))
const updatedCount = computed(() => readCount('updated', ['updated', 'updateSuccess', 'modifySuccess']))
const failedCount = computed(() => readCount('failed', ['failed', 'fail', 'failCount', 'failureCount']))

const failureReasons = computed(() => {
  const rawReasons = props.reasons ?? props.result?.reasons ?? props.result?.failReasons ?? props.result?.errors ?? []
  const sourceReasons = Array.isArray(rawReasons) ? rawReasons : [rawReasons]
  return sourceReasons
    .map((item) => {
      if (typeof item === 'string') return item
      return item?.message || item?.reason || item?.error || ''
    })
    .map((item) => String(item).trim())
    .filter(Boolean)
})

const statItems = computed(() => [
  { label: '导入总行数：', value: totalCount.value, className: 'total' },
  { label: '新增成功数：', value: createdCount.value, className: 'created' },
  { label: '修改成功数：', value: updatedCount.value, className: 'updated' },
  { label: '失败总数：', value: failedCount.value, className: 'failed' }
])

function close() {
  emit('update:modelValue', false)
}

function onDialogClose() {
  emit('close')
}
</script>

<template>
  <el-dialog
    class="import-result-dialog"
    :model-value="modelValue"
    title="导入结果"
    width="700px"
    align-center
    destroy-on-close
    :close-on-click-modal="false"
    @close="onDialogClose"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <div class="import-result-content">
      <div class="result-stats" aria-label="导入统计">
        <div v-for="item in statItems" :key="item.className" class="stat-item">
          <span class="stat-label">{{ item.label }}</span>
          <span class="stat-value" :class="`stat-value--${item.className}`">{{ item.value }}</span>
        </div>
      </div>
      
      <div class="failure-section">
        <div class="failure-title">失败原因：</div>
        <div class="failure-box">
          <template v-if="failureReasons.length">
            <div v-for="(reason, index) in failureReasons" :key="`${reason}-${index}`" class="failure-line">
              {{ reason }}
            </div>
          </template>
          <div v-else class="failure-empty">
            {{ failedCount > 0 ? '暂无失败原因明细' : '本次导入无失败记录' }}
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" class="close-btn" @click="close">关 闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.import-result-content {
  padding: 8px 10px 0;
}

.result-stats {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 18px 24px;
  color: var(--el-text-color-primary);
  font-size: 16px;
  line-height: 24px;
}

.stat-item {
  display: inline-flex;
  align-items: baseline;
  white-space: nowrap;
}

.stat-label {
  font-weight: 500;
}

.stat-value {
  margin-left: 8px;
  font-weight: 700;
}

.stat-value--created {
  color: #00b050;
}

.stat-value--updated {
  color: var(--el-color-primary);
}

.stat-value--failed {
  color: #ff3b3b;
}

.failure-section {
  margin-top: 28px;
}

.failure-title {
  margin-bottom: 12px;
  color: #ff3b3b;
  font-size: 16px;
  font-weight: 700;
  line-height: 22px;
}

.failure-box {
  min-height: 98px;
  max-height: 170px;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid #ffb9b9;
  border-radius: 4px;
  background: #fff1f1;
}

.failure-line {
  color: #ff3b3b;
  font-size: 16px;
  line-height: 31px;
}

.failure-empty {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  line-height: 24px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}

.close-btn {
  min-width: 76px;
  height: 38px;
  font-size: 16px;
  font-weight: 600;
}

@media (max-width: 640px) {
  .import-result-content {
    padding-inline: 0;
  }

  .result-stats {
    gap: 10px 16px;
    font-size: 14px;
  }

  .failure-title,
  .failure-line {
    font-size: 14px;
  }
}
</style>

<style>
.import-result-dialog.el-dialog {
  border-radius: 8px;
}

.import-result-dialog.el-dialog .el-dialog__header {
  padding: 24px 30px 12px;
  margin-right: 0;
}

.import-result-dialog.el-dialog .el-dialog__title {
  color: #1f2329;
  font-size: 18px;
  font-weight: 700;
  line-height: 26px;
}

.import-result-dialog.el-dialog .el-dialog__headerbtn {
  top: 20px;
  right: 20px;
  width: 28px;
  height: 28px;
}

.import-result-dialog.el-dialog .el-dialog__headerbtn .el-dialog__close {
  color: #8c8c8c;
  font-size: 22px;
}

.import-result-dialog.el-dialog .el-dialog__body {
  padding: 22px 30px 18px;
}

.import-result-dialog.el-dialog .el-dialog__footer {
  padding: 20px 30px 24px;
}

@media (max-width: 640px) {
  .import-result-dialog.el-dialog {
    width: calc(100vw - 28px) !important;
  }

  .import-result-dialog.el-dialog .el-dialog__header,
  .import-result-dialog.el-dialog .el-dialog__body,
  .import-result-dialog.el-dialog .el-dialog__footer {
    padding-left: 20px;
    padding-right: 20px;
  }
}
</style>
