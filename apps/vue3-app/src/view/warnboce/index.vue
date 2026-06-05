<script setup>
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, WarningFilled } from '@element-plus/icons-vue'

/** 拨测告警列表接口（Swagger: GET /tbDetectionAlert/list） */
const TB_ALERT_LIST_API = '/tbDetectionAlert/list'
/** 本地联调开关：true 使用 mock，false 走后端接口 */
const USE_MOCK = false
const PAGE_SIZE_OPTIONS = [16, 32, 64]
const DEFAULT_PAGE_SIZE = 16

const SORT_FIELD_MAP = {
  createTime: 'createTime'
}

function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getDefaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 7)
  return [toDateStr(start), toDateStr(end)]
}

const query = reactive({
  keyword: '',
  dateRange: getDefaultDateRange(),
  sortField: '',
  sortOrder: ''
})

const page = ref(1)
const pageSize = ref(DEFAULT_PAGE_SIZE)
const total = ref(0)
const loading = ref(false)
const pageData = ref([])
const reqSeq = ref(0)
let filterWatchTimer = null

const mockRecords = [
  {
    id: 1,
    content: '测试告警',
    createTime: '2026-04-22T18:00:00',
    resultId: null,
    ruleId: 1,
    managementIP: '172.16.1.21',
    target: '147.95.205.11:22',
    ruleName: '测试规则',
    alertCondition: 'all'
  },
  {
    id: 2,
    content: '端口可达性波动',
    createTime: '2026-04-21T15:20:00',
    resultId: 12001,
    ruleId: 2,
    managementIP: '172.16.1.22',
    target: '10.20.0.8:443',
    ruleName: '链路拨测规则',
    alertCondition: 'any'
  },
  {
    id: 3,
    content: '响应延迟超阈值',
    createTime: '2026-04-20T08:40:00',
    resultId: null,
    ruleId: 3,
    managementIP: '172.16.1.23',
    target: '10.20.0.9:80',
    ruleName: 'HTTP 时延规则',
    alertCondition: 'all'
  },
  {
    id: 4,
    content: 'DNS 拨测失败',
    createTime: '2026-04-19T11:05:00',
    resultId: 12002,
    ruleId: 4,
    managementIP: '172.16.1.24',
    target: '8.8.8.8:53',
    ruleName: 'DNS 可用性规则',
    alertCondition: 'any'
  },
  {
    id: 5,
    content: 'SSH 连通性异常',
    createTime: '2026-04-18T22:12:00',
    resultId: null,
    ruleId: 5,
    managementIP: '172.16.1.25',
    target: '192.168.100.10:22',
    ruleName: '主机 SSH 规则',
    alertCondition: 'all'
  }
]

function toTimeMs(v) {
  const t = new Date(v).getTime()
  return Number.isNaN(t) ? 0 : t
}

function buildListQueryParams() {
  const [from = '', to = ''] = Array.isArray(query.dateRange) ? query.dateRange : []
  const params = new URLSearchParams({
    current: String(page.value),
    size: String(pageSize.value),
    from,
    to
  })

  const keyword = String(query.keyword ?? '').trim()
  if (keyword) params.set('query', keyword)
  if (query.sortField) params.set('orderBy', query.sortField)
  if (query.sortOrder) params.set('order', query.sortOrder)

  return params
}

function buildStatusMeta(record) {
  if (record?.resultId === null || record?.resultId === undefined || record?.resultId === '') {
    return {
      text: '未处理',
      className: 'pending',
      tooltip: '该告警尚未关联处理结果，请尽快处理。',
      showAlertIcon: true
    }
  }
  return {
    text: '已处理',
    className: 'success',
    tooltip: `处理结果ID: ${record.resultId}`,
    showAlertIcon: false
  }
}

function mapAlertRecord(record) {
  return {
    ...record,
    _statusMeta: buildStatusMeta(record)
  }
}

function normalizeListResponse(raw) {
  const payload = raw?.data ?? {}
  const records = Array.isArray(payload?.records) ? payload.records : []
  return {
    list: records.map(mapAlertRecord),
    total: Number(payload?.total ?? 0)
  }
}

async function queryTbAlertListFromBackend() {
  const params = buildListQueryParams()
  const response = await fetch(`${TB_ALERT_LIST_API}?${params.toString()}`, {
    method: 'GET'
  })
  if (!response.ok) {
    throw new Error(`查询拨测告警失败: HTTP ${response.status}`)
  }
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error('接口返回非 JSON，请检查接口地址或本地代理配置')
  }
  const data = await response.json()
  return normalizeListResponse(data)
}

async function queryTbAlertListByMock() {
  const [from = '', to = ''] = Array.isArray(query.dateRange) ? query.dateRange : []
  const keyword = String(query.keyword ?? '').trim().toLowerCase()
  const fromMs = from ? toTimeMs(`${from}T00:00:00`) : 0
  const toMs = to ? toTimeMs(`${to}T23:59:59`) : Number.MAX_SAFE_INTEGER

  let list = mockRecords.filter((x) => {
    const t = toTimeMs(x.createTime)
    const inRange = t >= fromMs && t <= toMs
    if (!inRange) return false
    if (!keyword) return true
    return [x.content, x.ruleName, x.target].some((f) => String(f ?? '').toLowerCase().includes(keyword))
  })

  if (query.sortField === 'createTime' && query.sortOrder) {
    const factor = query.sortOrder === 'asc' ? 1 : -1
    list = list.slice().sort((a, b) => (toTimeMs(a.createTime) - toTimeMs(b.createTime)) * factor)
  }

  const start = (page.value - 1) * pageSize.value
  return {
    list: list.slice(start, start + pageSize.value).map(mapAlertRecord),
    total: list.length
  }
}

