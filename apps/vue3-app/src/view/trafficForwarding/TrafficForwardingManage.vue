<script setup>
import { h, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, View, Delete, VideoPlay, VideoPause, WarningFilled } from '@element-plus/icons-vue'
import {
  queryTrafficForwardingListApi,
  startTrafficForwardingCollectApi,
  stopTrafficForwardingCollectApi,
  uninstallTrafficForwardingApi
} from '@/api/trafficForwarding'

const router = useRouter()

const groupOptions = [
  { label: '全部', value: '' },
  { label: '生产环境组', value: '生产环境组' },
  { label: '测试环境组', value: '测试环境组' },
  { label: '开发环境组', value: '开发环境组' }
]

const categoryOptions = [
  { label: '全部', value: '' },
  { label: '物理机', value: '物理机' },
  { label: '容器', value: '容器' },
  { label: '虚拟机', value: '虚拟机' }
]

const connectOptions = [
  { label: '全部', value: '' },
  { label: '已连接', value: '已连接' },
  { label: '未连接', value: '未连接' }
]

const collectOptions = [
  { label: '全部', value: '' },
  { label: '正在采集', value: '正在采集' },
  { label: '未采集', value: '未采集' },
  { label: '错误', value: '错误' }
]

const opStatusOptions = [
  { label: '全部', value: '' },
  { label: '无', value: '无' },
  { label: '待执行', value: '待执行' },
  { label: '执行中', value: '执行中' },
  { label: '执行成功', value: '执行成功' },
  { label: '卸载失败', value: '卸载失败' },
  { label: '启动失败', value: '启动失败' },
  { label: '停止失败', value: '停止失败' },
  { label: '超时', value: '超时' },
  { label: '参数错误', value: '参数错误' }
]

const query = reactive({
  physicalHost: '',
  physicalIP: '',
  group: '',
  category: '',
  connectStatus: '',
  collectStatus: '',
  opStatus: ''
})

const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const total = ref(0)
const pageData = ref([])
const reqSeq = ref(0)

// 行级按钮 loading（可防止重复点）
const rowActionLoading = reactive({})

async function fetchList() {
  const curSeq = ++reqSeq.value
  loading.value = true
  try {
    const res = await queryTrafficForwardingListApi({
      physicalHost: query.physicalHost,
      physicalIP: query.physicalIP,
      group: query.group,
      category: query.category,
      connectStatus: query.connectStatus,
      collectStatus: query.collectStatus,
      opStatus: query.opStatus,
      page: page.value,
      pageSize: pageSize.value
    })
    if (curSeq !== reqSeq.value) return
    pageData.value = Array.isArray(res?.list) ? res.list : []
    total.value = Number(res?.total ?? 0)

    const maxPage = Math.max(1, Math.ceil(total.value / pageSize.value))
    if (page.value > maxPage) {
      page.value = maxPage
      return
    }
  } finally {
    if (curSeq === reqSeq.value) loading.value = false
  }
}

function reloadFromFirstPage() {
  if (page.value !== 1) page.value = 1
  else fetchList()
}

watch([page, pageSize], fetchList, { immediate: true })

// 筛选条件变化时自动请求（加一点防抖，避免快速输入时频繁打接口）
let queryWatchTimer = null
watch(
  () => [
    query.physicalHost,
    query.physicalIP,
    query.group,
    query.category,
    query.connectStatus,
    query.collectStatus,
    query.opStatus
  ],
  () => {
    if (queryWatchTimer) clearTimeout(queryWatchTimer)
    queryWatchTimer = setTimeout(() => {
      reloadFromFirstPage()
    }, 400)
  }
)

const selection = ref([])
function onSelectionChange(rows) {
  selection.value = rows
}

function onSearch() {
  reloadFromFirstPage()
}

function onReset() {
  query.physicalHost = ''
  query.physicalIP = ''
  query.group = ''
  query.category = ''
  query.connectStatus = ''
  query.collectStatus = ''
  query.opStatus = ''
  reloadFromFirstPage()
}

function opStatusText(opStatus) {
  const map = {
    无: '无',
    待执行: '待执行',
    执行中: '执行中',
    执行成功: '执行成功',
    卸载失败: '卸载失败',
    启动失败: '启动失败',
    停止失败: '停止失败',
    超时: '超时',
    参数错误: '参数错误'
  }
  return map[opStatus] ?? opStatus
}

function opStatusErrorText(opStatus) {
  // 给“失败类状态”提供更详细的错误信息，用于悬浮提示框
  const map = {
    卸载失败: '卸载指令下发失败：节点当前状态不允许卸载。',
    启动失败: '启动指令失败：采集器镜像拉取/启动超时。',
    停止失败: '停止指令失败：当前采集任务未能正常停止。',
    超时: '任务执行超时：请检查网络与采集器运行状态。',
    参数错误: '参数校验失败：请确认目标配置与必填项。'
  }
  return map[opStatus] ?? ''
}

function opStatusClass(opStatus) {
  const map = {
    无: 'none',
    待执行: 'pending',
    执行中: 'running',
    执行成功: 'success',
    卸载失败: 'fail-uninstall',
    启动失败: 'fail-start',
    停止失败: 'fail-stop',
    超时: 'timeout',
    参数错误: 'param-error'
  }
  return map[opStatus] ?? 'none'
}

function onDetail(row) {
  router.push({ name: 'trafficForwardingDetail', params: { id: row.id } })
}

