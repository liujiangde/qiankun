<script setup>
/**
 * 采集器详情 - 监控信息
 * 展示 CPU、内存、流量（分发/采集）、丢包 的折线图。
 * 根据父组件/路由传入的 nodeId 调用监控详情接口获取折线数据。
 */
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import echarts from '@/utils/echarts'
import { queryTrafficForwardingMonitoringApi } from '@/api/trafficForwarding'

const props = defineProps({
  /** 采集器节点 id，后续接监控查询接口时可作为入参 */
  nodeId: { type: [String, Number], default: '' }
})

// 与截图一致：约 30 个时间点 13:20 ~ 13:49
function buildTimeAxis() {
  const labels = []
  let h = 13
  let m = 20
  for (let i = 0; i < 30; i++) {
    labels.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 59) {
      m = 0
      h += 1
    }
  }
  return labels
}

const timeAxis = ref(buildTimeAxis())

const cpuData = ref([])
const memoryData = ref([])
const trafficSendData = ref([])
const trafficCollectData = ref([])
const lossData = ref([])

const cpuRef = ref(null)
const memoryRef = ref(null)
const trafficRef = ref(null)
const lossRef = ref(null)

let chartCpu = null
let chartMemory = null
let chartTraffic = null
let chartLoss = null

function baseGrid() {
  return {
    left: 56,
    right: 24,
    top: 48,
    bottom: 72
  }
}

function createLineOption({ title, yAxisName, yMax, yInterval, series }) {
  return {
    title: {
      text: title,
      left: 0,
      top: 0,
      textStyle: { fontSize: 14, fontWeight: 600, color: '#303133' }
    },
    tooltip: { trigger: 'axis' },
    legend: {
      bottom: 8,
      left: 'center',
      icon: 'roundRect'
    },
    grid: baseGrid(),
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: timeAxis.value,
      axisLabel: { color: '#909399', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      name: yAxisName,
      nameTextStyle: { color: '#909399', padding: [0, 0, 0, 8] },
      min: 0,
      max: yMax,
      interval: yInterval,
      axisLabel: { color: '#909399' },
      splitLine: { lineStyle: { type: 'dashed', color: '#ebeef5' } }
    },
    series: series.map((s) => ({
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      showSymbol: false,
      ...s
    }))
  }
}

function renderCharts() {
  if (!cpuRef.value || !memoryRef.value || !trafficRef.value || !lossRef.value) return

  const cpuOpt = createLineOption({
    title: 'CPU使用情况',
    yAxisName: '',
    yMax: 100,
    yInterval: 25,
    series: [
      {
        name: 'CPU使用率',
        data: cpuData.value,
        itemStyle: { color: '#409EFF' },
        lineStyle: { width: 2 },
        areaStyle: { color: 'rgba(64, 158, 255, 0.08)' }
      }
    ]
  })
  cpuOpt.yAxis.axisLabel = { color: '#909399', formatter: '{value}%' }

  const memOpt = createLineOption({
    title: '内存使用情况',
    yAxisName: '',
    yMax: 100,
    yInterval: 25,
    series: [
      {
        name: '内存使用率',
        data: memoryData.value,
        itemStyle: { color: '#9B59B6' },
        lineStyle: { width: 2 },
        areaStyle: { color: 'rgba(155, 89, 182, 0.08)' }
      }
    ]
  })
  memOpt.yAxis.axisLabel = { color: '#909399', formatter: '{value}%' }

  const trafficOpt = createLineOption({
    title: '流量速率',
    yAxisName: '',
    yMax: 180,
    yInterval: 45,
    series: [
      {
        name: '分发流量',
        data: trafficSendData.value,
        itemStyle: { color: '#67C23A' },
        lineStyle: { width: 2 },
        areaStyle: { color: 'rgba(103, 194, 58, 0.06)' }
      },
      {
        name: '采集流量',
        data: trafficCollectData.value,
        itemStyle: { color: '#E6A23C' },
        lineStyle: { width: 2 },
        areaStyle: { color: 'rgba(230, 162, 60, 0.06)' }
      }
    ]
  })
  trafficOpt.yAxis.axisLabel = {
    color: '#909399',
    formatter: '{value} MB/s'
  }

  const lossOpt = createLineOption({
    title: '丢包数量',
    yAxisName: '',
    yMax: 60,
    yInterval: 15,
    series: [
      {
        name: '丢包数量',
        data: lossData.value,
        itemStyle: { color: '#F56C6C' },
        lineStyle: { width: 2 },
        areaStyle: { color: 'rgba(245, 108, 108, 0.08)' }
      }
    ]
  })
  lossOpt.yAxis.axisLabel = {
    color: '#909399',
    formatter: '{value} 个/分钟'
  }

  chartCpu?.setOption(cpuOpt, true)
  chartMemory?.setOption(memOpt, true)
  chartTraffic?.setOption(trafficOpt, true)
  chartLoss?.setOption(lossOpt, true)
}

