<script setup>
/**
 * 新增/编辑探针分组弹窗：步骤 0 基本信息，步骤 1 规则 OR + 匹配主机多选。
 * 两步共用同一 el-form；规则数据为 form.ruleGroup + form.relation，与接口 rule 结构一致。
 * 右侧列表由「预览」或编辑模式下进入第二步时自动请求 fetchMatchedCollectors（未传则走内置 mock）；提交前须已成功预览过一次。
 */
import { nextTick, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'create' },
  regionOptions: {
    type: Array,
    default: () => [
      { label: '黄山', value: '黄山' },
      { label: '上海', value: '上海' },
      { label: '北京', value: '北京' }
    ]
  },
  typeOptions: { type: Array, default: () => [] },
  initialSelectedCollectors: { type: Array, default: () => [] },
  /** 编辑回填：name / type / region / status；rule 为 JSON 字符串，解析后含 ruleGroup 数组、relation、可选 matchedCollectors / collectors */
  initialData: { type: Object, default: null },
  /**
   * 根据规则集查询匹配主机。入参：{ type, region, rule: { ruleGroup: { field, operator, value }[], relation } }
   * 应返回与列表行一致的对象数组，至少含 id、name、ip、status。
   * 未传入时在组件内用本地 mock 数据按相同规则过滤，便于联调前演示。
   */
  fetchMatchedCollectors: { type: Function, default: null },
  /**
   * 创建/修改提交：由父组件调用真实接口；须返回 Promise，失败时 throw 或 reject，弹窗不关闭。
   * 未传入时回退为 emit('submit')（无法等待接口，仅兼容旧用法）。
   */
  submitRequest: { type: Function, default: null }
})

const emit = defineEmits(['update:modelValue', 'submit'])

// --- 步骤与表单：step 0 基本信息，step 1 规则与成员 ---
const step = ref(0)
const formRef = ref(null)
/** 「预览」接口返回的当前匹配主机，用于右侧列表 */
const matchedCollectors = ref([])
/** 是否已至少成功执行过一次预览（提交前置条件） */
const hasPreviewed = ref(false)
const previewLoading = ref(false)
const submitLoading = ref(false)
function emptyRuleRow() {
  return { id: Date.now() + Math.random(), field: 'hostname', operator: 'contains', value: '' }
}

/** 将存储中的单条规则规范为 { field, operator, value } */
function normalizeStoredRuleItem(r) {
  if (!r || typeof r !== 'object') return null
  let field = r.field === 'name' ? 'hostname' : r.field
  if (field !== 'hostname' && field !== 'ip') field = 'hostname'
  const op = r.operator ?? r.match
  const opMap = {
    eq: 'equals',
    neq: 'notEquals',
    equals: 'equals',
    notEquals: 'notEquals',
    contains: 'contains',
    notContains: 'notContains'
  }
  const operator = opMap[op] ?? 'contains'
  return { field, operator, value: String(r.value ?? '') }
}

function normalizeCollectorForList(c) {
  return {
    id: c.id,
    name: c.name ?? '',
    ip: c.ip ?? '',
    status: c.status ?? '—',
    type: c.type,
    region: c.region
  }
}

/**
 * 解析行上的 rule 字符串（或对象）：得到表单行、relation、可选 matchedCollectors。
 * 支持 JSON：{ ruleGroup: [...], relation?, matchedCollectors?, collectors? }（ruleGroup 为规则数组）或直接为规则数组。
 */
function parseRuleGroupStorage(raw) {
  if (raw == null || raw === '') return null
  let obj = raw
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw)
    } catch {
      return null
    }
  }
  let ruleArr
  let relation = 'or'
  let matchedFromStore
  let collectorsFromStore
  if (Array.isArray(obj)) {
    ruleArr = obj
  } else if (obj && typeof obj === 'object' && Array.isArray(obj.ruleGroup)) {
    ruleArr = obj.ruleGroup
    if (obj.relation != null && obj.relation !== '') relation = String(obj.relation)
    matchedFromStore = obj.matchedCollectors
    collectorsFromStore = obj.collectors
  } else {
    return null
  }
  const plainRules = ruleArr.map(normalizeStoredRuleItem).filter(Boolean)
  if (!plainRules.length) return null
  const formRows = plainRules.map((pr) => ({
    id: Date.now() + Math.random(),
    field: pr.field,
    operator: pr.operator,
    value: pr.value
  }))
  return { plainRules, relation, formRows, matchedFromStore, collectorsFromStore }
}

