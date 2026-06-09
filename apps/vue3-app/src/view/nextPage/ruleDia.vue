<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { CircleClose, CirclePlus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  fetchTfAlarmRuleAlertContentTagsApi,
  fetchTfAlarmRulePhysicalMachinesApi,
  fetchTfAlarmRuleScopeGroupsApi
} from '@/api/trafficForwarding'

/**
 * 父组件通过 v-model 控制弹窗开关；关闭时父级可用 v-if 卸载本组件以清空内部状态。
 */
const props = defineProps({
  /** 弹窗是否显示 */
  modelValue: { type: Boolean, default: false },
  /** create：新建规则；edit：编辑已有规则（标题、回填与提交语义由父级 mode 决定） */
  mode: { type: String, default: 'create' },
  /** 父级提交接口进行中，用于禁用「确定」等按钮 */
  saving: { type: Boolean, default: false },
  /** 编辑模式下的行数据；新建时为 null，表单走默认空值 */
  initialData: { type: Object, default: null }
})

/** update:modelValue：同步弹窗显隐；submit：提交表单 payload 给父级调接口 */
const emit = defineEmits(['update:modelValue', 'submit'])

const formRef = ref(null)
/** Element Plus el-input textarea 实例引用（用于光标处插入占位符） */
const alarmContentInputRef = ref(null)
/** 弹窗内实际出现纵向滚动条的容器（.alarm-config-scroll），用于程序化滚到底 */
const alarmConfigScrollRef = ref(null)

/** 分组下拉：打开弹窗时请求接口填充 */
const groupOptions = ref([])
const groupOptionsLoading = ref(false)

/** 按分组 id 缓存物理机选项；选中分组后请求并写入 */
const pmOptionsByGroup = reactive({})
const pmLoadingByGroup = reactive({})
/**
 * 缓存开关：
 * - 分组列表：打开弹框后只请求一次（mock 场景仍可每次重置）
 * - 物理机列表：按 groupId 缓存；同一个 groupId 再次打开/切换时不重复请求
 */
let scopeGroupsLoaded = false
let scopeGroupsPromise = null
const loadedPhysicalGroupIds = reactive({})

function extractListFromApi(raw) {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.data)) return raw.data
  if (Array.isArray(raw?.data?.records)) return raw.data.records
  if (Array.isArray(raw?.records)) return raw.records
  return []
}

function normalizeSelectOption(item) {
  if (item == null) return null
  if (typeof item === 'string') {
    const s = item.trim()
    return s ? { label: s, value: s } : null
  }
  // 统一兼容分组与 agent/options 常见字段
  const value =
    item.value ??
    item.id ??
    item.code ??
    item.key ??
    item.groupId ??
    item.group_id ??
    item.machineId ??
    item.pmId ??
    item.hostId ??
    item.serverId ??
    item.agentId ??
    item.agent_id
  const label =
    item.label ??
    item.name ??
    item.title ??
    item.displayName ??
    item.groupName ??
    item.group_name ??
    item.machineName ??
    item.pmName ??
    item.hostName ??
    item.serverName ??
    item.agentName ??
    item.agent_name ??
    String(value ?? '')
  if (value === undefined || value === null || String(value).trim() === '') return null
  return { label: String(label), value: String(value) }
}

function getPhysicalMachineOptions(groupId) {
  if (!groupId) return []
  const list = pmOptionsByGroup[groupId]
  return Array.isArray(list) ? list : []
}

/** 加载分组下拉；force=true 时忽略缓存重新请求 */
async function loadScopeGroups(force = false) {
  try {
    if (force) scopeGroupsLoaded = false
    if (scopeGroupsLoaded && groupOptions.value.length) return
    if (scopeGroupsPromise) return await scopeGroupsPromise

    groupOptionsLoading.value = true
    scopeGroupsPromise = (async () => {
      const res = await fetchTfAlarmRuleScopeGroupsApi()
      const list = extractListFromApi(res)
      groupOptions.value = list.map(normalizeSelectOption).filter(Boolean)
      scopeGroupsLoaded = true
    })()

    await scopeGroupsPromise
  } catch (err) {
    groupOptions.value = []
    ElMessage.error(err?.message || '加载分组列表失败')
  } finally {
    groupOptionsLoading.value = false
    scopeGroupsPromise = null
  }
}

