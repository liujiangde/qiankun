<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { Plus, FullScreen } from '@element-plus/icons-vue'
import {
  queryDetectionResultLineApi,
  queryDetectionTimeSpentLineApi,
  queryDialVisualPoolOptionsApi,
  queryDialVisualRuleOptionsApi,
  queryDialVisualSourceOptionsApi
} from '@/api/dial'
import echarts from '@/utils/echarts'

const ruleOptions = ref([])
const poolOptions = ref([])
const sourceOptions = ref([])

const ruleFilter = ref('')
const poolFilter = ref('')
const sourceFilter = ref('')
const dateRange = ref([])

const chartSuccessData = ref({})
const chartResponseData = ref({})
const chartLoading = ref(false)
const chartReqSeq = ref(0)
const seriesColors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272']

const successChartRef = ref(null)
const responseChartRef = ref(null)
let successChart = null
let responseChart = null

// 把后端 "YYYY-MM-DD HH:mm:ss" 转为时间戳，避开 Safari 等浏览器对带空格格式 new Date() 的兼容问题
function parseTime(t) {
  if (t == null) return null
  if (typeof t === 'number') return Number.isFinite(t) ? t : null
  const ts = new Date(String(t).replace(' ', 'T')).getTime()
  return Number.isFinite(ts) ? ts : null
}

function formatTime(ts) {
  if (!Number.isFinite(ts)) return '-'
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  )
}

// 多条折线横坐标不统一时，按真实时间各自绘制；空数据的 IP 不进 series / legend
function buildChartOption(title, dataMap, valueLabel) {
  const ips = Object.keys(dataMap || {}).filter(
    (ip) => Array.isArray(dataMap[ip]) && dataMap[ip].length > 0
  )

  const series = ips.map((name, idx) => {
    const points = (dataMap[name] || [])
      .map((p) => ({ ts: parseTime(p?.time), value: p?.value }))
      .filter((p) => p.ts != null)
      .sort((a, b) => a.ts - b.ts)
    return {
      name,
      type: 'line',
      smooth: false,
      symbol: 'circle',
      symbolSize: 6,
      showSymbol: true,
      connectNulls: false,
      data: points.map((p) => [p.ts, p.value]),
      itemStyle: { color: seriesColors[idx % seriesColors.length] },
      lineStyle: { width: 2 },
      emphasis: { focus: 'series' }
    }
  })

  return {
    title: { text: title, left: 'center', top: 8, textStyle: { fontSize: 14 } },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', snap: true },
      // 不同 series 时间点不一致时，axis trigger 默认会列出所有 series（无值的显示 -）
      // 这里只保留当前 x 上确实有值的 series
      formatter: (params) => {
        const list = (Array.isArray(params) ? params : [params]).filter(
          (p) => Array.isArray(p?.value) && p.value[1] != null
        )
        if (!list.length) return ''
        const header = formatTime(list[0].value[0])
        const rows = list.map(
          (p) =>
            `${p.marker}${p.seriesName}: <b>${p.value[1]}</b>${valueLabel ? ' ' + valueLabel : ''}`
        )
        return [header, ...rows].join('<br/>')
      }
    },
    legend: { bottom: 8 },
    grid: { left: 56, right: 24, top: 40, bottom: 44 },
    xAxis: {
      type: 'time',
      axisLabel: {
        hideOverlap: true,
        formatter: {
          year: '{yyyy}',
          month: '{MM}-{dd}',
          day: '{MM}-{dd}',
          hour: '{HH}:{mm}',
          minute: '{HH}:{mm}',
          second: '{HH}:{mm}:{ss}'
        }
      }
    },
    yAxis: {
      type: 'value',
      min: 0,
      scale: true,
      axisLabel: valueLabel ? { formatter: `{value} ${valueLabel}` } : {}
    },
    series
  }
}

function updateSuccessChart() {
  if (!successChart) return
  successChart.setOption(buildChartOption('拨测成功情况折线图', chartSuccessData.value, ''), {
    notMerge: true
  })
}

function updateResponseChart() {
  if (!responseChart) return
  responseChart.setOption(buildChartOption('拨测耗时折线图', chartResponseData.value, 'ms'), {
    notMerge: true
  })
}

function applyChartData(resultMap, timeSpentMap) {
  chartSuccessData.value = resultMap || {}
  chartResponseData.value = timeSpentMap || {}
  updateSuccessChart()
  updateResponseChart()
}