/**
 * 提交：整段 rule 转 JSON 字符串。含 ruleGroup、relation；并写入 matchedCollectors / collectors 便于再次编辑从同一字段回显。
 * 若接口只要规则子集，父组件可 JSON.parse 后只传 { ruleGroup, relation }。
 */
function buildRuleJsonString() {
  const ruleGroup = form.ruleGroup.map((r) => ({
    field: r.field,
    operator: r.operator,
    value: String(r.value ?? '').trim()
  }))
  return JSON.stringify({
    ruleGroup,
    relation: form.relation,
    matchedCollectors: matchedCollectors.value.map(normalizeCollectorForList),
    collectors: selectedCollectors.value.map(normalizeCollectorForList)
  })
}

const form = reactive({
  name: 'test',
  type: '物理',
  region: '上海',
  status: '已启用',
  /** 与接口一致：多条规则与 relation 组合为 rule 对象 */
  relation: 'or',
  ruleGroup: [emptyRuleRow()]
})

/** trigger 置空：由 validateField / validate 主动触发，避免打开弹窗时误校验 */
const formRules = {
  name: [{ required: true, message: '请输入分组名称', trigger: [] }],
  type: [{ required: true, message: '请选择类型', trigger: [] }],
  region: [{ required: true, message: '请选择归属地', trigger: [] }]
}

const ruleValueRules = [
  {
    trigger: [],
    validator(_rule, value, callback) {
      if (value === undefined || value === null || String(value).trim() === '') {
        callback(new Error('请输入匹配值'))
      } else {
        callback()
      }
    }
  }
]

const searchFieldOptions = [
  { label: '物理机名称', value: 'hostname' },
  { label: '物理机IP', value: 'ip' }
]
const operatorOptions = [
  { label: '是', value: 'equals' },
  { label: '不是', value: 'notEquals' },
  { label: '包含字符', value: 'contains' },
  { label: '不包含字符', value: 'notContains' }
]

/** 未接 fetchMatchedCollectors 时，defaultFetchMatched 用此列表做本地过滤演示 */
const allCollectors = ref([
  { id: 1, name: 'web-server-sh-01', ip: '192.168.1.10', status: '在线', type: '物理', region: '上海' },
  { id: 2, name: 'web-server-sh-02', ip: '192.168.1.11', status: '在线', type: '物理', region: '上海' },
  { id: 3, name: 'db-server-sh-01', ip: '192.168.2.20', status: '在线', type: '物理', region: '上海' },
  { id: 4, name: 'app-server-sh-01', ip: '192.168.1.15', status: '离线', type: '容器', region: '上海' },
  { id: 5, name: 'cache-server-sh-01', ip: '192.168.3.30', status: '在线', type: '物理', region: '上海' },
  { id: 6, name: 'api-server-sh-01', ip: '192.168.1.12', status: '在线', type: '物理', region: '上海' },
  { id: 7, name: 'api-server-sh-02', ip: '192.168.1.13', status: '在线', type: '物理', region: '上海' },
  { id: 101, name: 'web-server-bj-01', ip: '10.0.1.10', status: '在线', type: '物理', region: '北京' },
  { id: 102, name: 'web-server-bj-02', ip: '10.0.1.11', status: '离线', type: '物理', region: '北京' }
])

/** 用户在右侧列表中点选的主机（提交 collectors） */
const selectedCollectors = ref([])

/** 组装预览/接口入参：类型、归属 + rule（ruleGroup + relation） */
function buildPreviewPayload() {
  return {
    type: form.type,
    region: form.region,
    rule: {
      ruleGroup: form.ruleGroup.map((r) => ({
        field: r.field,
        operator: r.operator,
        value: String(r.value ?? '').trim()
      })),
      relation: form.relation
    }
  }
}

