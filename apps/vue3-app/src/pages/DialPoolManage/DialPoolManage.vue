<script setup>
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, EditPen, Delete, User } from '@element-plus/icons-vue'
import CreateDialPoolDialog from './CreateDialPoolDialog.vue'

const router = useRouter()

const regionOptions = [
  { label: '全部', value: '' },
  { label: '华东', value: '华东' },
  { label: '华北', value: '华北' },
  { label: '华南', value: '华南' },
  { label: '西南', value: '西南' },
  { label: '东北', value: '东北' }
]

const statusOptions = [
  { label: '全部', value: '' },
  { label: '正常', value: '正常' },
  { label: '异常', value: '异常' }
]

const query = reactive({
  region: '',
  name: '',
  status: ''
})

// 模拟“数据库”全量数据；列表查询通过接口返回分页结果
const allPools = ref([
  { id: 1, name: '拨测池A1', region: '华东', sourceCount: 1, creator: '张三', updatedAt: '2026-03-05', status: '异常' },
  { id: 2, name: '拨测池B2', region: '华北', sourceCount: 7, creator: '李四', updatedAt: '2026-03-03', status: '异常' },
  { id: 3, name: '拨测池C3', region: '华南', sourceCount: 1, creator: '王五', updatedAt: '2026-02-14', status: '正常' },
  { id: 4, name: '拨测池D4', region: '西南', sourceCount: 7, creator: '赵六', updatedAt: '2026-03-06', status: '正常' },
  { id: 5, name: '拨测池E5', region: '东北', sourceCount: 10, creator: '钱七', updatedAt: '2026-02-09', status: '正常' },
  { id: 6, name: '拨测池F6', region: '华东', sourceCount: 7, creator: '周八', updatedAt: '2026-02-18', status: '正常' },
  { id: 7, name: '拨测池G7', region: '华北', sourceCount: 2, creator: '吴九', updatedAt: '2026-02-09', status: '异常' },
  { id: 8, name: '拨测池H8', region: '华南', sourceCount: 12, creator: '郑十', updatedAt: '2026-02-28', status: '正常' },
  { id: 9, name: '拨测池I9', region: '西南', sourceCount: 4, creator: '孙十一', updatedAt: '2026-02-10', status: '正常' },
  { id: 10, name: '拨测池J10', region: '东北', sourceCount: 6, creator: '周十二', updatedAt: '2026-03-01', status: '异常' }
])

const page = ref(1)
const pageSize = ref(5)

const loading = ref(false)
const total = ref(0)
const pageData = ref([])
const reqSeq = ref(0)

const sortField = ref('')
const sortOrder = ref('')
const SORTABLE_FIELDS = new Set(['name', 'region', 'sourceCount', 'updatedAt'])
function onSortChange({ prop, order }) {
  // el-table order 值：'ascending' | 'descending' | null
  const nextField = order ? String(prop ?? '') : ''
  const nextOrder = order === 'ascending' ? 'asc' : order === 'descending' ? 'desc' : ''
  if (sortField.value === nextField && sortOrder.value === nextOrder) return
  sortField.value = nextField
  sortOrder.value = nextOrder
  if (page.value !== 1) page.value = 1
  else fetchList()
}

function queryDialPoolListApi(params) {
  // 模拟“后端分页查询拨测池列表”接口：只返回当前页 list + total
  // 接真实接口时：把这里替换成 request/axios，并保留入参/出参结构即可
  return new Promise((resolve) => {
    setTimeout(() => {
      const name = String(params.name ?? '').trim()
      const region = String(params.region ?? '')
      const status = String(params.status ?? '')
      const p = Number(params.page ?? 1)
      const ps = Number(params.pageSize ?? 10)
      const field = String(params.sortField ?? '')
      const order = String(params.sortOrder ?? '')

      const filtered = allPools.value.filter((row) => {
        const okRegion = !region || row.region === region
        const okStatus = !status || row.status === status
        const okName = !name || row.name.includes(name)
        return okRegion && okStatus && okName
      })

      if (field && order && SORTABLE_FIELDS.has(field)) {
        const dir = order === 'desc' ? -1 : 1
        filtered.sort((a, b) => {
          const av = a[field]
          const bv = b[field]
          if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
          return String(av ?? '').localeCompare(String(bv ?? ''), 'zh-Hans-CN') * dir
        })
      }

      const start = (p - 1) * ps
      resolve({ list: filtered.slice(start, start + ps), total: filtered.length })
    }, 300)
  })
}

async function fetchList() {
  const curSeq = ++reqSeq.value
  loading.value = true
  try {
    const res = await queryDialPoolListApi({
      region: query.region,
      name: query.name,
      status: query.status,
      page: page.value,
      pageSize: pageSize.value,
      sortField: sortField.value,
      sortOrder: sortOrder.value
    })
    // 忽略过期请求（避免快速切页/改筛选导致旧响应覆盖新数据）
    if (curSeq !== reqSeq.value) return
    pageData.value = Array.isArray(res?.list) ? res.list : []
    total.value = Number(res?.total ?? 0)

    // 后端分页：如果当前页因删除等操作变成空页，自动退一页再拉一次
    const maxPage = Math.max(1, Math.ceil(total.value / pageSize.value))
    if (page.value > maxPage) {
      page.value = maxPage
      return
    }
  } finally {
    if (curSeq === reqSeq.value) loading.value = false
  }
}

function onSearch() {
  page.value = 1
}

function onReset() {
  query.region = ''
  query.name = ''
  query.status = ''
  page.value = 1
}

const createVisible = ref(false)

const dialogVisible = ref(false)
const dialogMode = ref('create') // create | edit
const form = reactive({
  id: null,
  name: '',
  region: '',
  status: '正常',
  sourceCount: 0,
  creator: ''
})

