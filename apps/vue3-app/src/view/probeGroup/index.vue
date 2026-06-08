<script setup>
/**
 * 探针分组管理：工具栏筛选、分页表格、新增/编辑分组弹窗、启停与删除。
 * 列表与各 *ProbeGroupApi 为前端模拟，接后端时替换实现并保留字段结构即可。
 */
import { onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Download, Upload, EditPen, Delete, View, Search } from '@element-plus/icons-vue'
import AddProbeGroupDialog from './AddProbeGroupDialog.vue'
import { probeGroupMockRecords } from '@/mocks/probeGroup'

const router = useRouter()

// --- 筛选项下拉（与表格、弹窗共用） ---
const regionOptions = [
  { label: '黄山', value: '黄山' },
  { label: '上海', value: '上海' },
  { label: '北京', value: '北京' }
]

const typeOptions = [
  { label: '物理', value: '物理' },
  { label: '容器', value: '容器' },
  { label: '虚拟机', value: '虚拟机' }
]

const statusOptions = [
  { label: '全部', value: '' },
  { label: '已启用', value: '已启用' },
  { label: '未启用', value: '未启用' }
]

const allProbeGroups = ref(
  probeGroupMockRecords.map((record) => ({ ...record }))
)

const query = reactive({
  name: '',
  type: '',
  region: '',
  status: ''
})

const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const total = ref(0)
const pageData = ref([])
const reqSeq = ref(0)
/** 行内按钮 loading，按行 id 记录，防止重复提交 */
const rowActionLoading = reactive({})

/** 列表查询（模拟分页接口）：按名称/类型/所属/状态过滤后 slice */
function queryProbeGroupListApi(params) {
  // 接真实接口时：替换实现即可；保持入参/出参结构（list + total）
  return new Promise((resolve) => {
    setTimeout(() => {
      const nameK = String(params.name ?? '').trim().toLowerCase()
      const type = String(params.type ?? '')
      const region = String(params.region ?? '')
      const status = String(params.status ?? '')
      const p = Number(params.page ?? 1)
      const ps = Number(params.pageSize ?? 10)

      const filtered = allProbeGroups.value.filter((g) => {
        const okName = !nameK || g.name.toLowerCase().includes(nameK)
        const okType = !type || g.type === type
        const okRegion = !region || g.region === region
        const okStatus = !status || g.status === status
        return okName && okType && okRegion && okStatus
      })

      const start = (p - 1) * ps
      resolve({ list: filtered.slice(start, start + ps), total: filtered.length })
    }, 250)
  })
}

