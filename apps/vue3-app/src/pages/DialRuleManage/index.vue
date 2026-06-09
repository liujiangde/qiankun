<script setup>
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Download, Upload, EditPen, Delete } from '@element-plus/icons-vue'
import CreateRuleDialog from './CreateRuleDialog.vue'
import {
  createDialRuleApi,
  deleteDialRuleApi,
  queryDialRuleListApi,
  startDialRuleApi,
  stopDialRuleApi,
  updateDialRuleApi
} from '@/api/dial'

const poolOptions = [
  { label: '拨测池A1', value: '拨测池A1' },
  { label: '拨测池B2', value: '拨测池B2' },
  { label: '拨测池C3', value: '拨测池C3' },
  { label: '拨测池D4', value: '拨测池D4' },
  { label: '拨测池E5', value: '拨测池E5' }
]

const methodOptions = [
  { label: '全部', value: '' },
  { label: 'ping', value: 'ping' },
  { label: 'tcp', value: 'tcp' },
  { label: 'http/https', value: 'http/https' }
]

const statusFilterOptions = [
  { label: '全部', value: '' },
  { label: '运行中', value: '运行中' },
  { label: '已停止', value: '已停止' }
]

const keyword = ref('')
const methodFilter = ref('')
const statusFilter = ref('')

const page = ref(1)
const pageSize = ref(5)
const loading = ref(false)
const total = ref(0)
const pageData = ref([])
const reqSeq = ref(0)