/** 无接口时的本地匹配逻辑，与后端约定 ruleGroup + relation 时需保持一致 */
function filterCollectorsLocal(collectors, ruleGroup, type, region, relation) {
  const t = String(type ?? '')
  const r = String(region ?? '')
  const rel = relation === 'and' ? 'and' : 'or'
  return collectors.filter((c) => {
    const okType = !t || c.type === t
    const okRegion = !r || c.region === r
    if (!okType || !okRegion) return false
    if (!ruleGroup.length) return true
    const hits = ruleGroup.map((rule) => hitRule(c, rule))
    return rel === 'and' ? hits.every(Boolean) : hits.some(Boolean)
  })
}

/** 模拟网络延迟后返回本地过滤结果 */
async function defaultFetchMatched(payload) {
  await new Promise((r) => setTimeout(r, 280))
  const ruleGroup = payload.rule?.ruleGroup ?? []
  const relation = payload.rule?.relation ?? 'or'
  return filterCollectorsLocal(allCollectors.value, ruleGroup, payload.type, payload.region, relation)
}

// 打开弹窗或 mode / initialData 变化时：重置步骤并回填（编辑时与表格行快照一致）
watch(
  [() => props.modelValue, () => props.mode, () => props.initialData],
  async ([open, mode, data]) => {
    if (!open) return
    step.value = 0
    matchedCollectors.value = []
    hasPreviewed.value = false
    if (mode === 'edit' && data) {
      form.name = data.name ?? ''
      form.type = data.type ?? ''
      form.region = data.region ?? ''
      form.status = data.status ?? '已启用'
    } else {
      form.name = ''
      form.type = ''
      form.region = ''
      form.status = '已启用'
    }

    const rawRule = mode === 'edit' && data ? data.rule ?? data.ruleGroup : null
    const parsed = parseRuleGroupStorage(rawRule)
    if (parsed) {
      form.relation = parsed.relation
      form.ruleGroup = parsed.formRows
      let list = []
      if (Array.isArray(parsed.matchedFromStore) && parsed.matchedFromStore.length) {
        list = parsed.matchedFromStore.map(normalizeCollectorForList)
      } else {
        list = filterCollectorsLocal(
          allCollectors.value,
          parsed.plainRules,
          form.type,
          form.region,
          parsed.relation
        ).map(normalizeCollectorForList)
      }
      matchedCollectors.value = list
      hasPreviewed.value = true
      const fromProp = (props.initialSelectedCollectors ?? []).map((x) => ({ ...x }))
      if (fromProp.length) {
        const ids = new Set(list.map((x) => x.id))
        selectedCollectors.value = fromProp.filter((c) => ids.has(c.id))
      } else if (Array.isArray(parsed.collectorsFromStore) && parsed.collectorsFromStore.length) {
        const ids = new Set(list.map((x) => x.id))
        selectedCollectors.value = parsed.collectorsFromStore
          .map(normalizeCollectorForList)
          .filter((c) => ids.has(c.id))
      } else {
        selectedCollectors.value = list.map((c) => ({ ...c }))
      }
    } else {
      form.relation = 'or'
      form.ruleGroup = [emptyRuleRow()]
      matchedCollectors.value = []
      hasPreviewed.value = false
      selectedCollectors.value = (props.initialSelectedCollectors ?? []).map((x) => ({ ...x }))
    }
    await nextTick()
    formRef.value?.clearValidate?.()
  }
)

function close() {
  emit('update:modelValue', false)
}

function nextStep() {
  formRef.value
    ?.validateField?.(['name', 'type', 'region'])
    .then(() => {
      step.value = 1
    })
    .catch(() => {})
}

function prevStep() {
  step.value = 0
}

function addRule() {
  form.ruleGroup.push(emptyRuleRow())
}

function removeRule(ruleId) {
  if (form.ruleGroup.length === 1) return
  const idx = form.ruleGroup.findIndex((x) => x.id === ruleId)
  if (idx >= 0) form.ruleGroup.splice(idx, 1)
}