/** 拉取当前页数据；reqSeq 用于丢弃过期响应（快速翻页/改条件时） */
async function fetchList() {
  const curSeq = ++reqSeq.value
  loading.value = true
  try {
    const res = await queryProbeGroupListApi({
      ...query,
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

/**
 * 筛选条件变化时会先把 page 置为 1；若不抑制，page watcher 与 query 防抖会各请求一次。
 * suppressNextPageFetch 跳过一次 page watcher 内的 fetchList。
 */
const suppressNextPageFetch = ref(false)
watch(
  [page, pageSize],
  () => {
    if (suppressNextPageFetch.value) {
      suppressNextPageFetch.value = false
      return
    }
    fetchList()
  },
  { immediate: true }
)

// --- 筛选条件变化自动拉列表：类型/所属/状态立即请求；仅改名称时防抖 ---
let filterDebounceTimer = null
function clearFilterDebounceTimer() {
  if (filterDebounceTimer) {
    clearTimeout(filterDebounceTimer)
    filterDebounceTimer = null
  }
}

watch(
  () => [query.name, query.type, query.region, query.status],
  (nv, ov) => {
    clearFilterDebounceTimer()
    const selectChanged =
      !ov || nv[1] !== ov[1] || nv[2] !== ov[2] || nv[3] !== ov[3]
    const nameChanged = !ov || nv[0] !== ov[0]
    const onlyNameChanged = nameChanged && !selectChanged

    const run = () => {
      filterDebounceTimer = null
      if (page.value !== 1) {
        suppressNextPageFetch.value = true
        page.value = 1
      }
      fetchList()
    }

    if (onlyNameChanged) {
      filterDebounceTimer = setTimeout(run, 400)
    } else {
      run()
    }
  }
)

onBeforeUnmount(() => {
  clearFilterDebounceTimer()
})

function onSearch() {
  clearFilterDebounceTimer()
  if (page.value !== 1) {
    suppressNextPageFetch.value = true
    page.value = 1
  }
  fetchList()
}

function onReset() {
  clearFilterDebounceTimer()
  const hadFilter =
    String(query.name ?? '').trim() !== '' ||
    !!query.type ||
    !!query.region ||
    !!query.status
  query.name = ''
  query.type = ''
  query.region = ''
  query.status = ''
  // 有筛选项时由 watch 统一归到第一页并请求；无筛选项时 watch 可能不触发，需自行处理分页与刷新
  if (!hadFilter && page.value === 1) {
    fetchList()
    return
  }
  if (!hadFilter && page.value !== 1) {
    suppressNextPageFetch.value = true
    page.value = 1
    fetchList()
  }
}

/** 新建行展示用创建时间 */
function getTodayString() {
  const d = new Date()
  const yyyy = String(d.getFullYear())
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const HH = String(d.getHours()).padStart(2, '0')
  const mm2 = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${yyyy}/${mm}/${dd} ${HH}:${mm2}:${ss}`
}

function createProbeGroupApi(payload) {
  // 接真实接口时替换；返回新建 id 即可
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id: Date.now(), ...payload })
    }, 400)
  })
}

/** 编辑分组：接真实接口时替换为 PUT/PATCH；失败请 reject */
function updateProbeGroupApi(id, body) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const exists = allProbeGroups.value.some((g) => g.id === id)
      if (!exists) {
        reject(new Error('分组不存在或已删除'))
        return
      }
      resolve({ id, ...body })
    }, 400)
  })
}

function deleteProbeGroupApi(id) {
  return new Promise((resolve) => {
    setTimeout(() => {
      allProbeGroups.value = allProbeGroups.value.filter((g) => g.id !== id)
      resolve(true)
    }, 300)
  })
}

function enableProbeGroupApi(id) {
  // 接真实接口时：替换为启用/恢复接口调用
  return new Promise((resolve) => {
    setTimeout(() => {
      const g = allProbeGroups.value.find((x) => x.id === id)
      if (g) g.status = '已启用'
      resolve(true)
    }, 300)
  })
}

function stopProbeGroupApi(id) {
  // 接真实接口时：替换为停止/禁用接口调用
  return new Promise((resolve) => {
    setTimeout(() => {
      const g = allProbeGroups.value.find((x) => x.id === id)
      if (g) g.status = '未启用'
      resolve(true)
    }, 300)
  })
}

// --- 新增/编辑弹窗：与 AddProbeGroupDialog 联动 ---
const createVisible = ref(false)
/** create：新建；edit：回填 initialDialogData，提交时走更新逻辑 */
const dialogMode = ref('create')
const editingId = ref(null)

/**
 * 弹窗第一步回填：新建为 null；编辑为点击行内「编辑」时该行的快照（避免仅用 id 查找与弹窗打开时机不同步）。
 */
const dialogInitialData = ref(null)

function buildDialogInitialFromRow(row) {
  if (!row) return null
  return {
    name: row.name ?? '',
    type: row.type ?? '',
    region: row.region ?? '',
    status: row.status ?? '已启用',
    /** 存库 JSON 字符串，内含 ruleGroup 数组、relation 等；弹窗内解析回显 */
    rule: row.rule ?? ''
  }
}

/** 弹窗第二步已选采集器初始值（当前编辑未接成员详情，故多为空） */
const initialSelectedCollectors = ref([])

function openCreate() {
  dialogMode.value = 'create'
  editingId.value = null
  dialogInitialData.value = null
  initialSelectedCollectors.value = []
  createVisible.value = true
}

function openEdit(row) {
  dialogMode.value = 'edit'
  editingId.value = row.id
  dialogInitialData.value = buildDialogInitialFromRow(row)
  // 当前弹框只要求基本信息 + 采集器成员（这里先不回填成员）
  initialSelectedCollectors.value = []
  createVisible.value = true
}

/**
 * 弹窗内「确认创建 / 确认修改」：先走接口，成功后再由弹窗关闭；失败由弹窗展示错误并保持打开。
 */
async function handleProbeGroupSubmitRequest(payload) {
  const now = getTodayString()
  const collectorCount = Array.isArray(payload?.collectors) ? payload.collectors.length : 0

  if (dialogMode.value === 'create') {
    const res = await createProbeGroupApi({
      name: payload.name,
      type: payload.type,
      region: payload.region,
      status: payload.status,
      collectorCount,
      rule: payload.rule
    })
    allProbeGroups.value.unshift({
      id: res.id,
      name: payload.name,
      type: payload.type,
      region: payload.region,
      status: payload.status,
      collectorCount,
      createdAt: now,
      rule: payload.rule
    })
    ElMessage.success('创建成功')
  } else {
    const id = editingId.value
    await updateProbeGroupApi(id, {
      name: payload.name,
      type: payload.type,
      region: payload.region,
      status: payload.status,
      collectorCount,
      rule: payload.rule
    })
    const idx = allProbeGroups.value.findIndex((g) => g.id === id)
    if (idx >= 0) {
      allProbeGroups.value[idx] = {
        ...allProbeGroups.value[idx],
        name: payload.name,
        type: payload.type,
        region: payload.region,
        status: payload.status,
        collectorCount,
        rule: payload.rule
      }
    }
    ElMessage.success('保存成功')
  }

  onSearch()
}

// --- 表格行操作（均带二次确认） ---
async function onDelete(row) {
  try {
    rowActionLoading[row.id] = true
    await ElMessageBox.confirm(`确定删除“${row.name}”吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
    await deleteProbeGroupApi(row.id)
    ElMessage.success('已删除')
    fetchList()
  } catch (_) {}
  finally {
    rowActionLoading[row.id] = false
  }
}

async function onEnable(row) {
  try {
    rowActionLoading[row.id] = true
    await ElMessageBox.confirm(`确定启用“${row.name}”吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '启用',
      cancelButtonText: '取消'
    })
    await enableProbeGroupApi(row.id)
    ElMessage.success('已启用')
    fetchList()
  } catch (_) {}
  finally {
    rowActionLoading[row.id] = false
  }
}

async function onStop(row) {
  try {
    rowActionLoading[row.id] = true
    await ElMessageBox.confirm(`确定停止“${row.name}”吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '停止',
      cancelButtonText: '取消'
    })
    await stopProbeGroupApi(row.id)
    ElMessage.success('已停止')
    fetchList()
  } catch (_) {}
  finally {
    rowActionLoading[row.id] = false
  }
}

const tableRef = ref(null)
const importInputRef = ref(null)
/** 当前表格勾选行（含跨页 reserve-selection） */
const selectedTableRows = ref([])
const importLoading = ref(false)
const exportLoading = ref(false)

function onTableSelectionChange(rows) {
  selectedTableRows.value = rows
}

/** 触发隐藏 input，选择文件后在 onImportFileChange 里上传 */
function onImport() {
  importInputRef.value?.click?.()
}

/**
 * 导入上传接口（模拟）：真实环境用 axios.post('/api/probe-group/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
 * 此处读取 file 解析 JSON 并入本地列表，格式与导出一致：数组或 { list: [] }
 */
function importProbeGroupUploadApi(formData) {
  const file = formData.get('file')
  if (!file || !file.size) {
    return Promise.reject(new Error('请选择有效文件'))
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      setTimeout(() => {
        try {
          const text = String(reader.result ?? '')
          const data = JSON.parse(text)
          const list = Array.isArray(data) ? data : data?.list ?? data?.rows ?? []
          if (!Array.isArray(list) || !list.length) {
            reject(new Error('文件中无可导入的分组数据'))
            return
          }
          let maxId = 0
          for (const g of allProbeGroups.value) {
            const n = Number(g.id)
            if (!Number.isNaN(n) && n > maxId) maxId = n
          }
          const now = getTodayString()
          let added = 0
          for (const raw of list) {
            const name = String(raw?.name ?? '').trim()
            if (!name) continue
            maxId += 1
            allProbeGroups.value.push({
              id: maxId,
              name,
              type: String(raw?.type ?? '物理'),
              region: String(raw?.region ?? ''),
              collectorCount: Math.max(0, Number(raw?.collectorCount) || 0),
              status: raw?.status === '未启用' ? '未启用' : '已启用',
              createdAt: String(raw?.createdAt ?? now)
            })
            added += 1
          }
          if (!added) {
            reject(new Error('没有有效的分组名称可导入'))
            return
          }
          resolve({ count: added })
        } catch {
          reject(new Error('解析失败，请使用本页导出生成的 JSON 文件'))
        }
      }, 450)
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsText(file)
  })
}

async function onImportFileChange(e) {
  const input = e.target
  const file = input?.files?.[0]
  if (!file) return
  const formData = new FormData()
  formData.append('file', file)
  importLoading.value = true
  try {
    const res = await importProbeGroupUploadApi(formData)
    ElMessage.success(`导入成功，共 ${res.count} 条`)
    tableRef.value?.clearSelection?.()
    onSearch()
  } catch (err) {
    ElMessage.error(err?.message || '导入失败')
  } finally {
    importLoading.value = false
    input.value = ''
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 导出接口（模拟）：真实环境由后端返回文件流，axios responseType: 'blob' 后 downloadBlob(res.data, filename)
 */
function exportProbeGroupApi(rows) {
  const payload = rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    region: r.region,
    collectorCount: r.collectorCount,
    status: r.status,
    createdAt: r.createdAt
  }))
  return new Promise((resolve) => {
    setTimeout(() => {
      const json = JSON.stringify(payload, null, 2)
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
      const filename = `probe-groups-${new Date().toISOString().slice(0, 10)}.json`
      resolve({ blob, filename })
    }, 400)
  })
}

