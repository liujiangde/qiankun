<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CircleCheck } from '@element-plus/icons-vue'
import { queryDialRuleAlertTagsApi, testDialRuleConnectivityApi } from '@/api/dial'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  poolOptions: { type: Array, default: () => [] },
  title: { type: String, default: '新增拨测规则' },
  initialData: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const methodOptions = [
  { label: 'ping', value: 'ping' },
  { label: 'tcp', value: 'tcp' },
  { label: 'http/https', value: 'http/https' }
]

// 目标对象类型
const targetTypeOptions = [
  { label: 'IP/主机', value: 'ip' },
  { label: 'HTTP(S) 地址', value: 'url' }
]

const alertConditionOptions = [
  { label: '1个', value: 'one' },
  { label: '全部', value: 'all' }
]

// 目标对象候选（可按需从接口或 props 传入）
const targetOptions = ref([
  { label: '192.168.1.1', value: '192.168.1.1', type: 'ip' },
  { label: '192.168.1.2', value: '192.168.1.2', type: 'ip' },
  { label: 'http://example.com', value: 'http://example.com', type: 'url' },
  { label: 'https://api.example.com', value: 'https://api.example.com', type: 'url' }
])

const filteredTargetOptions = computed(() => {
  const t = form.targetType
  if (!t) return targetOptions.value
  return targetOptions.value.filter((opt) => opt.type === t)
})

const formRef = ref(null)
const testing = ref(false)
const alertTagsLoading = ref(false)
const alertTags = ref([])
const form = reactive({
  pool: '',
  method: '',
  targetType: '',
  targetValue: '',
  port: '',
  cron: '',
  timeoutMs: 5000,
  retry: 0,
  isOpen: false,
  alertCondition: '',
  alertContent: '',
  compressTime: 30
})

// Cron 表达式各段允许的取值范围（支持 5 段/6 段，含秒）
const CRON_FIELD_RANGES_5 = [
  { min: 0, max: 59 }, // 分
  { min: 0, max: 23 }, // 时
  { min: 1, max: 31 }, // 日
  { min: 1, max: 12 }, // 月
  { min: 0, max: 7 } // 周 (0 和 7 都表示周日)
]
const CRON_FIELD_RANGES_6 = [
  { min: 0, max: 59 }, // 秒
  ...CRON_FIELD_RANGES_5
]

function validateCronField(field, range) {
  if (field === '*' || field === '?') return true
  return field.split(',').every((part) => {
    const [rangePart, stepPart] = part.split('/')
    if (stepPart !== undefined && !/^\d+$/.test(stepPart)) return false
    if (stepPart !== undefined && Number(stepPart) <= 0) return false

    if (rangePart === '*') return true
    if (rangePart.includes('-')) {
      const [startStr, endStr] = rangePart.split('-')
      if (!/^\d+$/.test(startStr) || !/^\d+$/.test(endStr)) return false
      const start = Number(startStr)
      const end = Number(endStr)
      if (start > end) return false
      return start >= range.min && end <= range.max
    }
    if (!/^\d+$/.test(rangePart)) return false
    const num = Number(rangePart)
    return num >= range.min && num <= range.max
  })
}

function validateCron(_rule, value, callback) {
  const v = String(value ?? '').trim()
  if (!v) return callback(new Error('请输入拨测频率'))
  const fields = v.split(/\s+/)
  if (fields.length !== 5 && fields.length !== 6) {
    return callback(new Error('Cron 表达式需为 5 段或 6 段，以空格分隔'))
  }
  const ranges = fields.length === 6 ? CRON_FIELD_RANGES_6 : CRON_FIELD_RANGES_5
  for (let i = 0; i < fields.length; i++) {
    if (!validateCronField(fields[i], ranges[i])) {
      return callback(new Error(`Cron 表达式第 ${i + 1} 段不合法`))
    }
  }
  callback()
}

function validateAlertCondition(_rule, value, callback) {
  if (!form.isOpen) return callback()
  if (!value) return callback(new Error('请选择告警条件'))
  callback()
}

function validateAlertContent(_rule, value, callback) {
  if (!form.isOpen) return callback()
  if (!String(value ?? '').trim()) return callback(new Error('请输入告警内容'))
  callback()
}

function validateCompressTime(_rule, value, callback) {
  if (!form.isOpen) return callback()
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return callback(new Error('请输入大于 0 的告警压缩时间'))
  callback()
}

const rules = {
  pool: [{ required: true, message: '请选择拨测池', trigger: 'change' }],
  method: [{ required: true, message: '请选择拨测方式', trigger: 'change' }],
  targetType: [{ required: true, message: '请选择对象类型', trigger: 'change' }],
  targetValue: [{ required: true, message: '请选择或输入目标对象', trigger: ['blur', 'change'] }],
  cron: [
    { required: true, message: '请输入拨测频率', trigger: 'blur' },
    { validator: validateCron, trigger: 'blur' }
  ],
  timeoutMs: [{ required: true, message: '请输入超时时间', trigger: 'blur' }],
  retry: [{ required: true, message: '请输入重试次数', trigger: 'blur' }],
  alertCondition: [{ validator: validateAlertCondition, trigger: 'change' }],
  alertContent: [{ validator: validateAlertContent, trigger: 'blur' }],
  compressTime: [{ validator: validateCompressTime, trigger: 'blur' }]
}