/** 单条规则是否命中；value 为空视为该条恒成立 */
function hitRule(collector, rule) {
  const text = String(rule.field === 'ip' ? collector.ip : collector.name).toLowerCase()
  const value = String(rule.value ?? '').trim().toLowerCase()
  if (!value) return true
  if (rule.operator === 'equals') return text === value
  if (rule.operator === 'notEquals') return text !== value
  if (rule.operator === 'notContains') return !text.includes(value)
  return text.includes(value)
}

function isSelected(collector) {
  return selectedCollectors.value.some((c) => c.id === collector.id)
}

function toggleCollector(collector) {
  if (isSelected(collector)) {
    selectedCollectors.value = selectedCollectors.value.filter((c) => c.id !== collector.id)
  } else {
    selectedCollectors.value.push({ ...collector })
  }
}

/** 拉取匹配列表写入 matchedCollectors，并剔除已选中已不在结果集内的 id */
async function runPreview() {
  try {
    await formRef.value?.validate?.()
  } catch {
    return
  }
  const payload = buildPreviewPayload()
  const fetcher = typeof props.fetchMatchedCollectors === 'function' ? props.fetchMatchedCollectors : defaultFetchMatched
  previewLoading.value = true
  try {
    const list = await fetcher(payload)
    const normalized = Array.isArray(list) ? list : []
    matchedCollectors.value = normalized.map((c) => ({
      id: c.id,
      name: c.name ?? '',
      ip: c.ip ?? '',
      status: c.status ?? '—',
      type: c.type,
      region: c.region
    }))
    hasPreviewed.value = true
    const ids = new Set(matchedCollectors.value.map((x) => x.id))
    selectedCollectors.value = selectedCollectors.value.filter((c) => ids.has(c.id))
  } catch (e) {
    ElMessage.error(e?.message || '查询匹配主机失败，请稍后重试')
  } finally {
    previewLoading.value = false
  }
}

/** 编辑模式下进入「规则配置」步时自动走预览接口，用当前规则刷新匹配采集器列表 */
watch(
  [step, () => props.modelValue, () => props.mode],
  async ([s, open, mode]) => {
    if (!open || s !== 1 || mode !== 'edit') return
    await nextTick()
    await runPreview()
  },
  { flush: 'post' }
)

/** 校验后调用 submitRequest（或 emit），成功再关弹窗 */
async function submit() {
  try {
    await formRef.value?.validate?.()
  } catch {
    return
  }
  if (!hasPreviewed.value) {
    ElMessage.warning('请先点击「预览」根据当前规则查询匹配主机')
    return
  }
  if (!selectedCollectors.value.length) {
    ElMessage.warning('请先选择至少一个采集器成员')
    return
  }
  const payload = {
    name: form.name.trim(),
    type: form.type,
    region: form.region,
    status: form.status,
    /** 接口字段：JSON 字符串，内含 { ruleGroup: [], relation, ... } */
    rule: buildRuleJsonString(),
    collectors: selectedCollectors.value.map((c) => ({ id: c.id, name: c.name, ip: c.ip, status: c.status }))
  }
  submitLoading.value = true
  try {
    if (typeof props.submitRequest === 'function') {
      await props.submitRequest(payload)
    } else {
      emit('submit', payload)
    }
    close()
  } catch (e) {
    ElMessage.error(e?.message || '提交失败，请稍后重试')
  } finally {
    submitLoading.value = false
  }
}
</script>