async function onExport() {
  const rows = selectedTableRows.value
  if (!rows.length) {
    ElMessage.warning('请先勾选需要导出的分组')
    return
  }
  exportLoading.value = true
  try {
    const { blob, filename } = await exportProbeGroupApi(rows)
    downloadBlob(blob, filename)
    ElMessage.success(`已导出 ${rows.length} 条`)
  } catch (err) {
    ElMessage.error(err?.message || '导出失败')
  } finally {
    exportLoading.value = false
  }
}

function onProbeLink(row) {
  router.push({
    name: 'probe-group-collection-strategy',
    query: {
      id: String(row.id),
      name: row.name,
      type: row.type ?? ''
    }
  })
}

function statusTagType(status) {
  return status === '已启用' ? 'success' : 'info'
}
</script>

<template>
  <div class="page">
    <!-- 筛选与工具栏 -->
    <div  class="search-card">
      <div class="toolbar">
        <div class="left">
          <el-form :model="query" inline class="filter-form">
            <el-form-item label="分组名称">
              <el-input v-model="query.name" placeholder="请输入分组名称" clearable style="width: 220px" />
            </el-form-item>
            <el-form-item label="类型">
              <el-select v-model="query.type" placeholder="请选择类型" style="width: 160px" clearable>
                <el-option v-for="opt in typeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="所属">
              <el-select v-model="query.region" placeholder="请选择所属" style="width: 160px" clearable>
                <el-option v-for="opt in regionOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="采集集状态">
              <el-select v-model="query.status" placeholder="请选择状态" style="width: 180px" clearable>
                <el-option v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </el-form-item>
          </el-form>
        </div>
        <div class="right">
          <el-button type="primary" @click="onSearch">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="onReset">重置</el-button>
          <input
            ref="importInputRef"
            type="file"
            class="file-input-hidden"
            accept=".json,application/json"
            @change="onImportFileChange"
          />
          <el-button :loading="importLoading" @click="onImport">
            <el-icon><Upload /></el-icon>
            导入
          </el-button>
          <el-button :loading="exportLoading" :disabled="!selectedTableRows.length" @click="onExport">
            <el-icon><Download /></el-icon>
            导出
          </el-button>
          <el-button type="primary" @click="openCreate">
            <el-icon><Plus /></el-icon>
            新增分组
          </el-button>
        </div>
      </div>
    </div>

    <!-- 分组列表 + 分页 -->
    <el-card shadow="never" class="table-card" v-loading="loading">
      <el-table
        ref="tableRef"
        :data="pageData"
        row-key="id"
        stripe
        style="width: 100%"
        @selection-change="onTableSelectionChange"
      >
        <el-table-column type="selection" width="52" align="center" fixed="left" reserve-selection />
        <el-table-column prop="name" label="分组名称" min-width="220" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" min-width="120">
          <template #default="{ row }">
            <el-tag size="small" type="info" effect="plain">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="region" label="所属" min-width="100" sortable />
        <el-table-column prop="collectorCount" label="采集器数量" min-width="140" sortable />
        <el-table-column label="采集集状态" min-width="140" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" effect="light" size="small">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="170" sortable />
        <el-table-column label="操作" min-width="300" fixed="right" align="center">
          <template #default="{ row }">
            <el-space :size="8">
              <el-button size="small" type="primary" @click="onProbeLink(row)">
                <el-icon><View /></el-icon>
                采集策略
              </el-button>
              <el-button size="small" type="primary" @click="openEdit(row)">
                <el-icon><EditPen /></el-icon>
                编辑
              </el-button>
              <el-button
                v-if="row.status === '未启用'"
                size="small"
                type="success"
                :loading="rowActionLoading[row.id]"
                @click="onEnable(row)"
              >
                启用
              </el-button>
              <el-button
                v-else
                size="small"
                type="danger"
                :loading="rowActionLoading[row.id]"
                @click="onStop(row)"
              >
                停止
              </el-button>
              <el-button size="small" type="danger" plain :loading="rowActionLoading[row.id]" @click="onDelete(row)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </el-space>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <div class="total">
          共 {{ total }} 条
          <span v-if="selectedTableRows.length" class="selected-hint">，已选 {{ selectedTableRows.length }} 条</span>
        </div>
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

    <!-- 新增/编辑：两步表单，规则匹配采集器见子组件 -->
    <AddProbeGroupDialog
      v-model="createVisible"
      :region-options="regionOptions"
      :type-options="typeOptions"
      :mode="dialogMode"
      :initial-selected-collectors="initialSelectedCollectors"
      :initial-data="dialogInitialData"
      :submit-request="handleProbeGroupSubmitRequest"
    />
  </div>
</template>

<style scoped>
.search-card{
  margin-bottom: 12px;
}
.page {
  padding: 16px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.left,
.right {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-form :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 12px;
}

.table-card {
  padding-bottom: 4px;
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

.selected-hint {
  color: var(--el-color-primary);
  font-weight: 600;
}

/* 隐藏 file input，通过 ref 触发 click；勿加 pointer-events:none，否则部分浏览器无法弹出选文件 */
.file-input-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