function close() {
  emit('update:modelValue', false)
}

function reset() {
  form.pool = ''
  form.method = ''
  form.targetType = ''
  form.targetValue = ''
  form.port = ''
  form.cron = ''
  form.timeoutMs = 5000
  form.retry = 0
  form.isOpen = false
  form.alertCondition = ''
  form.alertContent = ''
  form.compressTime = 30
  formRef.value?.clearValidate?.()
}

function splitTarget(target) {
  const value = String(target ?? '').trim()
  if (!value) return { targetType: '', targetValue: '', port: '' }
  if (/^https?:\/\//i.test(value)) {
    return { targetType: 'url', targetValue: value, port: '' }
  }
  const idx = value.lastIndexOf(':')
  if (idx > -1 && /^\d+$/.test(value.slice(idx + 1))) {
    return {
      targetType: 'ip',
      targetValue: value.slice(0, idx),
      port: value.slice(idx + 1)
    }
  }
  return { targetType: 'ip', targetValue: value, port: '' }
}

function parseTimeoutMs(timeout) {
  const value = String(timeout ?? '').trim()
  if (!value) return 5000
  if (value.endsWith('ms')) return Number(value.replace('ms', '')) || 5000
  if (value.endsWith('秒')) return (Number(value.replace('秒', '')) || 5) * 1000
  return Number(value) || 5000
}

async function fillForm(data) {
  reset()
  const target = splitTarget(data?.target)
  form.pool = String(data?.pool ?? '')
  form.method = String(data?.method ?? '')
  form.targetType = target.targetType
  await nextTick()
  form.targetValue = target.targetValue
  form.port = target.port
  form.cron = String(data?.cron ?? '')
  form.timeoutMs = parseTimeoutMs(data?.timeout)
  form.retry = Number(data?.retry ?? 0)
  form.isOpen = Boolean(data?.isOpen)
  form.alertCondition = String(data?.alertCondition ?? '')
  form.alertContent = String(data?.alertContent ?? '')
  form.compressTime = Number(data?.compressTime ?? 30)
}

/** 根据目标类型、目标值、端口组合为后端使用的 target 字符串 */
function buildTargetString() {
  const v = (form.targetValue || '').trim()
  if (!v) return ''
  if (form.targetType === 'url') return v
  const p = (form.port || '').trim()
  return p ? `${v}:${p}` : v
}

function buildPayload() {
  return {
    pool: form.pool,
    method: form.method,
    target: buildTargetString(),
    cron: form.cron.trim(),
    timeoutMs: Number(form.timeoutMs) || 5000,
    retry: Number(form.retry) || 0,
    isOpen: form.isOpen,
    alertCondition: form.isOpen ? form.alertCondition : '',
    alertContent: form.isOpen ? form.alertContent.trim() : '',
    compressTime: form.isOpen ? Number(form.compressTime) || 30 : 0
  }
}

async function fetchAlertTags() {
  alertTagsLoading.value = true
  try {
    const res = await queryDialRuleAlertTagsApi()
    alertTags.value = Array.isArray(res) ? res : []
  } finally {
    alertTagsLoading.value = false
  }
}

function onAppendTag(tag) {
  const t = String(tag ?? '').trim()
  if (!t) return
  form.alertContent += `{${t}}`
}

watch(
  () => props.modelValue,
  async (v) => {
    if (!v) return
    await fetchAlertTags()
    if (props.initialData) await fillForm(props.initialData)
    else reset()
  }
)

watch(
  () => form.targetType,
  () => {
    form.targetValue = ''
  }
)

watch(
  () => form.isOpen,
  (v) => {
    if (v) return
    form.alertCondition = ''
    form.alertContent = ''
    form.compressTime = 30
    formRef.value?.clearValidate?.(['alertCondition', 'alertContent', 'compressTime'])
  }
)

async function onConfirm() {
  const ok = await formRef.value?.validate?.().catch(() => false)
  if (!ok) return
  emit('submit', buildPayload())
  close()
}

