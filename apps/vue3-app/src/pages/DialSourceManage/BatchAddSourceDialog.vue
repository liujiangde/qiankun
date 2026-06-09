<script setup>
import { reactive, watch, ref, shallowRef } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { queryDialSourceOptionsApi } from '@/api/dial'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  poolId: { type: [String, Number], default: '' }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const formRef = ref(null)
const loading = ref(false)
const rawOptions = shallowRef([])
const filteredOptions = shallowRef([])
const matchedRawOptions = shallowRef([])
const optionMap = shallowRef(new Map())
const form = reactive({
  ips: []
})

const SEARCH_DEBOUNCE_MS = 180
const INITIAL_VISIBLE_COUNT = 10
let searchTimer = null

const rules = {
  ips: [{ type: 'array', required: true, message: '请选择物理机IP', trigger: 'change' }]
}

function close() {
  emit('update:modelValue', false)
}

function toOption(item) {
  return { value: item.ip, label: `${item.ip} / ${item.name}` }
}

function resetVisibleOptions() {
  filteredOptions.value = matchedRawOptions.value.slice(0, INITIAL_VISIBLE_COUNT).map(toOption)
}

function reset() {
  form.ips = []
  formRef.value?.clearValidate?.()
  matchedRawOptions.value = rawOptions.value
  resetVisibleOptions()
}

async function fetchOptions() {
  loading.value = true
  try {
    // 弹框打开时按当前拨测池拉取候选拨测源
    const list = await queryDialSourceOptionsApi({ poolId: props.poolId })
    const safeList = Array.isArray(list)
      ? list
          .map((item) => (typeof item === 'string' ? { ip: item, name: item } : item))
          .filter((item) => typeof item?.ip === 'string' && item.ip)
      : []
    rawOptions.value = safeList

    const nextMap = new Map()
    for (let i = 0; i < safeList.length; i++) {
      const item = safeList[i]
      nextMap.set(item.ip, item)
    }

    matchedRawOptions.value = safeList
    resetVisibleOptions()
    optionMap.value = nextMap
  } finally {
    loading.value = false
  }
}

function applySearch(keyword) {
  const query = String(keyword ?? '').trim().toLowerCase()
  if (!query) {
    matchedRawOptions.value = rawOptions.value
    resetVisibleOptions()
    return
  }
  const matched = []
  for (let i = 0; i < rawOptions.value.length; i++) {
    const item = rawOptions.value[i]
    if (`${item.ip} ${item.name}`.toLowerCase().includes(query)) {
      matched.push(item)
    }
  }
  matchedRawOptions.value = matched
  resetVisibleOptions()
}

function onSearchKeywordChange(keyword) {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    applySearch(keyword)
  }, SEARCH_DEBOUNCE_MS)
}

watch(
  () => props.modelValue,
  async (v) => {
    if (!v) return
    reset()
    // 每次打开都重新拉取，避免候选列表使用旧数据
    await fetchOptions()
  }
)

async function onConfirm() {
  const ok = await formRef.value?.validate?.().catch(() => false)
  if (!ok) return
  // 回传完整选项，父页面可直接拿到 ip/name 做新增
  emit(
    'submit',
    form.ips.map((ip) => optionMap.value.get(ip)).filter(Boolean)
  )
  close()
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="批量添加拨测源"
    width="980px"
    align-center
    :close-on-click-modal="false"
    destroy-on-close
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="dlg-form">
      <el-form-item label="物理机IP" prop="ips" required>
        <el-select-v2
          v-model="form.ips"
          multiple
          filterable
          remote
          collapse-tags
          :max-collapse-tags="5"
          collapse-tags-tooltip
          clearable
          :suffix-icon="Search"
          placeholder="请选择物理机IP"
          size="large"
          style="width: 100%"
          :loading="loading"
          :options="filteredOptions"
          :remote-method="onSearchKeywordChange"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dlg-footer">
        <el-button size="large" @click="close">取 消</el-button>
        <el-button size="large" type="primary" @click="onConfirm">确 定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.dlg-form {
  padding: 6px 8px 0;
}

.dlg-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

</style>