async function fetchList() {
  const curSeq = ++reqSeq.value
  loading.value = true
  try {
    const res = await queryDialRuleListApi({
      keyword: keyword.value,
      method: methodFilter.value,
      status: statusFilter.value,
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

// 分页变化时重新请求
watch([page, pageSize], fetchList, { immediate: true })
// 筛选条件变化时重置到第一页并重新请求（若已在第一页则直接请求，避免重复请求）
watch([keyword, methodFilter, statusFilter], () => {
  if (page.value !== 1) page.value = 1
  else fetchList()
})

const selection = ref([])
function onSelectionChange(rows) {
  selection.value = rows
}

function onSearch() {
  page.value = 1
  fetchList()
}

function methodTagType(method) {
  if (method === 'ping') return 'primary'
  if (method === 'tcp') return 'success'
  if (method === 'http/https') return 'warning'
  return 'info'
}

async function onStart(row) {
  try {
    await ElMessageBox.confirm(`确定启动规则“${row.pool} - ${row.target}”吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    await startDialRuleApi(row.id)
    ElMessage.success('已启动')
    fetchList()
  } catch (_) {
    // 用户取消确认框时保持当前状态，不需要额外提示。
  }
}

async function onStop(row) {
  try {
    await ElMessageBox.confirm(`确定停止规则“${row.pool} - ${row.target}”吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    await stopDialRuleApi(row.id)
    ElMessage.success('已停止')
    fetchList()
  } catch (_) {
    // 用户取消确认框时保持当前状态，不需要额外提示。
  }
}

const createVisible = ref(false)
const editVisible = ref(false)
const editInitialData = ref(null)

function onEdit(row) {
  editInitialData.value = { ...row }
  editVisible.value = true
}

async function onDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除该拨测规则吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
    await deleteDialRuleApi(row.id)
    ElMessage.success('已删除')
    fetchList()
  } catch (_) {
    // 用户取消删除确认框时保持当前列表，不需要额外提示。
  }
}

function onExport(row) {
  ElMessage.success(`导出规则：${row.pool}（示例未实现）`)
}

function onCreate() {
  createVisible.value = true
}

async function onCreateSubmit(payload) {
  try {
    await createDialRuleApi(payload)
    ElMessage.success('创建成功')
    page.value = 1
    fetchList()
  } catch (_) {
    // 请求层已统一提示错误，这里避免重复提示。
  }
}

async function onEditSubmit(payload) {
  const id = editInitialData.value?.id
  if (!id) return
  try {
    await updateDialRuleApi(id, payload)
    ElMessage.success('修改成功')
    fetchList()
  } catch (_) {
    // 请求层已统一提示错误，这里避免重复提示。
  }
}

function onBatchExport() {
  ElMessage.info(`批量导出 ${selection.value.length} 条（示例未实现）`)
}

function onBatchImport() {
  ElMessage.info('批量导入（示例未实现）')
}
</script>

<template>
  <div class="page">
    <el-card shadow="never" class="search-card">
      <div class="toolbar">
        <div class="left">
          <el-input
            v-model="keyword"
            placeholder="关键字搜索 (拨测池/目标对象/创建人)"
            clearable
            style="width: 320px"
          />
          <span class="filter-label">拨测方式:</span>
          <el-select v-model="methodFilter" placeholder="全部" style="width: 120px" clearable>
            <el-option
              v-for="opt in methodOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <span class="filter-label">状态:</span>
          <el-select v-model="statusFilter" placeholder="全部" style="width: 120px" clearable>
            <el-option
              v-for="opt in statusFilterOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <el-button type="primary" @click="onSearch">
            <el-icon><Plus /></el-icon>
            查询
          </el-button>
        </div>
        <div class="right">
          <el-button type="primary" @click="onCreate">
            <el-icon><Plus /></el-icon>
            创建
          </el-button>
          <el-button @click="onBatchExport">
            <el-icon><Download /></el-icon>
            批量导出
          </el-button>
          <el-button @click="onBatchImport">
            <el-icon><Upload /></el-icon>
            批量导入
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="table-card" v-loading="loading">
      <el-table :data="pageData" stripe style="width: 100%" @selection-change="onSelectionChange">
        <el-table-column type="selection" width="48" />
        <el-table-column prop="pool" label="拨测池" min-width="120" sortable />
        <el-table-column label="拨测方式" min-width="110">
          <template #default="{ row }">
            <el-tag :type="methodTagType(row.method)" size="small">{{ row.method }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="target"
          label="目标对象"
          min-width="180"
          sortable
          show-overflow-tooltip
        />
        <el-table-column prop="cron" label="拨测频率" min-width="130" sortable />
        <el-table-column prop="timeout" label="超时时间" min-width="100" sortable />
        <el-table-column prop="retry" label="重试次数" min-width="90" sortable />
        <el-table-column prop="creator" label="创建人" min-width="90" />
        <el-table-column prop="updatedAt" label="最后修改时间" min-width="120" sortable />
        <el-table-column label="状态" min-width="90" align="center">
          <template #default="{ row }">
            <span class="status" :class="row.status === '运行中' ? 'running' : 'stopped'">{{
              row.status
            }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="340" fixed="right" align="center">
          <template #default="{ row }">
            <el-space :size="6">
              <el-button
                v-if="row.status === '已停止'"
                size="small"
                type="primary"
                @click="onStart(row)"
              >
                启动
              </el-button>
              <el-button
                v-if="row.status === '运行中'"
                size="small"
                type="danger"
                @click="onStop(row)"
              >
                停止
              </el-button>
              <el-button size="small" @click="onEdit(row)">
                <el-icon><EditPen /></el-icon>
                编辑
              </el-button>
              <el-button size="small" type="danger" plain @click="onDelete(row)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
              <el-button size="small" @click="onExport(row)">
                <el-icon><Download /></el-icon>
                导出
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
          :page-sizes="[5, 10, 20, 50]"
          layout="sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </el-card>

    <CreateRuleDialog
      v-model="createVisible"
      :pool-options="poolOptions"
      @submit="onCreateSubmit"
    />
    <CreateRuleDialog
      v-model="editVisible"
      title="修改拨测规则"
      :pool-options="poolOptions"
      :initial-data="editInitialData"
      @submit="onEditSubmit"
    />
  </div>
</template>

<style scoped>
.page {
  padding: 16px;
}

.search-card {
  margin-bottom: 12px;
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
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-label {
  color: var(--el-text-color-regular);
  font-size: 14px;
  white-space: nowrap;
}

.toolbar .el-icon {
  margin-right: 4px;
}

.table-card {
  padding-bottom: 4px;
}

.status {
  font-weight: 600;
}

.status.running {
  color: var(--el-color-success);
}

.status.stopped {
  color: var(--el-text-color-secondary);
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
