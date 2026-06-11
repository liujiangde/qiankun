<script setup>
import { defineAsyncComponent, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createTfAlarmRuleApi,
  deleteTfAlarmRuleApi,
  disableTfAlarmRuleApi,
  editTfAlarmRuleApi,
  enableTfAlarmRuleApi,
  fetchTfAlarmRuleImportResultApi,
  fetchTfAlarmRuleListApi
} from '@/api/trafficForwarding'

// 两个弹窗只在用户创建/编辑/查看导入结果时才需要，改为异步组件减少列表页初始 chunk。
const RuleDia = defineAsyncComponent(() => import('./ruleDia.vue'))
const ImportResultDialog = defineAsyncComponent(() => import('../warnboce/ImportResultDialog.vue'))

const PAGE_SIZE_OPTIONS = [10, 20, 50]
const DEFAULT_PAGE_SIZE = 10

// 这里是“流量转发告警规则”列表页。
// RuleDia 负责编辑复杂规则表单，本页负责筛选、分页、启停、删除和打开弹窗。
const statusOptions = [
  { label: '全部', value: '' },
  { label: '停用', value: 0 },
  { label: '启用', value: 1 }
]

/** 表格排序列 prop → 后端 sortField 字段名 */
const SORT_FIELD_MAP = {
  updateTime: 'update_time',
  createTime: 'create_time',
  lastAlarmTime: 'last_alarm_time'
}

/** 列表查询与排序条件（关键字、状态、排序字段/方向） */
const query = reactive({
  keyword: '',
  status: '',
  sortField: '',
  sortMode: ''
})

/** 告警配置弹窗是否打开；与 RuleDia 的 v-model 绑定，true 时配合 v-if 挂载子组件 */
const dialogVisible = ref(false)
/** 导入结果弹窗是否打开 */
const importResultVisible = ref(false)
/** 传给 RuleDia：create 新建 / edit 编辑 */
const dialogMode = ref('create')
/** 编辑时传入表格行数据（拷贝）；新建时为 null */
const dialogInitialData = ref(null)
/** RuleDia 提交中，传给子组件用于禁用确定按钮 */
const saving = ref(false)
/** 行级操作（启用/停用/删除）loading，key 为行 id */
const rowActionLoading = reactive({})

const page = ref(1)
const pageSize = ref(DEFAULT_PAGE_SIZE)
const total = ref(0)
const loading = ref(false)
const pageData = ref([])
const reqSeq = ref(0)
let filterWatchTimer = null

const importResultData = ref({})

function clearFilterWatchTimer() {
  if (!filterWatchTimer) return
  clearTimeout(filterWatchTimer)
  filterWatchTimer = null
}

function normalizeStatus(v) {
  if (v === 1 || v === '1' || v === true || v === '启用' || v === 'enabled') return 1
  if (v === 0 || v === '0' || v === false || v === '停用' || v === '禁用' || v === 'disabled')
    return 0
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n === 1 ? 1 : 0
}

