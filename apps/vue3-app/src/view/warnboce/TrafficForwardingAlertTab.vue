<script setup>
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { fetchTrafficForwardAlertHistoryApi } from '@/api/trafficForwarding'

/**
 * 流量转发告警历史列表（后端分页或 API 模块内 mock）。
 */
const PAGE_SIZE_OPTIONS = [16, 32, 64]
const DEFAULT_PAGE_SIZE = 16

/**
 * 表格列 prop → 后端排序字段 orderBy（由后端排序；与 Swagger 不一致时改此处）
 */
const SORT_PROP_TO_ORDER_BY = {
  abnormalTime: 'abnormal_time',
  alarmTime: 'alarm_time'
}

const abnormalStatusOptions = [
  { label: '全部', value: '' },
  { label: '告警中', value: 'ALERTING' },
  { label: '已恢复', value: 'RECOVERED' },
  { label: '未确认', value: 'UNACK' }
]

const statusLabelMap = {
  ALERTING: '告警中',
  RECOVERED: '已恢复',
  UNACK: '未确认'
}

const query = reactive({
  keyword: '',
  abnormalStatus: '',
  abnormalTimeRange: null,
  alarmTimeRange: null,
  /** 传给后端的排序列，如 abnormal_time / alarm_time */
  orderBy: '',
  /** asc | desc */
  order: ''
})

const page = ref(1)
const pageSize = ref(DEFAULT_PAGE_SIZE)
const total = ref(0)
const loading = ref(false)
const pageData = ref([])
const reqSeq = ref(0)
let filterWatchTimer = null

function formatStatusText(code) {
  return statusLabelMap[code] || String(code || '-')
}

function appendRangeParams(params, prefix, range) {
  if (!Array.isArray(range) || range.length !== 2) return
  const [a, b] = range
  if (a) params[`${prefix}From`] = String(a)
  if (b) params[`${prefix}To`] = String(b)
}

function buildListQueryParams() {
  const params = {
    current: String(page.value),
    size: String(pageSize.value)
  }
  const keyword = String(query.keyword ?? '').trim()
  if (keyword) params.keyword = keyword
  const st = String(query.abnormalStatus ?? '').trim()
  if (st) params.abnormalStatus = st
  appendRangeParams(params, 'abnormalTime', query.abnormalTimeRange)
  appendRangeParams(params, 'alarmTime', query.alarmTimeRange)
  if (query.orderBy) params.orderBy = query.orderBy
  if (query.order) params.order = query.order
  return params
}

function normalizeListResponse(raw) {
  const payload = raw?.data ?? raw ?? {}
  const records = Array.isArray(payload?.records) ? payload.records : []
  return {
    list: records,
    total: Number(payload?.total ?? 0)
  }
}

async function queryList() {
  // 页面不直接 fetch，mock/真实请求由 API 模块统一处理。
  const data = await fetchTrafficForwardAlertHistoryApi(buildListQueryParams())
  return normalizeListResponse(data)
}

async function fetchList() {
  const curSeq = ++reqSeq.value
  loading.value = true
  try {
    const res = await queryList()
    if (curSeq !== reqSeq.value) return
    pageData.value = res.list
    total.value = res.total
  } catch (err) {
    if (curSeq !== reqSeq.value) return
    pageData.value = []
    total.value = 0
    ElMessage.error(err?.message || '查询流量转发告警失败，请稍后重试')
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
  () => [
    query.keyword,
    query.abnormalStatus,
    ...(Array.isArray(query.abnormalTimeRange) ? query.abnormalTimeRange : []),
    ...(Array.isArray(query.alarmTimeRange) ? query.alarmTimeRange : [])
  ],
  () => {
    if (filterWatchTimer) clearTimeout(filterWatchTimer)
    filterWatchTimer = setTimeout(() => reloadFromFirstPage(), 280)
  }
)

function onSearch() {
  reloadFromFirstPage()
}

function onReset() {
  query.keyword = ''
  query.abnormalStatus = ''
  query.abnormalTimeRange = null
  query.alarmTimeRange = null
  query.orderBy = ''
  query.order = ''
  reloadFromFirstPage()
}

/** 表头排序仅下发给 API，列表顺序以接口返回为准 */
function onTableSortChange({ prop, order }) {
  if (!order) {
    query.orderBy = ''
    query.order = ''
    reloadFromFirstPage()
    return
  }
  const orderBy = SORT_PROP_TO_ORDER_BY[prop]
  if (!orderBy) return
  query.orderBy = orderBy
  query.order = order === 'ascending' ? 'asc' : 'desc'
  reloadFromFirstPage()
}
</script>

<template>
  <div class="tf-forward-alert-page">
    <el-card shadow="never" class="table-card">
      <div class="toolbar">
        <el-form :model="query" class="filter-form" label-width="96px">
          <el-row :gutter="16">
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="关键字">
                <el-input
                  v-model="query.keyword"
                  placeholder="告警内容 / 规则名称 / 主机 IP / 主机名称"
                  clearable
                  @keyup.enter="onSearch"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="异常状态">
                <el-select
                  v-model="query.abnormalStatus"
                  placeholder="全部"
                  clearable
                  style="width: 100%"
                >
                  <el-option
                    v-for="opt in abnormalStatusOptions"
                    :key="String(opt.value)"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="24" :md="8">
              <el-form-item label="异常时间">
                <el-date-picker
                  v-model="query.abnormalTimeRange"
                  type="datetimerange"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  range-separator="至"
                  start-placeholder="开始"
                  end-placeholder="结束"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="24" :md="16">
              <el-form-item label="告警时间">
                <el-date-picker
                  v-model="query.alarmTimeRange"
                  type="datetimerange"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  range-separator="至"
                  start-placeholder="开始"
                  end-placeholder="结束"
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
        max-height="600"
        @sort-change="onTableSortChange"
      >
        <el-table-column
          prop="alarmContent"
          label="告警内容"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column prop="ruleName" label="规则名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="hostIp" label="主机 IP" min-width="130" show-overflow-tooltip />
        <el-table-column prop="hostName" label="主机名称" min-width="140" show-overflow-tooltip />
        <el-table-column label="异常状态" width="110" align="center">
          <template #default="{ row }">
            {{ formatStatusText(row.abnormalStatus) }}
          </template>
        </el-table-column>
        <el-table-column prop="abnormalTime" label="异常时间" min-width="170" sortable="custom" />
        <el-table-column prop="alarmTime" label="告警时间" min-width="170" sortable="custom" />
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
.tf-forward-alert-page {
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