async function onTest() {
  const ok = await formRef.value?.validate?.().catch(() => false)
  if (!ok) return
  testing.value = true
  try {
    const res = await testDialRuleConnectivityApi(buildPayload())
    if (res?.success === false) {
      ElMessage.error(res?.message || '连通性测试失败')
      return
    }
    ElMessage.success(res?.message || '连通性测试通过')
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="560px"
    class="create-rule-dialog"
    custom-class="create-rule-dialog"
    align-center
    :close-on-click-modal="false"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="dlg-form">
      <el-form-item label="拨测池" prop="pool" required>
        <el-select v-model="form.pool" placeholder="选择拨测池" style="width: 100%">
          <el-option
            v-for="opt in poolOptions"
            :key="opt.value ?? opt"
            :label="opt.label ?? opt"
            :value="opt.value ?? opt"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="拨测方式" prop="method" required>
        <el-select v-model="form.method" placeholder="选择拨测方式" style="width: 100%">
          <el-option
            v-for="opt in methodOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="目标对象" required class="target-object-row">
        <div class="target-object-fields">
          <el-form-item prop="targetType" class="target-type-field">
            <el-select
              v-model="form.targetType"
              placeholder="选择对象类型"
              style="width: 100%"
              clearable
            >
              <el-option
                v-for="opt in targetTypeOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item prop="targetValue" class="target-value-field">
            <el-select
              v-model="form.targetValue"
              placeholder="选择目标对象"
              filterable
              allow-create
              default-first-option
              style="width: 100%"
              clearable
            >
              <el-option
                v-for="opt in filteredTargetOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item prop="port" class="port-field">
            <el-input v-model="form.port" placeholder="端口" clearable />
          </el-form-item>
        </div>
      </el-form-item>

      <el-form-item label="拨测频率 (Cron表达式)" prop="cron" required>
        <el-input v-model="form.cron" placeholder="如: */5 * * * *" clearable />
      </el-form-item>

      <el-form-item label="超时时间(ms)" prop="timeoutMs" required>
        <el-input-number
          v-model="form.timeoutMs"
          :min="1"
          :max="300000"
          :step="1000"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="重试次数" prop="retry" required>
        <el-input-number v-model="form.retry" :min="0" :max="10" style="width: 100%" />
      </el-form-item>

      <el-form-item label="是否告警" prop="isOpen">
        <el-switch v-model="form.isOpen" />
      </el-form-item>

      <template v-if="form.isOpen">
        <el-form-item label="告警条件" prop="alertCondition" required>
          <el-select
            v-model="form.alertCondition"
            placeholder="选择异常拨测源个数"
            style="width: 100%"
          >
            <el-option
              v-for="opt in alertConditionOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="标签">
          <div class="alert-tag-list" v-loading="alertTagsLoading">
            <el-tag
              v-for="tag in alertTags"
              :key="tag"
              class="alert-tag-item"
              effect="light"
              @click="onAppendTag(tag)"
            >
              {{ tag }}
            </el-tag>
          </div>
        </el-form-item>

        <el-form-item label="告警内容" prop="alertContent" required>
          <el-input
            v-model="form.alertContent"
            type="textarea"
            :rows="3"
            placeholder="请输入告警内容"
            clearable
          />
        </el-form-item>

        <el-form-item label="告警压缩时间" prop="compressTime" required>
          <div class="compress-time-row">
            <el-input-number v-model="form.compressTime" :min="1" :max="1440" style="width: 100%" />
            <span class="compress-time-unit">分钟</span>
          </div>
        </el-form-item>
      </template>
    </el-form>

    <template #footer>
      <div class="dlg-footer">
        <div class="dlg-footer-left">
          <el-button :loading="testing" @click="onTest">
            <el-icon><CircleCheck /></el-icon>
            连通性测试
          </el-button>
        </div>
        <div class="dlg-footer-right">
          <el-button @click="close">取消</el-button>
          <el-button type="primary" @click="onConfirm">确定</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.dlg-form {
  padding: 6px 0 0;
}

:deep(.create-rule-dialog .el-dialog) {
  height: 300px;
  display: flex;
  flex-direction: column;
}

:deep(.create-rule-dialog .el-dialog__body) {
  flex: 1;
  overflow-y: auto;
}

.dlg-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.target-object-row :deep(.el-form-item__content) {
  display: block;
}

.target-object-fields {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.target-object-fields .target-type-field {
  flex: 0 0 120px;
  margin-bottom: 0;
}

.target-object-fields .target-value-field {
  flex: 1;
  min-width: 0;
  margin-bottom: 0;
}

.target-object-fields .port-field {
  flex: 0 0 100px;
  margin-bottom: 0;
}

.dlg-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
}

.dlg-footer-left {
  margin-right: auto;
}

.dlg-footer-right {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.dlg-footer-left .el-icon {
  margin-right: 4px;
}

.alert-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}

.alert-tag-item {
  cursor: pointer;
}

.compress-time-row {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 8px;
}

.compress-time-unit {
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}
</style>

<style>
.el-dialog.create-rule-dialog {
  height: 300px !important;
  min-height: 300px !important;
  max-height: 300px !important;
  display: flex;
  flex-direction: column;
}

.el-dialog.create-rule-dialog .el-dialog__body {
  flex: 1;
  overflow-y: auto;
}

/* 兼容 class 被挂在 overlay wrapper 的场景 */
/* .create-rule-dialog .el-dialog {
  height: 300px !important;
  min-height: 300px !important;
  max-height: 300px !important;
  display: flex;
  flex-direction: column;
}

.create-rule-dialog .el-dialog .el-dialog__body {
  flex: 1;
  overflow-y: auto;
} */
</style>
