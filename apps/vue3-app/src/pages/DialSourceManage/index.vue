<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Delete } from '@element-plus/icons-vue'
import BatchAddSourceDialog from './BatchAddSourceDialog.vue'
import {
  batchAddDialSourcesApi,
  batchDeleteDialSourceApi,
  deleteDialSourceApi,
  queryDialSourceListApi
} from '@/api/dial'

const route = useRoute()

const poolInfo = computed(() => ({
  id: String(route.query.poolId ?? ''),
  name: String(route.query.poolName ?? ''),
  region: String(route.query.region ?? ''),
  sourceCount: String(route.query.sourceCount ?? '0'),
  creator: String(route.query.creator ?? ''),
  updatedAt: String(route.query.updatedAt ?? ''),
  status: String(route.query.status ?? '')
}))

const keyword = ref('')

const batchAddVisible = ref(false)

const page = ref(1)
const pageSize = ref(5)
const total = ref(0)
const pageData = ref([])
const loading = ref(false)
const reqSeq = ref(0)

async function fetchList() {
  const curSeq = ++reqSeq.value
  loading.value = true
  try {
    const res = await queryDialSourceListApi({
      poolId: poolInfo.value.id,
      keyword: keyword.value,
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

const selection = ref([])
function onSelectionChange(rows) {
  selection.value = rows
}
const selectedCount = computed(() => selection.value.length)

function reloadFromFirstPage() {
  if (page.value !== 1) page.value = 1
  else fetchList()
}

function onSearch() {
  reloadFromFirstPage()
}

function onBatchAdd() {
  batchAddVisible.value = true
}

async function onBatchAddSubmit(selectedOptions) {
  const { added } = await batchAddDialSourcesApi({
    poolId: poolInfo.value.id,
    sources: selectedOptions
  })
  ElMessage.success(added ? `已添加 ${added} 条` : '未新增（已存在）')
  reloadFromFirstPage()
}

async function onBatchDelete() {
  if (!selectedCount.value) return
  try {
    await ElMessageBox.confirm(`确定批量删除 ${selectedCount.value} 条拨测源吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
    await batchDeleteDialSourceApi({
      poolId: poolInfo.value.id,
      sourceIds: selection.value.map((r) => r.id)
    })
    selection.value = []
    ElMessage.success('已删除')
    fetchList()
  } catch (_) {}
}

async function onDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除“${row.name}”吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
    await deleteDialSourceApi({
      poolId: poolInfo.value.id,
      sourceId: row.id
    })
    ElMessage.success('已删除')
    fetchList()
  } catch (_) {}
}

watch([page, pageSize], fetchList, { immediate: true })
watch(
  () => route.query.poolId,
  () => {
    selection.value = []
    reloadFromFirstPage()
  }
)
</script>

<template>
  <div class="page">
    <el-card shadow="never" class="info-card">
      <div class="info-title">拨测池信息</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="k">拨测池ID：</div>
          <div class="v">{{ poolInfo.id || '-' }}</div>
        </div>
        <div class="info-item">
          <div class="k">拨测池名称：</div>
          <div class="v">{{ poolInfo.name || '-' }}</div>
        </div>
        <div class="info-item">
          <div class="k">所属区域：</div>
          <div class="v">{{ poolInfo.region || '-' }}</div>
        </div>
        <div class="info-item">
          <div class="k">拨测源数量：</div>
          <div class="v">{{ poolInfo.sourceCount }}</div>
        </div>
        <div class="info-item">
          <div class="k">创建人：</div>
          <div class="v">{{ poolInfo.creator || '-' }}</div>
        </div>
        <div class="info-item">
          <div class="k">修改时间：</div>
          <div class="v">{{ poolInfo.updatedAt || '-' }}</div>
        </div>
        <div class="info-item">
          <div class="k">状态：</div>
          <div class="v">{{ poolInfo.status || '-' }}</div>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="table-card" v-loading="loading">
      <div class="toolbar">
        <div class="left">
          <el-input v-model="keyword" placeholder="关键字搜索（物理机名称/IP/添加人）" clearable style="width: 340px" />
          <el-button type="primary" @click="onSearch">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
        </div>
        <div class="right">
          <el-button type="primary" @click="onBatchAdd">
            <el-icon><Plus /></el-icon>
            批量添加拨测源
          </el-button>
          <el-button :disabled="!selectedCount" @click="onBatchDelete">
            <el-icon><Delete /></el-icon>
            批量删除拨测源({{ selectedCount }})
          </el-button>
        </div>
      </div>

      <el-table :data="pageData" stripe style="width: 100%" @selection-change="onSelectionChange">
        <el-table-column type="selection" width="48" />
        <el-table-column prop="name" label="物理机名称" min-width="160" sortable />
        <el-table-column prop="ip" label="物理机IP" min-width="160" sortable />
        <el-table-column prop="adder" label="添加人" min-width="120" />
        <el-table-column prop="addedAt" label="添加时间" min-width="130" sortable />
        <el-table-column label="状态" min-width="100" align="center">
          <template #default="{ row }">
            <span class="status" :class="row.status === '在线' ? 'ok' : 'bad'">{{ row.status }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="140" align="center" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="danger" plain @click="onDelete(row)">
              <el-icon><Delete /></el-icon>
              删除
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
          :page-sizes="[5, 10, 20, 50]"
          layout="sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </el-card>

    <BatchAddSourceDialog v-model="batchAddVisible" :pool-id="poolInfo.id" @submit="onBatchAddSubmit" />
  </div>
</template>

<style scoped>
.page {
  padding: 16px;
}
.info-card {
  margin-bottom: 12px;
}

.info-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 10px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
}

.k {
  color: var(--el-text-color-regular);
}

.v {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.table-card {
  padding-bottom: 4px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.left,
.right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar .el-icon {
  margin-right: 4px;
}

.status {
  font-weight: 600;
}

.status.ok {
  color: var(--el-color-success);
}

.status.bad {
  color: var(--el-color-danger);
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

@media (max-width: 1100px) {
  .info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .info-grid {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}
</style>