function openCreate() {
  createVisible.value = true
}

function openEdit(row) {
  dialogMode.value = 'edit'
  form.id = row.id
  form.name = row.name
  form.region = row.region
  form.status = row.status
  form.sourceCount = row.sourceCount
  form.creator = row.creator
  dialogVisible.value = true
}

function submit() {
  const name = form.name.trim()
  if (!name) return ElMessage.warning('请输入拨测池名称')
  if (!form.region) return ElMessage.warning('请选择所属区域')
  if (!form.creator.trim()) return ElMessage.warning('请输入创建人员')

  const today = new Date()
  const yyyy = String(today.getFullYear())
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const updatedAt = `${yyyy}-${mm}-${dd}`

  if (dialogMode.value === 'create') {
    const id = pools.value.length ? Math.max(...pools.value.map((p) => p.id)) + 1 : 1
    pools.value.unshift({
      id,
      name,
      region: form.region,
      sourceCount: Number(form.sourceCount) || 0,
      creator: form.creator.trim(),
      updatedAt,
      status: form.status
    })
    ElMessage.success('创建成功')
  } else {
    const idx = pools.value.findIndex((p) => p.id === form.id)
    if (idx >= 0) {
      pools.value[idx] = {
        ...pools.value[idx],
        name,
        region: form.region,
        status: form.status,
        sourceCount: Number(form.sourceCount) || 0,
        creator: form.creator.trim(),
        updatedAt
      }
      ElMessage.success('保存成功')
    }
  }

  dialogVisible.value = false
  onSearch()
}

function onCreateSubmit(payload) {
  const today = new Date()
  const yyyy = String(today.getFullYear())
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const updatedAt = `${yyyy}-${mm}-${dd}`

  const id = allPools.value.length ? Math.max(...allPools.value.map((p) => p.id)) + 1 : 1
  allPools.value.unshift({
    id,
    name: payload.name,
    region: payload.region,
    sourceCount: 0,
    creator: '当前用户',
    updatedAt,
    status: '正常'
  })
  ElMessage.success('创建成功')
  onSearch()
}

async function onDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除“${row.name}”吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
    allPools.value = allPools.value.filter((p) => p.id !== row.id)
    ElMessage.success('已删除')
    // 删除后让后端分页重新计算（fetchList 内会自动纠正 page 越界）
    fetchList()
  } catch (_) {}
}

function onManageSources(row) {
  router.push({
    name: 'dial-source',
    query: {
      poolId: String(row.id),
      poolName: row.name,
      region: row.region,
      sourceCount: String(row.sourceCount),
      creator: row.creator,
      updatedAt: row.updatedAt,
      status: row.status
    }
  })
}

function statusTagType(status) {
  return status === '正常' ? 'success' : 'danger'
}



watch([page, pageSize], fetchList, { immediate: true })
watch(() => [query.region, query.name, query.status], () => {
  page.value = 1
  fetchList()
})
</script>

<template>
  <div class="page">
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" label-width="78px" class="search-form">
        <el-form-item label="所属区域">
          <el-select v-model="query.region" placeholder="全部" style="width: 160px" clearable>
            <el-option v-for="opt in regionOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="拨测池名称">
          <el-input v-model="query.name" placeholder="拨测池名称" style="width: 220px" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" style="width: 160px" clearable>
            <el-option v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item class="search-actions">
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button type="primary" @click="openCreate">
            <el-icon><Plus /></el-icon>
            创建
          </el-button>
        </el-form-item>
      </el-form>
      <el-table
        :data="pageData"
        v-loading="loading"
        stripe
        style="width: 100%"
        @sort-change="onSortChange"
      >
        <el-table-column prop="name" label="拨测池名称" min-width="160" sortable="custom" />
        <el-table-column prop="region" label="所属区域" min-width="100" sortable="custom" />
        <el-table-column prop="sourceCount" label="拨测源数量" min-width="110" sortable="custom" />
        <el-table-column prop="creator" label="创建人员" min-width="100" />
        <el-table-column prop="updatedAt" label="修改日期" min-width="120" sortable="custom" />
        <el-table-column label="状态" min-width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" effect="dark" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="260" fixed="right" align="center">
          <template #default="{ row }">
            <el-space :size="8">
              <el-button size="small" type="primary" @click="openEdit(row)">
                <el-icon><EditPen /></el-icon>
                编辑
              </el-button>
              <el-button size="small" type="danger" @click="onDelete(row)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
              <el-button size="small" @click="onManageSources(row)">
                <el-icon><User /></el-icon>
                拨测源管理
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

    <CreateDialPoolDialog
      v-model="createVisible"
      :region-options="regionOptions.filter((o) => o.value)"
      @submit="onCreateSubmit"
    />

    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '创建拨测池' : '编辑拨测池'" width="560px">
      <el-form label-width="90px">
        <el-form-item label="拨测池名称">
          <el-input v-model="form.name" placeholder="请输入" />
        </el-form-item>
        <el-form-item label="所属区域">
          <el-select v-model="form.region" placeholder="请选择" style="width: 220px">
            <el-option v-for="opt in regionOptions.filter((o) => o.value)" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio-button label="正常" />
            <el-radio-button label="异常" />
          </el-radio-group>
        </el-form-item>
        <el-form-item label="拨测源数量">
          <el-input-number v-model="form.sourceCount" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="创建人员">
          <el-input v-model="form.creator" placeholder="请输入" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-space>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submit">确定</el-button>
        </el-space>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page {
  padding: 16px;
}
.search-card {
  margin-bottom: 12px;
}

.search-form :deep(.el-form-item) {
  margin-bottom: 0;
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

.search-actions .el-button .el-icon {
  margin-right: 4px;
}
</style>