<template>
  <!-- 主弹窗：分步标题与底部按钮随 step 切换 -->
  <el-dialog
    :model-value="modelValue"
    :title="mode === 'create' ? '新增分组' : '编辑分组'"
    width="980px"
    align-center
    :close-on-click-modal="false"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <div class="dlg-step">
      <el-steps class="probe-stepper" :active="step" finish-status="success" align-center>
        <el-step title="基本信息" />
        <el-step title="规则配置" />
      </el-steps>
    </div>

    <!-- 两步共用同一表单 model：基本信息 + ruleGroup / relation -->
    <el-form ref="formRef" :model="form" label-position="top" :rules="formRules" :validate-on-rule-change="false">
      <div v-show="step === 0" class="step-content">
        <el-form-item label="分组名称" prop="name" required>
          <el-input v-model="form.name" placeholder="请输入分组名称" size="large" />
        </el-form-item>
        <el-form-item label="类型" prop="type" required>
          <el-select v-model="form.type" placeholder="请选择类型" size="large">
            <el-option v-for="opt in typeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="归属地" prop="region" required>
          <el-select v-model="form.region" placeholder="请选择归属地" size="large">
            <el-option v-for="opt in regionOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
      </div>

      <!-- 步骤二：左规则（form.ruleGroup）、右匹配列表（预览后才有数据） -->
      <div v-show="step === 1" class="step-content">
        <div class="member-body">
          <div class="member-left panel-box">
            <div class="panel-header">
              <div class="rule-title">规则配置（多个规则之间为 OR 关系）</div>
              <el-button text type="primary" class="add-rule-btn" @click="addRule">
                <el-icon><Plus /></el-icon>
                添加规则
              </el-button>
            </div>
            <div class="panel-content">
              <el-scrollbar class="rule-scroll" height="376px">
                <div v-for="(rule, idx) in form.ruleGroup" :key="rule.id" class="rule-item">
                  <div class="rule-main">
                    <div class="rule-row-top">
                      <el-select v-model="rule.field" class="rule-field-select">
                        <el-option v-for="opt in searchFieldOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                      </el-select>
                    </div>
                    <div class="rule-row-bottom">
                      <el-select v-model="rule.operator" class="rule-match-select">
                        <el-option v-for="opt in operatorOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                      </el-select>
                      <el-form-item :prop="`ruleGroup.${idx}.value`" :rules="ruleValueRules" class="rule-value-form-item">
                        <el-input v-model="rule.value" placeholder="请输入值" class="rule-value-input" clearable />
                      </el-form-item>
                    </div>
                  </div>
                  <div class="rule-delete-wrap">
                    <el-button
                      class="rule-delete-btn"
                      text
                      :disabled="form.ruleGroup.length === 1"
                      :icon="Delete"
                      @click="removeRule(rule.id)"
                    />
                  </div>
                </div>
              </el-scrollbar>
            </div>
          </div>

          <div class="member-right-wrap">
          <div class="selected-count">
            <span class="count-label">匹配的采集器</span>
            <span class="count">{{ matchedCollectors.length }} 台主机</span>
          </div>
          <div class="member-right panel-box">
            <el-scrollbar height="376px" class="member-scroll">
              <div v-if="!hasPreviewed" class="member-empty">
                请配置左侧规则后，点击下方「预览」从服务端查询并展示匹配主机。
              </div>
              <div v-else-if="!matchedCollectors.length" class="member-empty">当前规则下暂无匹配主机，可调整规则后再次预览。</div>
              <template v-else>
                <div
                  v-for="c in matchedCollectors"
                  :key="c.id"
                  class="collector-row"
                  :class="{ selected: isSelected(c) }"
                  @click="toggleCollector(c)"
                >
                  <div class="collector-left">
                    <div>
                      <div class="collector-name">{{ c.name }}</div>
                      <div class="collector-ip">IP: {{ c.ip }}</div>
                    </div>
                  </div>
                  <div class="collector-right">
                    <el-tag size="small" :type="c.status === '在线' ? 'success' : 'info'" effect="plain">{{ c.status }}</el-tag>
                  </div>
                </div>
              </template>
            </el-scrollbar>
          </div>
          </div>
        </div>
      </div>
    </el-form>

    <template #footer>
      <div class="dlg-footer">
        <div class="footer-right">
          <el-button v-if="step === 0" @click="close">取消</el-button>
          <el-button v-else @click="prevStep">上一步</el-button>
          <el-button v-if="step === 0" type="primary" @click="nextStep">下一步</el-button>
          <!-- 第二步：预览拉列表，再提交 -->
          <template v-else>
            <el-button :loading="previewLoading" @click="runPreview">预览</el-button>
            <el-button type="primary" :loading="submitLoading" @click="submit">
              {{ mode === 'edit' ? '确认修改' : '确认创建' }}
            </el-button>
          </template>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.dlg-step { margin: 2px 0 18px; padding: 0 8px; }
.step-content { padding: 8px 6px 0; }
/* .step-content :deep(.el-input), .step-content :deep(.el-select) { width: 100%; } */