async function fetchChartData() {
  const ruleId = Number(ruleFilter.value)
  const from = Array.isArray(dateRange.value) ? dateRange.value[0] : ''
  const to = Array.isArray(dateRange.value) ? dateRange.value[1] : ''

  // ruleId、from、to 是后端的必填参数，缺少时直接清空图表
  if (!ruleId || !from || !to) {
    applyChartData({}, {})
    return
  }

  const params = { from, to, ruleId }
  if (sourceFilter.value) params.managementIp = sourceFilter.value

  const curSeq = ++chartReqSeq.value
  chartLoading.value = true
  try {
    const [resultData, timeSpentData] = await Promise.all([
      // 两张图的接口参数一致，放在同一个 Promise.all 里并行请求。
      queryDetectionResultLineApi(params),
      queryDetectionTimeSpentLineApi(params)
    ])
    if (curSeq !== chartReqSeq.value) return
    applyChartData(resultData, timeSpentData)
  } catch (err) {
    if (curSeq !== chartReqSeq.value) return
    console.error('[DialVisualize] 查询折线图数据失败:', err)
    applyChartData({}, {})
  } finally {
    if (curSeq === chartReqSeq.value) chartLoading.value = false
  }
}

let refetchTimer = null
function scheduleRefetch() {
  if (refetchTimer) clearTimeout(refetchTimer)
  refetchTimer = setTimeout(() => {
    refetchTimer = null
    fetchChartData()
  }, 200)
}

function onSearch() {
  if (refetchTimer) {
    clearTimeout(refetchTimer)
    refetchTimer = null
  }
  fetchChartData()
}

function zoomChart(which) {
  if (which === 'success') successChart?.resize()
  else if (which === 'response') responseChart?.resize()
}

const resizeHandler = () => {
  successChart?.resize()
  responseChart?.resize()
}

async function loadFilterOptions() {
  const [ruleList, poolList, sourceList] = await Promise.all([
    queryDialVisualRuleOptionsApi(),
    queryDialVisualPoolOptionsApi(),
    queryDialVisualSourceOptionsApi()
  ])
  ruleOptions.value = Array.isArray(ruleList) ? ruleList : []
  poolOptions.value = Array.isArray(poolList) ? poolList : []
  sourceOptions.value = Array.isArray(sourceList) ? sourceList : []
  if (!ruleFilter.value && ruleOptions.value.length) {
    ruleFilter.value = String(ruleOptions.value[0].value ?? '')
  }
}

watch(
  [ruleFilter, poolFilter, sourceFilter, dateRange],
  () => {
    scheduleRefetch()
  },
  { deep: true }
)

onMounted(async () => {
  await loadFilterOptions()
  if (successChartRef.value) {
    successChart = echarts.init(successChartRef.value)
  }
  if (responseChartRef.value) {
    responseChart = echarts.init(responseChartRef.value)
  }
  await fetchChartData()
  window.addEventListener('resize', resizeHandler)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeHandler)
  if (refetchTimer) {
    clearTimeout(refetchTimer)
    refetchTimer = null
  }
  successChart?.dispose()
  responseChart?.dispose()
  successChart = null
  responseChart = null
})
</script>

<template>
  <div class="page">
    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <span class="filter-label">拨测规则</span>
        <el-select v-model="ruleFilter" placeholder="拨测规则" style="width: 160px">
          <el-option
            v-for="opt in ruleOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <span class="filter-label">拨测池</span>
        <el-select v-model="poolFilter" placeholder="选择拨测池" style="width: 160px" clearable>
          <el-option
            v-for="opt in poolOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <span class="filter-label">拨测源</span>
        <el-select v-model="sourceFilter" placeholder="选择拨测源" style="width: 160px" clearable>
          <el-option
            v-for="opt in sourceOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <span class="filter-label">时间筛选</span>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 260px"
        />
      </div>
      <div class="filter-row">
        <el-button type="primary" @click="onSearch">
          <el-icon><Plus /></el-icon>
          查询
        </el-button>
      </div>
    </el-card>

    <div class="charts">
      <el-card shadow="never" class="chart-card" v-loading="chartLoading">
        <div class="chart-header">
          <span class="chart-title">拨测成功情况折线图</span>
          <el-button type="primary" size="small" @click="zoomChart('success')">
            <el-icon><FullScreen /></el-icon>
            放大
          </el-button>
        </div>
        <div ref="successChartRef" class="chart-inner"></div>
      </el-card>
      <el-card shadow="never" class="chart-card" v-loading="chartLoading">
        <div class="chart-header">
          <span class="chart-title">拨测响应情况折线图</span>
          <el-button type="primary" size="small" @click="zoomChart('response')">
            <el-icon><FullScreen /></el-icon>
            放大
          </el-button>
        </div>
        <div ref="responseChartRef" class="chart-inner"></div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 16px;
}

.filter-card {
  margin-bottom: 12px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.filter-row:last-child {
  margin-bottom: 0;
}

.filter-label {
  color: var(--el-text-color-regular);
  font-size: 14px;
  white-space: nowrap;
}

.filter-row .el-icon,
.chart-header .el-icon {
  margin-right: 4px;
}

.charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.chart-card {
  min-height: 360px;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.chart-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.chart-inner {
  width: 100%;
  height: 320px;
}

@media (max-width: 900px) {
  .charts {
    grid-template-columns: 1fr;
  }
}
</style>