/** 加载指定分组物理机；force=true 时忽略缓存重新请求 */
async function loadPhysicalMachinesForGroup(groupId, force = false) {
  if (!groupId) {
    return
  }
  // 按 groupId 记录是否已加载；即使为空数组也视为已加载，避免重复请求
  if (!force && loadedPhysicalGroupIds[groupId] && !pmLoadingByGroup[groupId]) return

  pmLoadingByGroup[groupId] = true
  try {
    const res = await fetchTfAlarmRulePhysicalMachinesApi({ groupId })
    const list = extractListFromApi(res)
    pmOptionsByGroup[groupId] = list.map(normalizeSelectOption).filter(Boolean)
    loadedPhysicalGroupIds[groupId] = true
  } catch (err) {
    pmOptionsByGroup[groupId] = []
    loadedPhysicalGroupIds[groupId] = true
    ElMessage.error(err?.message || '加载物理机列表失败')
  } finally {
    pmLoadingByGroup[groupId] = false
  }
}

/** 标签列表：打开弹窗时从后端拉取（或由 mock 填充） */
const contentTags = ref([])
const contentTagsLoading = ref(false)

function extractTagListFromResponse(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.data)) return raw.data
  if (Array.isArray(raw?.data?.records)) return raw.data.records
  return []
}

function ensureBraceToken(s) {
  const t = String(s ?? '').trim()
  if (!t) return ''
  if (t.startsWith('{{') && t.endsWith('}}')) return t
  const inner = t.replace(/^\{\{|\}\}$/g, '')
  return `{{${inner}}}`
}

function normalizeContentTag(raw) {
  if (raw == null) return null
  if (typeof raw === 'string') {
    const label = raw.trim()
    if (!label) return null
    return { label, token: ensureBraceToken(label) }
  }
  const label = String(raw.label ?? raw.name ?? raw.title ?? raw.tagName ?? '').trim()
  const ph = raw.token ?? raw.placeholder ?? raw.value ?? raw.code
  if (ph !== undefined && ph !== null && String(ph).trim() !== '') {
    const token = ensureBraceToken(String(ph).trim())
    return { label: label || token.slice(2, -2), token }
  }
  if (label) return { label, token: ensureBraceToken(label) }
  return null
}

/**
 * 滚到告警配置弹窗内容区底部。
 * 单独 nextTick 往往不够：异步数据/flex 布局下一帧 scrollHeight 才稳定，故再叠两帧 rAF。
 */
function scrollAlarmConfigToBottom() {
  const el = alarmConfigScrollRef.value
  if (!el) return
  const apply = () => {
    el.scrollTop = el.scrollHeight
  }
  nextTick(() => {
    apply()
    requestAnimationFrame(() => {
      apply()
      requestAnimationFrame(apply)
    })
  })
}

async function loadContentTags() {
  contentTagsLoading.value = true
  try {
    const res = await fetchTfAlarmRuleAlertContentTagsApi()
    const list = extractTagListFromResponse(res)
    contentTags.value = list.map(normalizeContentTag).filter(Boolean)
  } catch (err) {
    contentTags.value = []
    ElMessage.error(err?.message || '加载告警标签失败')
  } finally {
    contentTagsLoading.value = false
    // 标签区 v-loading 收起后高度变化，再滚一次避免仍停在中间
    scrollAlarmConfigToBottom()
  }
}

let scopeRowKeySeq = 0
function createEmptyScope() {
  scopeRowKeySeq += 1
  return { _key: scopeRowKeySeq, groupId: '', agentIds: [] }
}

const formData = reactive({
  id: undefined,
  ruleName: '',
  status: 1,
  /** 多组：分组与物理机关联，一行一组 */
  scopes: [createEmptyScope()],
  abnormalDuration: undefined,
  compressTime: undefined,
  alarmContent: ''
})

const scopeRowRules = {
  groupId: [{ required: true, message: '请选择分组', trigger: 'change' }],
  agentIds: [
    {
      type: 'array',
      required: true,
      min: 1,
      message: '请选择至少一台物理机',
      trigger: 'change'
    }
  ]
}

function validateTrimmedRequired(label) {
  return (_rule, value, callback) => {
    const v = String(value ?? '').trim()
    if (!v) return callback(new Error(`请输入${label}`))
    callback()
  }
}