async function onUninstall(row) {
  try {
    const confirmTitle = '确认删除'
    const content = h('div', { style: { lineHeight: '1.8' } }, [
      h('div', null, `确定要卸载节点“${row.host}”（${row.ip}）上的采集器吗？`),
      h('ul', { style: { margin: '12px 0 0', paddingLeft: '18px' } }, [
        h(
          'li',
          null,
          '卸载成功后将无法对该采集器执行启动、停止等操作。'
        ),
        h('li', null, '如需再次使用，需要重新安装采集器。')
      ])
    ])

    await ElMessageBox.confirm(content, confirmTitle, {
      type: 'warning',
      width: '760px',
      confirmButtonText: '卸载',
      cancelButtonText: '取消'
    })
    rowActionLoading[row.id] = true
    await uninstallTrafficForwardingApi({ id: row.id })
    ElMessage.success('卸载指令已下发')
    fetchList()
  } catch (_) {}
  finally {
    rowActionLoading[row.id] = false
  }
}

async function onStart(row) {
  try {
    rowActionLoading[row.id] = true
    await startTrafficForwardingCollectApi({ id: row.id })
    ElMessage.success(`已下发启动：${row.host}`)
    fetchList()
  } catch (_) {}
  finally {
    rowActionLoading[row.id] = false
  }
}

async function onStop(row) {
  try {
    rowActionLoading[row.id] = true
    await stopTrafficForwardingCollectApi({ id: row.id })
    ElMessage.success(`已下发停止：${row.host}`)
    fetchList()
  } catch (_) {}
  finally {
    rowActionLoading[row.id] = false
  }
}
</script>

<template>
  <div class="traffic-forwarding-manage">
    <el-card shadow="never" class="table-card">
      <div class="toolbar">
        <el-form :model="query" class="filter-form" label-width="90px">
          <el-row :gutter="16">
            <el-col :xs="24" :sm="12" :md="6">
              <el-form-item label="物理主机">
                <el-input v-model="query.physicalHost" placeholder="请输入物理主机" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <el-form-item label="物理IP">
                <el-input v-model="query.physicalIP" placeholder="请输入物理IP" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <el-form-item label="分组">
                <el-input v-model="query.group" placeholder="请输入分组" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <el-form-item label="类别">
                <el-select v-model="query.category" placeholder="全部" clearable style="width: 100%">
                  <el-option v-for="o in categoryOptions" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :xs="24" :sm="12" :md="6">
              <el-form-item label="连通状态">
                <el-select v-model="query.connectStatus" placeholder="全部" clearable style="width: 100%">
                  <el-option v-for="o in connectOptions" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <el-form-item label="采集状态">
                <el-select v-model="query.collectStatus" placeholder="全部" clearable style="width: 100%">
                  <el-option v-for="o in collectOptions" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <el-form-item label="操作状态">
                <el-select v-model="query.opStatus" placeholder="全部" clearable style="width: 100%">
                  <el-option v-for="o in opStatusOptions" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
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

      <el-table v-loading="loading" :data="pageData" stripe style="width: 100%" @selection-change="onSelectionChange">
        <el-table-column type="selection" width="48" />
        <el-table-column prop="host" label="物理主机" min-width="150" />
        <el-table-column prop="ip" label="物理IP" min-width="130" />
        <el-table-column prop="group" label="分组" min-width="120" />
        <el-table-column label="类别" min-width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" type="info" effect="plain">{{ row.category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="连通状态" min-width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.connectStatus === '已连接' ? 'success' : 'danger'" effect="light">
              {{ row.connectStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="采集状态" min-width="100" align="center">
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="
                row.collectStatus === '正在采集' ? 'primary' : row.collectStatus === '错误' ? 'danger' : 'info'
              "
              effect="light"
            >
              {{ row.collectStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作状态" min-width="120" align="center">
          <template #default="{ row }">
            <span class="op-status-pill" :class="`op-status-${opStatusClass(row.opStatus)}`">
              <el-tooltip
                v-if="['卸载失败', '启动失败', '停止失败', '超时', '参数错误'].includes(row.opStatus)"
                :content="opStatusErrorText(row.opStatus)"
                placement="top"
                effect="dark"
              >
                <el-icon class="op-status-fail-icon">
                  <WarningFilled />
                </el-icon>
              </el-tooltip>
              {{ opStatusText(row.opStatus) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="260" align="center" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="onDetail(row)">
              <el-icon><View /></el-icon>
              详情
            </el-button>
            <el-button
              size="small"
              type="danger"
              :loading="rowActionLoading[row.id]"
              @click="onUninstall(row)"
            >
              <el-icon><Delete /></el-icon>
              卸载
            </el-button>
            <el-button
              size="small"
              type="success"
              :loading="rowActionLoading[row.id]"
              @click="onStart(row)"
            >
              <el-icon><VideoPlay /></el-icon>
              启动
            </el-button>
            <el-button
              size="small"
              type="danger"
              :loading="rowActionLoading[row.id]"
              @click="onStop(row)"
            >
              <el-icon><VideoPause /></el-icon>
              停止
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <div class="total">共 {{ total }} 条</div>
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>

.traffic-forwarding-manage {
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

/* Element Plus 的 MessageBox 需要强制覆盖时，使用 customClass 定向修改 */
:global(.traffic-uninstall-confirm-box .el-message-box__wrapper) {
  width: 760px !important;
  min-width: 760px !important;
}
</style>