async function fetchList() {
  const curSeq = ++reqSeq.value
  loading.value = true
  try {
    const res = USE_MOCK ? await queryTbAlertListByMock() : await queryTbAlertListFromBackend()
    if (curSeq !== reqSeq.value) return
    pageData.value = res.list
    total.value = res.total
  } catch (err) {
    if (curSeq !== reqSeq.value) return
    pageData.value = []
    total.value = 0
    ElMessage.error(err?.message || '查询拨测告警失败，请稍后重试')
  } finally {
    if (curSeq === reqSeq.value) loading.value = false
  }
}

function reloadFromFirstPage() {
  if (page.value !== 1) page.value = 1
  else fetchList()
}

watch([page, pageSize], fetchList, { immediate: true })

watch(
  () => [query.keyword, ...(Array.isArray(query.dateRange) ? query.dateRange : [])],
  () => {
    if (filterWatchTimer) clearTimeout(filterWatchTimer)
    filterWatchTimer = setTimeout(() => {
      if (!Array.isArray(query.dateRange) || query.dateRange.length !== 2) return
      reloadFromFirstPage()
    }, 250)
  }
)

function onSearch() {
  if (!Array.isArray(query.dateRange) || query.dateRange.length !== 2) {
    ElMessage.warning('请选择完整的告警时间范围')
    return
  }
  reloadFromFirstPage()
}

function onReset() {
  query.keyword = ''
  query.dateRange = getDefaultDateRange()
  query.sortField = ''
  query.sortOrder = ''
  reloadFromFirstPage()
}

function onTableSortChange({ prop, order }) {
  const backendField = SORT_FIELD_MAP[prop]
  if (!backendField) return
  query.sortField = backendField
  query.sortOrder = order === 'ascending' ? 'asc' : order === 'descending' ? 'desc' : ''
  reloadFromFirstPage()
}

function renderAlertCondition(row) {
  const cond = String(row?.alertCondition ?? '').trim()
  if (!cond) return '-'
  if (cond === 'all') return '全满足'
  if (cond === 'any') return '任一满足'
  return cond
}
</script>

<template>
  <div class="traffic-warning-page">
    <el-card shadow="never" class="table-card">
      <div class="toolbar">
        <el-form :model="query" class="filter-form" label-width="90px">
          <el-row :gutter="16">
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="关键字">
                <el-input
                  v-model="query.keyword"
                  placeholder="请输入内容/规则名称/目标地址"
                  clearable
                  @keyup.enter="onSearch"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="告警时间">
                <el-date-picker
                  v-model="query.dateRange"
                  type="daterange"
                  value-format="YYYY-MM-DD"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="24">
              <div class="filter-actions">
                <el-button type="primary" @click="onSearch">
                  <el-icon><Search /></el-icon>
                  查询
                </el-button>
                <el-button @click="onReset">重置</el-button>
              </div>
            </el-col>
          </el-row>
        </el-form>
      </div>

      <el-table
        v-loading="loading"
        :data="pageData"
        stripe
        style="width: 100%"
        @sort-change="onTableSortChange"
      >
        <el-table-column prop="content" label="告警内容" min-width="220" show-overflow-tooltip />
        <el-table-column prop="ruleName" label="规则名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="target" label="目标地址" min-width="150" />
        <el-table-column prop="managementIP" label="管理IP" min-width="140" />
        <el-table-column label="告警条件" min-width="100" align="center">
          <template #default="{ row }">
            {{ renderAlertCondition(row) }}
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="告警时间" min-width="180" sortable="custom" />
        <el-table-column label="处理状态" width="120" align="center">
          <template #default="{ row }">
            <span class="op-status-pill" :class="`op-status-${row._statusMeta.className}`">
              <el-tooltip
                v-if="row._statusMeta.showAlertIcon"
                :content="row._statusMeta.tooltip"
                placement="top"
                effect="dark"
              >
                <el-icon class="op-status-alert-icon">
                  <WarningFilled />
                </el-icon>
              </el-tooltip>
              <span>{{ row._statusMeta.text }}</span>
            </span>
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
  </div>
</template>

<style scoped>
.traffic-warning-page {
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

.filter-actions .el-icon {
  margin-right: 4px;
}

.op-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  white-space: nowrap;
  font-size: 12px;
  line-height: 1.2;
}

.op-status-alert-icon {
  font-size: 12px;
}

.op-status-pending {
  color: #f56c6c;
  background: #fef0f0;
  border-color: #fde2e2;
}

.op-status-running {
  color: #e6a23c;
  background: #fdf6ec;
  border-color: #faecd8;
}

.op-status-success {
  color: #67c23a;
  background: #f0f9eb;
  border-color: #e1f3d8;
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
</style>