function validatePositiveInteger(label) {
  return (_rule, value, callback) => {
    if (value === undefined || value === null || value === '') {
      return callback(new Error(`请输入${label}`))
    }
    const n = Number(value)
    if (!Number.isInteger(n) || n <= 0) {
      return callback(new Error(`${label}需为正整数`))
    }
    callback()
  }
}

const formRules = {
  ruleName: [{ validator: validateTrimmedRequired('规则名称'), trigger: ['blur', 'change'] }],
  abnormalDuration: [
    { validator: validatePositiveInteger('异常状态持续时间'), trigger: ['blur', 'change'] }
  ],
  compressTime: [
    { validator: validatePositiveInteger('告警压缩时间'), trigger: ['blur', 'change'] }
  ],
  alarmContent: [{ validator: validateTrimmedRequired('告警内容'), trigger: ['blur', 'change'] }]
}

/** 与设计图一致的标题文案；编辑仍可展示 */
const dialogTitle = computed(() => '告警配置')

function getTextareaEl() {
  const comp = alarmContentInputRef.value
  if (!comp) return null
  const textareaRefLike = comp.textarea
  if (textareaRefLike && typeof textareaRefLike === 'object' && 'value' in textareaRefLike) {
    return textareaRefLike.value
  }
  return textareaRefLike || comp.$el?.querySelector?.('textarea') || null
}

function insertAtCursor(insertText) {
  const textarea = getTextareaEl()
  const current = formData.alarmContent || ''
  if (!textarea) {
    formData.alarmContent = current + insertText
    return
  }
  const start = textarea.selectionStart ?? current.length
  const end = textarea.selectionEnd ?? current.length
  const next = `${current.slice(0, start)}${insertText}${current.slice(end)}`
  formData.alarmContent = next
  nextTick(() => {
    const ta = getTextareaEl()
    if (!ta) return
    ta.focus()
    const pos = start + insertText.length
    ta.setSelectionRange(pos, pos)
  })
}

function onTagClick(tag) {
  insertAtCursor(tag.token)
}

async function onScopeGroupChange(index) {
  const row = formData.scopes[index]
  if (!row) return
  row.agentIds = []
  if (row.groupId) {
    await loadPhysicalMachinesForGroup(row.groupId)
  }
}

function addScope() {
  formData.scopes.push(createEmptyScope())
}

function removeScope(index) {
  if (formData.scopes.length <= 1) {
    ElMessage.warning('至少保留一组「所在分组」与「所在物理机」')
    return
  }
  formData.scopes.splice(index, 1)
}

function parseStoredCondition(raw) {
  const str = String(raw ?? '').trim()
  if (!str) return {}
  try {
    return JSON.parse(str)
  } catch (_) {
    return {}
  }
}