.probe-stepper :deep(.el-step__icon) { width: 28px; height: 28px; font-size: 15px; font-weight: 600; border-width: 2px; }
.probe-stepper :deep(.el-step__line) { top: 14px; height: 2px; }
.probe-stepper :deep(.el-step__line-inner) { border-width: 1px !important; }
.probe-stepper :deep(.el-step.is-process .el-step__icon) { background: #1f6bff; border-color: #1f6bff; color: #fff; }
.probe-stepper :deep(.el-step.is-success .el-step__icon) { border-color: #2ebf5f; color: #2ebf5f; }
.probe-stepper :deep(.el-step__title) { margin-top: 10px; font-size: 14px; line-height: 1.2; text-align: center; }
.probe-stepper :deep(.el-step__title.is-wait) { color: #909399; font-weight: 500; }
.probe-stepper :deep(.el-step__title.is-process), .probe-stepper :deep(.el-step__title.is-success) { color: #303133; font-weight: 600; }
.probe-stepper :deep(.el-step__main) { margin-top: 2px; }

.member-body { display: grid; grid-template-columns: 3fr 2fr; gap: 16px; align-items: stretch; }
.panel-box {
  background: #fff;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 12px 10px;
  min-height: 44px;
  box-sizing: border-box;
}
.panel-content { padding: 12px 10px 10px; min-height: 344px; }
.rule-scroll { padding: 0 2px 0 0; }
.rule-title { color: var(--el-text-color-secondary); font-size: 13px; white-space: nowrap; }
.add-rule-btn { padding: 0; font-size: 14px; font-weight: 600; flex-shrink: 0; }

.member-right-wrap { display: flex; flex-direction: column; min-width: 0; }
.selected-count {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 12px 12px 10px;
  min-height: 44px;
  margin-bottom: 0;
  box-sizing: border-box;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.count-label { color: var(--el-text-color-secondary); }
.count { margin-left: 8px; color: #1f6bff; font-weight: 600; }

.rule-item { display: flex; align-items: stretch; gap: 10px; padding: 0 2px 8px; }
.rule-main { flex: 1; min-width: 0; }
.rule-row-top, .rule-row-bottom { display: flex; align-items: center; gap: 10px; }
.rule-row-bottom { margin-top: 10px; align-items: flex-start; }
.rule-field-select { flex: 1; }
.rule-value-form-item { flex: 1; min-width: 220px; margin-bottom: 0; }
.rule-value-form-item :deep(.el-form-item__content) { flex: 1; }
.rule-value-form-item :deep(.el-form-item__error) { padding-top: 2px; }
.rule-delete-wrap { width: 44px; min-height: 84px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rule-delete-btn { color: #c0c4cc; width: 100%; height: 100%; min-height: 84px; }
.rule-match-select { width: 130px; flex-shrink: 0; }
.rule-value-input { flex: 1; min-width: 220px; }
.rule-or { margin: 10px 0 2px; text-align: center; color: #909399; font-size: 12px; }
.member-hint { margin-top: 10px; color: #909399; font-size: 12px; }

.list-title { padding: 12px 12px 10px; border-bottom: 1px solid var(--el-border-color-lighter); font-weight: 600; }
.member-scroll { padding: 6px 6px 8px; }
.collector-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px; border-bottom: 1px solid #f0f2f5; cursor: pointer; }
.collector-row:last-child { border-bottom: none; }
.collector-row:hover { background: #f8f9fb; }
.collector-row.selected { background: #eaf4ff; }
.collector-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
.collector-icon { width: 18px; height: 18px; border-radius: 4px; border: 1px solid #cfd8dc; background: #f7f9fa; }
.collector-name { font-weight: 600; font-size: 13px; }
.collector-ip { margin-top: 2px; color: var(--el-text-color-secondary); font-size: 12px; }

.dlg-footer { display: flex; justify-content: flex-end; }
.footer-right { display: flex; align-items: center; gap: 10px; }

.member-empty {
  padding: 48px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

@media (max-width: 900px) {
  .member-body { grid-template-columns: 1fr; }
}
</style>