function splitAgentIds(agentId) {
  if (typeof agentId !== 'string') return []
  return agentId
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

function summarizePhysicalMachineScope(firstGroup, firstMachineText, groupCount) {
  const head = [firstGroup, firstMachineText].filter(Boolean).join(' / ')
  if (groupCount === 1 && head) return `物理机告警：${head}`
  if (head) return `物理机告警：${head} 等${groupCount}组`
  return `物理机告警：${groupCount}组`
}

function normalizeRuleRecord(record) {
  // 后端返回字段可能缺省或类型不稳定，进入表格前统一转成 UI 可直接消费的形状。
  const conditionMeta = parseAlertConditionMeta(record?.alertCondition)
  return {
    id: record?.id ?? '',
    ruleName: String(record?.ruleName ?? '-'),
    alarmContent: String(record?.alarmContent ?? '-'),
    alertCondition: String(record?.alertCondition ?? ''),
    alertConditionText: conditionMeta.text,
    alertConditionMeta: conditionMeta.raw,
    abnormalDuration: Number(record?.abnormalDuration ?? 0),
    compressTime: Number(record?.compressTime ?? 0),
    status: normalizeStatus(record?.status),
    lastAlarmTime: String(record?.lastAlarmTime ?? '-'),
    createTime: String(record?.createTime ?? '-'),
    createUser: String(record?.createUser ?? '-'),
    updateTime: String(record?.updateTime ?? '-'),
    updateUser: String(record?.updateUser ?? '-')
  }
}

function parseAlertConditionMeta(raw) {
  // alertCondition 历史上既可能是老格式，也可能是新版 ruleGroup JSON。
  // 解析失败时保留原文展示，避免因为单条脏数据导致整个列表不可用。
  const str = String(raw ?? '').trim()
  if (!str) return { text: '-', raw: null }
  try {
    const json = JSON.parse(str)
    // 新版告警条件：{ ruleGroup: [{groupId, agentId}], relation: 'OR' }
    if (Array.isArray(json.ruleGroup) && json.ruleGroup.length) {
      const n = json.ruleGroup.length
      const first = json.ruleGroup[0]
      const g = first?.groupId || ''
      const p = splitAgentIds(first?.agentId).join('、')
      const text = summarizePhysicalMachineScope(g, p, n)
      return { text, raw: json }
    }
    const type = String(json?.type ?? '').toLowerCase()
    const threshold = Number(json?.threshold ?? 0)
    if (type === 'all') return { text: '全部满足', raw: json }
    if (type === 'any') return { text: '任一满足', raw: json }
    if (type === 'count') return { text: `至少满足 ${threshold || 1} 个`, raw: json }
    return { text: str, raw: json }
  } catch (_) {
    return { text: str, raw: null }
  }
}

function renderAlertConditionTooltip(row) {
  const meta = row?.alertConditionMeta
  if (!meta || typeof meta !== 'object') return row?.alertCondition || '-'
  if (Array.isArray(meta.ruleGroup) && meta.ruleGroup.length) {
    return meta.ruleGroup
      .map((g, i) => {
        const gid = g.groupId || '-'
        const agents = splitAgentIds(g.agentId).join('、') || '-'
        return `第${i + 1}组：${gid} / ${agents}`
      })
      .join('\n')
  }
  const type = String(meta.type || '').toLowerCase()
  const typeText =
    type === 'all'
      ? '全部满足'
      : type === 'any'
        ? '任一满足'
        : type === 'count'
          ? '至少满足N个'
          : type || '-'
  const threshold = Number(meta.threshold || 0)
  if (type === 'count') {
    return `条件类型：${typeText}\n阈值：${threshold || 1}`
  }
  return `条件类型：${typeText}`
}

function normalizeListResponse(raw) {
  const payload = raw?.data ?? {}
  const records = Array.isArray(payload?.records) ? payload.records : []
  return {
    list: records.map(normalizeRuleRecord),
    total: Number(payload?.total ?? 0)
  }
}

function buildRequestBody() {
  // 页面筛选态 -> 后端列表查询 body；空值不传，减少后端额外判断。
  const body = {
    current: page.value,
    size: pageSize.value
  }
  const keyword = String(query.keyword ?? '').trim()
  if (keyword) body.keyword = keyword
  if (query.status !== '' && query.status !== null && query.status !== undefined)
    body.status = Number(query.status)
  if (query.sortField) body.sortField = query.sortField
  if (query.sortMode) body.sortMode = query.sortMode
  return body
}

async function queryTfAlarmRuleList() {
  const data = await fetchTfAlarmRuleListApi(buildRequestBody())
  return normalizeListResponse(data)
}

async function fetchList() {
  // 通过请求序号避免旧响应覆盖新结果
  const curSeq = ++reqSeq.value
  loading.value = true
  try {
    const res = await queryTfAlarmRuleList()
    if (curSeq !== reqSeq.value) return
    pageData.value = res.list
    total.value = res.total
  } catch (err) {
    if (curSeq !== reqSeq.value) return
    pageData.value = []
    total.value = 0
    ElMessage.error(err?.message || '查询告警规则失败，请稍后重试')
  } finally {
    if (curSeq === reqSeq.value) loading.value = false
  }
}

function reloadFromFirstPage() {
  if (page.value !== 1) page.value = 1
  else fetchList()
}

function scheduleFilterReload(delay = 300) {
  clearFilterWatchTimer()
  filterWatchTimer = setTimeout(() => {
    reloadFromFirstPage()
  }, delay)
}

function isConfirmCanceled(err) {
  return err === 'cancel' || err === 'close'
}

async function runRowActionWithConfirm(row, options) {
  // 启用、停用、删除只有接口函数和提示文案不同，统一封装可减少三份重复逻辑。
  const { confirmText, confirmButtonText, successText, errorText, request } = options
  try {
    await ElMessageBox.confirm(confirmText, '提示', {
      type: 'warning',
      confirmButtonText,
      cancelButtonText: '取消'
    })
    rowActionLoading[row.id] = true
    await request([row.id])
    ElMessage.success(successText)
    fetchList()
  } catch (err) {
    if (isConfirmCanceled(err)) return
    ElMessage.error(err?.message || errorText)
  } finally {
    rowActionLoading[row.id] = false
  }
}

watch([page, pageSize], fetchList, { immediate: true })

watch(
  () => [query.keyword, query.status],
  () => {
    scheduleFilterReload(300)
  }
)

onBeforeUnmount(() => {
  clearFilterWatchTimer()
})

function onSearch() {
  clearFilterWatchTimer()
  reloadFromFirstPage()
}

function onReset() {
  clearFilterWatchTimer()
  query.keyword = ''
  query.status = ''
  query.sortField = ''
  query.sortMode = ''
  reloadFromFirstPage()
}

function onStatusClear() {
  query.status = ''
}

function onTableSortChange({ prop, order }) {
  const backendField = SORT_FIELD_MAP[prop]
  if (!backendField) return
  query.sortField = backendField
  query.sortMode = order === 'ascending' ? 'asc' : order === 'descending' ? 'desc' : ''
  if (!query.sortMode) query.sortField = ''
  reloadFromFirstPage()
}

function statusText(status) {
  return normalizeStatus(status) === 1 ? '启用' : '停用'
}

function statusTagType(status) {
  return normalizeStatus(status) === 1 ? 'success' : 'info'
}

/** 打开新建弹窗：清空回填数据 */
function onCreate() {
  dialogMode.value = 'create'
  dialogInitialData.value = null
  dialogVisible.value = true
}

async function onOpenImportResult() {
  importResultData.value = await fetchTfAlarmRuleImportResultApi()
  importResultVisible.value = true
}

/** 打开编辑弹窗：传入当前行副本供 RuleDia 回填 */
function onEdit(row) {
  dialogMode.value = 'edit'
  dialogInitialData.value = { ...row }
  dialogVisible.value = true
}

/** RuleDia 提交：按 mode 调创建或编辑接口，成功后关弹窗并刷新列表 */
async function onSubmit(payload) {
  saving.value = true
  try {
    if (dialogMode.value === 'create') await createTfAlarmRuleApi(payload)
    else await editTfAlarmRuleApi(payload)
    ElMessage.success(dialogMode.value === 'create' ? '创建成功' : '编辑成功')
    dialogVisible.value = false
    reloadFromFirstPage()
  } catch (err) {
    ElMessage.error(err?.message || '保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

async function onEnable(row) {
  await runRowActionWithConfirm(row, {
    confirmText: `确定启用规则“${row.ruleName}”吗？`,
    confirmButtonText: '启用',
    successText: '已启用',
    errorText: '启用失败',
    request: enableTfAlarmRuleApi
  })
}

async function onDisable(row) {
  await runRowActionWithConfirm(row, {
    confirmText: `确定停用规则“${row.ruleName}”吗？`,
    confirmButtonText: '停用',
    successText: '已停用',
    errorText: '停用失败',
    request: disableTfAlarmRuleApi
  })
}

async function onDelete(row) {
  await runRowActionWithConfirm(row, {
    confirmText: `确定删除规则“${row.ruleName}”吗？`,
    confirmButtonText: '删除',
    successText: '删除成功',
    errorText: '删除失败',
    request: deleteTfAlarmRuleApi
  })
}
</script>

<template>
  <div class="tf-alarm-rule-page">
    <el-card shadow="never" class="table-card">
      <div class="toolbar">
        <el-form :model="query" class="filter-form" label-width="90px">
          <el-row :gutter="16">
            <el-col :xs="24" :sm="12" :md="7">
              <el-form-item label="关键字">
                <el-input
                  v-model="query.keyword"
                  placeholder="请输入规则名称/告警内容/修改人"
                  clearable
                  @keyup.enter="onSearch"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="24" :md="10">
              <el-form-item label="规则状态">
                <div class="status-with-actions">
                  <el-select
                    v-model="query.status"
                    placeholder="全部"
                    clearable
                    style="width: 160px"
                    @clear="onStatusClear"
                  >
                    <el-option
                      v-for="item in statusOptions"
                      :key="String(item.value)"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                  <div class="filter-actions">
                    <el-button type="primary" @click="onSearch">查询</el-button>
                    <el-button @click="onReset">重置</el-button>
                  </div>
                </div>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="24" :md="7">
              <el-form-item label-width="0" class="actions-form-item">
                <el-button type="primary" @click="onCreate"> 创建规则 </el-button>
                <el-button @click="onOpenImportResult"> 导入结果 </el-button>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>

      <el-table
        v-loading="loading"
        :data="pageData"
        :max-height="600"
        stripe
        style="width: 100%"
        @sort-change="onTableSortChange"
      >
        <el-table-column prop="ruleName" label="规则名称" min-width="160" show-overflow-tooltip />
        <el-table-column
          prop="alarmContent"
          label="告警内容"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column label="告警条件" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tooltip :content="renderAlertConditionTooltip(row)" placement="top" raw-content>
              <span>{{ row.alertConditionText }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column
          prop="abnormalDuration"
          label="异常持续时长(分钟)"
          min-width="150"
          align="center"
        />
        <el-table-column
          prop="compressTime"
          label="告警压缩时间(分钟)"
          min-width="150"
          align="center"
        />
        <el-table-column
          prop="lastAlarmTime"
          label="上次告警时间"
          min-width="180"
          sortable="custom"
        />
        <el-table-column label="规则状态" min-width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)" effect="light">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="修改时间" min-width="180" sortable="custom" />
        <el-table-column prop="updateUser" label="修改人" min-width="120" />
        <el-table-column label="操作" min-width="280" fixed="right" align="center">
          <template #default="{ row }">
            <el-space :size="6">
              <el-button
                class="row-action-btn"
                link
                type="primary"
                size="small"
                @click="onEdit(row)"
              >
                编辑
              </el-button>
              <el-button
                v-if="normalizeStatus(row.status) === 1"
                class="row-action-btn"
                link
                type="primary"
                size="small"
                :loading="rowActionLoading[row.id]"
                @click="onDisable(row)"
              >
                停用
              </el-button>
              <el-button
                v-else
                class="row-action-btn"
                link
                type="primary"
                size="small"
                :loading="rowActionLoading[row.id]"
                @click="onEnable(row)"
              >
                启用
              </el-button>
              <el-button
                class="row-action-btn"
                link
                type="primary"
                size="small"
                :loading="rowActionLoading[row.id]"
                @click="onDelete(row)"
              >
                删除
              </el-button>
            </el-space>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <div class="total">共 {{ total }} 条</div>
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="PAGE_SIZE_OPTIONS"
          layout="sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </el-card>

    <!-- 告警配置弹窗：v-if 与 dialogVisible 同步，关闭后卸载子组件避免表单状态残留 -->
    <RuleDia
      v-if="dialogVisible"
      v-model="dialogVisible"
      :mode="dialogMode"
      :initial-data="dialogInitialData"
      :saving="saving"
      @submit="onSubmit"
    />

    <ImportResultDialog
      v-if="importResultVisible"
      v-model="importResultVisible"
      :result="importResultData"
    />
  </div>
</template>

<style scoped>
.tf-alarm-rule-page {
  padding: 0;
}

.table-card {
  padding-bottom: 4px;
}

.toolbar {
  margin-bottom: 16px;
}

.filter-form {
  width: 100%;
}

.filter-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-with-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.actions-form-item {
  margin-left: auto;
}

.actions-form-item :deep(.el-form-item__content) {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
}

.total {
  color: var(--el-text-color-regular);
  font-size: 13px;
}

/* 操作列按钮采用弱化焦点样式，兼顾可访问性与视觉 */
.row-action-btn:focus,
.row-action-btn:focus-visible {
  outline: 2px solid rgba(64, 158, 255, 0.35);
  outline-offset: 2px;
  border-radius: 4px;
}

.row-action-btn:deep(.el-button:focus),
.row-action-btn:deep(.el-button:focus-visible) {
  outline: 2px solid rgba(64, 158, 255, 0.35);
  outline-offset: 2px;
  border-radius: 4px;
  box-shadow: none;
}
</style>