function splitAgentIds(agentId) {
  if (typeof agentId !== 'string' || !agentId.trim()) return []
  return agentId
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

function normalizeStatus(v) {
  if (v === 1 || v === '1' || v === true || v === '启用' || v === 'enabled') return 1
  if (v === 0 || v === '0' || v === false || v === '停用' || v === '禁用' || v === 'disabled')
    return 0
  const n = Number(v)
  return Number.isNaN(n) ? 1 : n === 0 ? 0 : 1
}

/** 从新版 ruleGroup 条目解析 agentId 多选数组（统一为字符串，避免与 option 的 value 类型不一致） */
function agentIdsFromRuleGroupEntry(t) {
  const raw = t?.agentId
  if (raw == null || raw === '') return []
  if (typeof raw === 'string') {
    return splitAgentIds(raw).map((id) => String(id))
  }
  if (Array.isArray(raw)) {
    return raw.map((id) => String(id)).filter((s) => s && s !== 'undefined' && s !== 'null')
  }
  return [String(raw)]
}

function optionValueSet(options) {
  return new Set((Array.isArray(options) ? options : []).map((o) => String(o?.value ?? '')))
}

/** 编辑回填：若已选分组 id 不在接口列表中，补充占位项，避免 el-select 只显示原始 value */
function mergeMissingGroupOptionsForForm() {
  const seen = optionValueSet(groupOptions.value)
  for (const row of formData.scopes) {
    const gid =
      row.groupId != null && String(row.groupId).trim() !== '' ? String(row.groupId).trim() : ''
    if (!gid || seen.has(gid)) continue
    groupOptions.value.push({ label: gid, value: gid })
    seen.add(gid)
  }
}

/** 编辑回填：若已选物理机 id 不在该分组选项中，补充占位项 */
function mergeMissingAgentOptionsForForm() {
  for (const row of formData.scopes) {
    const gid =
      row.groupId != null && String(row.groupId).trim() !== '' ? String(row.groupId).trim() : ''
    if (!gid) continue
    if (!Array.isArray(pmOptionsByGroup[gid])) {
      pmOptionsByGroup[gid] = []
    }
    const list = pmOptionsByGroup[gid]
    const seen = optionValueSet(list)
    const ids = Array.isArray(row.agentIds) ? row.agentIds : []
    for (const aid of ids) {
      const v = aid != null ? String(aid).trim() : ''
      if (!v || seen.has(v)) continue
      list.push({ label: v, value: v })
      seen.add(v)
    }
  }
}

function resetFormByInitialData() {
  const row = props.initialData || {}
  const cond = parseStoredCondition(row.alertCondition)

  formData.id = row.id
  formData.ruleName = String(row.ruleName ?? row.rulename ?? '')
  formData.status = normalizeStatus(row.status)

  let nextScopes
  // 只解析新版告警条件：{ ruleGroup: [{ groupId, agentId }] }
  if (Array.isArray(cond.ruleGroup) && cond.ruleGroup.length) {
    nextScopes = cond.ruleGroup.map((g) => {
      scopeRowKeySeq += 1
      return {
        _key: scopeRowKeySeq,
        groupId: g.groupId != null && g.groupId !== '' ? String(g.groupId) : '',
        agentIds: agentIdsFromRuleGroupEntry(g)
      }
    })
  } else {
    nextScopes = [createEmptyScope()]
  }
  formData.scopes = nextScopes

  formData.abnormalDuration =
    row.abnormalDuration != null ? Number(row.abnormalDuration) : undefined
  formData.compressTime = row.compressTime != null ? Number(row.compressTime) : undefined
  formData.alarmContent = String(row.alarmContent || '')
}

/** 编辑回填后拉取各分组下的物理机选项，以便多选展示 label */
async function prefetchPhysicalOptionsForScopes() {
  const ids = [...new Set(formData.scopes.map((s) => s.groupId).filter(Boolean))]
  await Promise.all(ids.map((gid) => loadPhysicalMachinesForGroup(gid)))
}

/** 弹窗打开时的标准初始化流程 */
async function initializeDialogData() {
  await loadScopeGroups()
  resetFormByInitialData()
  mergeMissingGroupOptionsForForm()
  await prefetchPhysicalOptionsForScopes()
  mergeMissingAgentOptionsForForm()
  await loadContentTags()
  nextTick(() => formRef.value?.clearValidate?.())
  scrollAlarmConfigToBottom()
}

watch(
  () => props.modelValue,
  async (visible) => {
    if (!visible) return
    await initializeDialogData()
  },
  { immediate: true }
)

function onClose() {
  emit('update:modelValue', false)
}

function buildAlertConditionPayload() {
  const ruleGroup = formData.scopes.map((s) => {
    const ids = Array.isArray(s.agentIds) ? s.agentIds.map(String) : []
    const payload = { groupId: String(s.groupId ?? '') }
    if (ids.length) payload.agentId = ids.join(',')
    return payload
  })
  return {
    ruleGroup,
    relation: 'OR'
  }
}

async function onConfirm() {
  await formRef.value?.validate()
  const status = normalizeStatus(formData.status)

  emit('submit', {
    id: formData.id,
    ruleName: String(formData.ruleName ?? '').trim(),
    alarmContent: String(formData.alarmContent ?? '').trim(),
    alertCondition: JSON.stringify(buildAlertConditionPayload()),
    abnormalDuration: Number(formData.abnormalDuration),
    compressTime: Number(formData.compressTime),
    status
  })
}
</script>

<template>
  <el-dialog
    class="alarm-config-dialog"
    :model-value="modelValue"
    :title="dialogTitle"
    width="760px"
    destroy-on-close
    align-center
    @opened="scrollAlarmConfigToBottom"
    @close="onClose"
  >
    <div ref="alarmConfigScrollRef" class="alarm-config-scroll">
      <p class="dialog-subtitle">配置物理机告警触发条件和告警内容</p>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="0"
        label-position="top"
      >
        <div class="section-title">基本信息</div>

        <div class="scope-dynamic-grid scope-duration-grid">
          <el-form-item class="scope-field" label="规则名称" prop="ruleName" required>
            <el-input
              v-model="formData.ruleName"
              maxlength="100"
              placeholder="请输入规则名称"
              clearable
            />
          </el-form-item>
          <el-form-item class="scope-field" label="启用状态" prop="status" required>
            <el-switch
              v-model="formData.status"
              :active-value="1"
              :inactive-value="0"
              active-text="启用"
              inactive-text="停用"
            />
          </el-form-item>
          <div class="scope-grid-trailing-spacer" aria-hidden="true" />
        </div>

        <div class="section-title">触发条件</div>

        <div
          v-for="(scopeRow, scopeIndex) in formData.scopes"
          :key="scopeRow._key"
          class="scope-dynamic-grid"
        >
          <el-form-item
            class="scope-field"
            :label="scopeIndex === 0 ? '所在分组' : ''"
            :prop="`scopes.${scopeIndex}.groupId`"
            :rules="scopeRowRules.groupId"
            required
          >
            <el-select
              v-model="scopeRow.groupId"
              placeholder="请选择分组"
              clearable
              filterable
              style="width: 100%"
              :loading="groupOptionsLoading"
              @change="onScopeGroupChange(scopeIndex)"
            >
              <el-option
                v-for="item in groupOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item
            class="scope-field"
            :label="scopeIndex === 0 ? '所在物理机' : ''"
            :prop="`scopes.${scopeIndex}.agentIds`"
            :rules="scopeRowRules.agentIds"
            required
          >
            <el-select
              v-model="scopeRow.agentIds"
              placeholder="请选择物理机"
              multiple
              collapse-tags
              collapse-tags-tooltip
              clearable
              filterable
              style="width: 100%"
              :disabled="!scopeRow.groupId"
              :loading="!!scopeRow.groupId && !!pmLoadingByGroup[scopeRow.groupId]"
            >
              <el-option
                v-for="item in getPhysicalMachineOptions(scopeRow.groupId)"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <div class="scope-actions" aria-label="增删分组行">
            <div class="scope-action-slot">
              <el-button
                v-if="scopeIndex === formData.scopes.length - 1"
                type="text"
                plain
                class="scope-circle-btn scope-circle-btn--add"
                @click="addScope"
              >
                <el-icon><CirclePlus /></el-icon>
              </el-button>
            </div>
            <el-button
              type="text"
              plain
              class="scope-circle-btn scope-circle-btn--remove"
              :disabled="formData.scopes.length <= 1"
              @click="removeScope(scopeIndex)"
            >
              <el-icon><CircleClose /></el-icon>
            </el-button>
          </div>
        </div>

        <!-- 与「分组+物理机+操作列」同一套三列网格，避免 50%/50% 与上行错位 -->
        <div class="scope-dynamic-grid scope-duration-grid">
          <el-form-item class="scope-field" label="异常状态持续" prop="abnormalDuration" required>
            <div class="input-with-append-text">
              <el-input-number
                v-model="formData.abnormalDuration"
                :min="1"
                :max="99999"
                :controls="false"
                placeholder="请输入时间"
                class="dur-input-grow"
              />
              <span class="append-plain">分钟后生成告警</span>
            </div>
          </el-form-item>
          <el-form-item class="scope-field" label="告警压缩时间" prop="compressTime" required>
            <div class="input-with-append-text">
              <el-input-number
                v-model="formData.compressTime"
                :min="1"
                :max="99999"
                :controls="false"
                placeholder="请输入时间"
                class="dur-input-grow"
              />
              <span class="append-plain">分钟</span>
            </div>
          </el-form-item>
          <div class="scope-grid-trailing-spacer" aria-hidden="true" />
        </div>

        <div class="section-title section-gap">告警内容</div>

        <el-form-item>
          <template #label>
            <span>标签（点击标签自动在告警内容中添加对应的占位符）</span>
          </template>
          <div v-loading="contentTagsLoading" class="tag-bar">
            <el-tag
              v-for="(tag, idx) in contentTags"
              :key="`${tag.token}-${idx}`"
              class="placeholder-tag"
              effect="plain"
              type="info"
              @click="onTagClick(tag)"
            >
              {{ tag.label }}
            </el-tag>
            <span v-if="!contentTagsLoading && !contentTags.length" class="tag-empty"
              >暂无标签</span
            >
          </div>
        </el-form-item>

        <el-form-item label="告警内容" prop="alarmContent" required>
          <el-input
            ref="alarmContentInputRef"
            v-model="formData.alarmContent"
            type="textarea"
            :rows="6"
            maxlength="4000"
            show-word-limit
            placeholder="请输入告警内容，可以点击上方标签插入占位符"
          />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <el-button @click="onClose">取消</el-button>
      <el-button type="primary" :loading="saving" @click="onConfirm">保存配置</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.dialog-subtitle {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  margin-bottom: 16px;
}

.section-gap {
  margin-top: 8px;
}

.tag-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  min-height: 32px;
}