function initCharts() {
  if (cpuRef.value && !chartCpu) chartCpu = echarts.init(cpuRef.value)
  if (memoryRef.value && !chartMemory) chartMemory = echarts.init(memoryRef.value)
  if (trafficRef.value && !chartTraffic) chartTraffic = echarts.init(trafficRef.value)
  if (lossRef.value && !chartLoss) chartLoss = echarts.init(lossRef.value)
  renderCharts()
}

function disposeCharts() {
  chartCpu?.dispose()
  chartMemory?.dispose()
  chartTraffic?.dispose()
  chartLoss?.dispose()
  chartCpu = null
  chartMemory = null
  chartTraffic = null
  chartLoss = null
}

function onResize() {
  chartCpu?.resize()
  chartMemory?.resize()
  chartTraffic?.resize()
  chartLoss?.resize()
}

async function fetchMonitoringInformation() {
  const nodeId = props.nodeId
  if (nodeId === '' || nodeId === null || nodeId === undefined) return
  const res = await queryTrafficForwardingMonitoringApi({ nodeId })
  timeAxis.value =
    Array.isArray(res?.timeAxis) && res.timeAxis.length ? res.timeAxis : buildTimeAxis()
  cpuData.value = Array.isArray(res?.cpuData) ? res.cpuData : []
  memoryData.value = Array.isArray(res?.memoryData) ? res.memoryData : []
  trafficSendData.value = Array.isArray(res?.trafficSendData) ? res.trafficSendData : []
  trafficCollectData.value = Array.isArray(res?.trafficCollectData) ? res.trafficCollectData : []
  lossData.value = Array.isArray(res?.lossData) ? res.lossData : []

  await nextTick()
  renderCharts()
}

onMounted(() => {
  nextTick(() => {
    initCharts()
    window.addEventListener('resize', onResize)
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  disposeCharts()
})

// nodeId 变化时请求监控接口并刷新图表
watch(() => props.nodeId, fetchMonitoringInformation, { immediate: true })
</script>

<template>
  <div class="monitoring-info">
    <el-card shadow="never" class="chart-card">
      <div ref="cpuRef" class="chart-box" />
    </el-card>
    <el-card shadow="never" class="chart-card">
      <div ref="memoryRef" class="chart-box" />
    </el-card>
    <el-card shadow="never" class="chart-card">
      <div ref="trafficRef" class="chart-box" />
    </el-card>
    <el-card shadow="never" class="chart-card">
      <div ref="lossRef" class="chart-box" />
    </el-card>
  </div>
</template>

<style scoped>
.monitoring-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 4px;
}

.chart-card {
  border-radius: 8px;
}

.chart-card :deep(.el-card__body) {
  padding: 12px 16px 8px;
}

.chart-box {
  width: 100%;
  height: 280px;
}
</style>
