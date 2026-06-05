<script setup>
import { ref, reactive, toRef, toRefs, computed, watch, inject } from 'vue'
import { ThemeKey } from '../injectionKeys.js'

const tableData = ref([
  { id: 1, date: '2016-05-01', name: 'Tom', address: 'No. 1518, Jinshajiang Road, Putuo District, Shanghai' },
  { id: 2, date: '2016-05-02', name: 'Jerry', address: 'No. 189, Grove St, Los Angeles' },
  { id: 3, date: '2016-05-03', name: 'Lucy', address: 'No. 123, Oxford Road, London' },
  { id: 4, date: '2016-05-04', name: 'Mark', address: 'No. 456, Fifth Ave, New York' },
  { id: 5, date: '2016-05-05', name: 'Alice', address: 'No. 88, Queen St, Toronto' },
  { id: 6, date: '2016-05-06', name: 'Bob', address: 'No. 777, Market St, San Francisco' },
  { id: 7, date: '2016-05-07', name: 'Carol', address: 'No. 22, Alexanderplatz, Berlin' },
  { id: 8, date: '2016-05-08', name: 'Dave', address: 'No. 66, Champs-Élysées, Paris' },
  { id: 9, date: '2016-05-09', name: 'Eve', address: 'No. 101, Central, Hong Kong' },
  { id: 10, date: '2016-05-10', name: 'Frank', address: 'No. 9, Shinjuku, Tokyo' },
  { id: 11, date: '2016-05-11', name: 'Grace', address: 'No. 5, Marina Bay, Singapore' },
  { id: 12, date: '2016-05-12', name: 'Heidi', address: 'No. 12, Circular Quay, Sydney' },
  { id: 13, date: '2016-05-13', name: 'Ivan', address: 'No. 3, Red Square, Moscow' },
  { id: 14, date: '2016-05-14', name: 'Judy', address: 'No. 15, Colosseum, Rome' },
  { id: 15, date: '2016-05-15', name: 'Kevin', address: 'No. 42, Silicon Ave, Shenzhen' },
  { id: 16, date: '2016-05-16', name: 'Laura', address: 'No. 25, Sheikh Zayed Rd, Dubai' },
  { id: 17, date: '2016-05-17', name: 'Mallory', address: 'No. 7, Wall St, New York' },
  { id: 18, date: '2016-05-18', name: 'Niaj', address: 'No. 2, Bund, Shanghai' },
  { id: 19, date: '2016-05-19', name: 'Olivia', address: 'No. 33, River Thames, London' },
  { id: 20, date: '2016-05-20', name: 'Peggy', address: 'No. 18, Mission St, San Francisco' },
  { id: 21, date: '2016-05-21', name: 'Quentin', address: 'No. 6, Union Sq, San Francisco' },
  { id: 22, date: '2016-05-22', name: 'Ruth', address: 'No. 77, Opera House, Sydney' },
  { id: 23, date: '2016-05-23', name: 'Sam', address: 'No. 14, Yonge St, Toronto' },
  { id: 24, date: '2016-05-24', name: 'Trudy', address: 'No. 9, Orchard Rd, Singapore' },
  { id: 25, date: '2016-05-25', name: 'Victor', address: 'No. 1, Sheikh Zayed Ave, Dubai' }
])

const filters = reactive({ name: '', dateRange: [] })
const nameRef = toRef(filters, 'name')
const dateRangeRef = toRef(filters, 'dateRange')

const pagination = reactive({ page: 1, pageSize: 10 })
const { page, pageSize } = toRefs(pagination)

const filteredData = computed(() => {
  const name = nameRef.value?.trim().toLowerCase()
  const range = dateRangeRef.value || []
  const hasName = !!name
  const hasRange = Array.isArray(range) && range.length === 2
  return tableData.value.filter((row) => {
    const okName = hasName ? String(row.name).toLowerCase().includes(name) : true
    const okRange = hasRange
      ? (new Date(row.date) >= new Date(range[0]) && new Date(row.date) <= new Date(range[1]))
      : true
    return okName && okRange
  })
})

const pagedData = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredData.value.length / pageSize.value)))
const selectedCount = computed(() => multipleSelection.value.length)
const nameModel = computed({
  get: () => filters.name,
  set: (val) => { filters.name = val }
})

const multipleSelection = ref([])
const handleSelectionChange = (val) => {
  multipleSelection.value = val
}

const nameHint = ref('')
const filtersChanges = ref(0)
const renderedRows = ref(0)
const theme = inject(ThemeKey, ref('light'))

watch(nameRef, (val) => {
  nameHint.value = val ? `按姓名：${val}` : '未设置姓名过滤'
}, { immediate: true })
// - immediate : 初始化时立即执行一次回调，用于首屏或默认值同步
// - deep : 深度监听对象内部变化，适合嵌套结构；注意开销较大
// - flush: 'post' : 将回调安排在组件更新完成后执行，适合依赖最新 DOM 或 UI 的逻辑
watch(filters, () => {
  filtersChanges.value += 1
}, { deep: true })

watch(pagedData, (rows) => {
  renderedRows.value = rows.length
}, { flush: 'post', immediate: true })
</script>

<template>
  <el-card style="margin-bottom: 12px;">
    <el-form inline>
      <el-form-item label="主题">
        <el-tag>{{ theme }}</el-tag>
      </el-form-item>
      <el-form-item label="姓名">
        <el-input v-model="nameRef" placeholder="输入姓名" clearable style="width: 200px" />
      </el-form-item>
      <el-form-item label="姓名(计算属性)">
        <el-input v-model="nameModel" placeholder="通过 computed 代理" clearable style="width: 220px" />
      </el-form-item>
      <el-form-item label="日期">
        <el-date-picker
          v-model="dateRangeRef"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
        />
      </el-form-item>
    </el-form>
  </el-card>

  <el-table :data="pagedData" @selection-change="handleSelectionChange" style="width: 100%">
    <el-table-column type="expand">
      <template #default="{ row }">
        <el-descriptions :column="1" size="small" border>
          <el-descriptions-item label="姓名">{{ row.name }}</el-descriptions-item>
          <el-descriptions-item label="日期">{{ row.date }}</el-descriptions-item>
          <el-descriptions-item label="地址">{{ row.address }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-table-column>
    <el-table-column type="selection" width="55" />
    <el-table-column prop="date" label="日期" width="180" />
    <el-table-column prop="name" label="姓名" width="180" />
    <el-table-column prop="address" label="地址" />
  </el-table>

  <div style="padding: 12px 0;">
    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :page-sizes="[5, 10, 20]"
      :total="filteredData.length"
      layout="sizes, prev, pager, next, total"
    />
    <el-space style="margin-top: 8px;">
      <el-tag type="info">已选 {{ selectedCount }} 行</el-tag>
      <el-tag type="success">共 {{ totalPages }} 页</el-tag>
      <el-tag type="warning">{{ nameHint }}</el-tag>
      <el-tag type="danger">过滤更改次数 {{ filtersChanges }}</el-tag>
      <el-tag type="primary">当前渲染行数 {{ renderedRows }}</el-tag>
    </el-space>
  </div>
</template>

<style scoped>
</style>