.tag-empty {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 32px;
}

.placeholder-tag {
  cursor: pointer;
  user-select: none;
}

.placeholder-tag:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.input-with-append-text {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.dur-input-grow {
  flex: 1;
  min-width: 0;
}

.append-plain {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

/* 两列表单项 + 右侧操作列固定宽度，与上行「加减按钮」列对齐 */
.scope-dynamic-grid {
  --scope-trailing-col: 72px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) var(--scope-trailing-col);
  column-gap: 16px;
  align-items: end;
  margin-bottom: 8px;
}

.scope-duration-grid {
  align-items: end;
}

.scope-grid-trailing-spacer {
  width: 100%;
  box-sizing: border-box;
}

.scope-dynamic-grid + .scope-dynamic-grid {
  margin-top: 4px;
}

.scope-dynamic-grid > .scope-field {
  min-width: 0;
}

.scope-field {
  margin-bottom: 0;
}

.scope-field :deep(.el-form-item__label) {
  padding-bottom: 4px;
}

.scope-field :deep(.el-form-item__content) {
  min-width: 0;
}

.scope-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding-bottom: 1px;
  box-sizing: border-box;
  width: 100%;
}

/* 占位：非最后一行不显示「添加」时仍保留宽度，多行删除按钮纵向对齐 */
.scope-action-slot {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.scope-circle-btn {
  width: 32px;
  height: 32px;
  padding: 0;
}

.scope-circle-btn :deep(.el-icon) {
  font-size: 18px;
}

.scope-circle-btn--add :deep(.el-icon) {
  color: var(--el-color-primary);
}

.scope-circle-btn--remove:not(:disabled) :deep(.el-icon) {
  color: var(--el-color-danger);
}

/**
 * 内层滚动：滚动条占用独立轨道，避免覆盖在输入框/字数统计上
 * （仅加 scrollbar-gutter 在部分浏览器 + 覆盖式滚动条下仍无效）
 */
.alarm-config-scroll {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-gutter: stable;
  padding-inline-end: 8px;
  box-sizing: border-box;
  scrollbar-width: thin;
  scrollbar-color: var(--el-border-color) var(--el-fill-color-lighter);
}

.alarm-config-scroll::-webkit-scrollbar {
  width: 10px;
}

.alarm-config-scroll::-webkit-scrollbar-track {
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
}

.alarm-config-scroll::-webkit-scrollbar-thumb {
  background: var(--el-border-color-dark);
  border-radius: 6px;
  border: 2px solid var(--el-fill-color-lighter);
}
</style>

<!-- Dialog 挂载在 body，需非 scoped 才能约束 header/body/footer 布局 -->
<style>
.alarm-config-dialog.el-dialog {
  display: flex;
  flex-direction: column;
  max-height: min(720px, 92vh);
  margin: auto;
}

.alarm-config-dialog.el-dialog .el-dialog__header {
  flex-shrink: 0;
  padding-bottom: 8px;
}

.alarm-config-dialog.el-dialog .el-dialog__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.alarm-config-dialog.el-dialog .el-dialog__footer {
  flex-shrink: 0;
  padding-top: 12px;
}
</style>
