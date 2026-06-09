import request from '@/utils/request'
import { mockSwitches } from '@/config/mock'
import {
  tfAlarmRuleAlertContentTagsRaw,
  tfAlarmRuleImportResult,
  tfAlarmRuleMockRecords,
  tfAlarmRulePhysicalMachinesByGroup,
  tfAlarmRuleScopeGroups,
  trafficForwardingAlertMockRecords,
  trafficForwardingNodeMockRecords
} from '@/mocks/trafficForwarding'

const TRAFFIC_FORWARD_ALERT_PREFIX = '/tfTrafficForwardAlert'
const TF_ALARM_RULE_PREFIX = '/apmServer-s1/tf-alarm-rule'

// 流量转发模块包含两类业务：
// 1. 采集器节点管理（启动、停止、卸载、监控）
// 2. 告警历史与告警规则（列表、启停、删除、导入结果）
let trafficForwardingNodeMockStore = trafficForwardingNodeMockRecords.map((record) => ({
  ...record
}))
let tfAlarmRuleMockStore = tfAlarmRuleMockRecords.map((record) => ({ ...record }))

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toTimeMs(value) {
  const time = new Date(String(value).replace(/-/g, '/')).getTime()
  return Number.isNaN(time) ? 0 : time
}

function normalizeTfAlarmRuleStatus(value) {
  if (value === 1 || value === '1' || value === true || value === '启用' || value === 'enabled')
    return 1
  if (
    value === 0 ||
    value === '0' ||
    value === false ||
    value === '停用' ||
    value === '禁用' ||
    value === 'disabled'
  )
    return 0
  const n = Number(value)
  return Number.isNaN(n) ? 0 : n === 1 ? 1 : 0
}

function isEmptyStatus(value) {
  return value === '' || value === null || value === undefined
}

function getNowText() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function buildPagedResponse(list, current, size) {
  const page = Number(current ?? 1)
  const pageSize = Number(size ?? 10)
  const start = (page - 1) * pageSize
  return {
    data: {
      records: list.slice(start, start + pageSize),
      total: list.length
    }
  }
}

function inTimeRange(rowTime, from, to) {
  if (!from && !to) return true
  const time = toTimeMs(rowTime)
  const fromMs = from ? toTimeMs(from) : 0
  const toMs = to ? toTimeMs(to) : Number.MAX_SAFE_INTEGER
  return time >= fromMs && time <= toMs
}

function queryTrafficForwardAlertHistoryByMock(params) {
  // 告警历史 mock 保持和真实接口一致的筛选语义：状态、两个时间范围、关键字、排序。
  const keyword = String(params.keyword ?? '')
    .trim()
    .toLowerCase()
  const abnormalStatus = String(params.abnormalStatus ?? '')
  let list = trafficForwardingAlertMockRecords.filter((row) => {
    if (abnormalStatus && row.abnormalStatus !== abnormalStatus) return false
    if (!inTimeRange(row.abnormalTime, params.abnormalTimeFrom, params.abnormalTimeTo)) return false
    if (!inTimeRange(row.alarmTime, params.alarmTimeFrom, params.alarmTimeTo)) return false
    if (!keyword) return true
    const haystack = [row.alarmContent, row.ruleName, row.hostIp, row.hostName]
      .map((x) => String(x ?? '').toLowerCase())
      .join('\u0000')
    return haystack.includes(keyword)
  })

  const orderByMap = {
    abnormal_time: 'abnormalTime',
    alarm_time: 'alarmTime'
  }
  if (params.orderBy && params.order) {
    const field = orderByMap[params.orderBy]
    if (field) {
      const factor = params.order === 'asc' ? 1 : -1
      list = list.slice().sort((a, b) => (toTimeMs(a[field]) - toTimeMs(b[field])) * factor)
    }
  }
  return buildPagedResponse(list, params.current, params.size)
}

function queryTfAlarmRuleListByMock(payload) {
  // 告警规则列表使用 POST body 查询；mock 也按 body 字段过滤，方便后续切真实接口。
  const keyword = String(payload.keyword ?? '')
    .trim()
    .toLowerCase()
  const status = payload.status
  let list = tfAlarmRuleMockStore.filter((record) => {
    const okKeyword =
      !keyword ||
      [record.ruleName, record.alarmContent, record.updateUser].some((field) =>
        String(field ?? '')
          .toLowerCase()
          .includes(keyword)
      )
    const okStatus = isEmptyStatus(status)
      ? true
      : normalizeTfAlarmRuleStatus(record.status) === normalizeTfAlarmRuleStatus(status)
    return okKeyword && okStatus
  })

  if (payload.sortField && payload.sortMode) {
    const localSortFieldMap = {
      update_time: 'updateTime',
      create_time: 'createTime',
      last_alarm_time: 'lastAlarmTime'
    }
    const field = localSortFieldMap[payload.sortField] || payload.sortField
    const factor = payload.sortMode === 'asc' ? 1 : -1
    list = list.slice().sort((a, b) => (toTimeMs(a[field]) - toTimeMs(b[field])) * factor)
  }

  return buildPagedResponse(list, payload.current, payload.size)
}

export function fetchTrafficForwardAlertHistoryApi(params) {
  if (mockSwitches.trafficForwardingAlert) {
    return Promise.resolve(queryTrafficForwardAlertHistoryByMock(params))
  }
  // 流量转发告警历史列表：统一从 request 走，后续 token、baseURL 等不需要改页面。
  return request.get(`${TRAFFIC_FORWARD_ALERT_PREFIX}/history/list`, {
    params,
    dedupeKey: 'traffic-forwarding:alert-history'
  })
}

export function fetchTfAlarmRuleListApi(payload) {
  if (mockSwitches.tfAlarmRuleList) {
    return Promise.resolve(queryTfAlarmRuleListByMock(payload))
  }
  // 告警规则列表使用 POST 分页查询，页面只负责组装筛选条件。
  return request.post(`${TF_ALARM_RULE_PREFIX}/list`, payload, {
    dedupeKey: 'traffic-forwarding:alarm-rule-list'
  })
}

export function createTfAlarmRuleApi(payload) {
  if (mockSwitches.tfAlarmRuleList) {
    const now = getNowText()
    const id = tfAlarmRuleMockStore.length
      ? Math.max(...tfAlarmRuleMockStore.map((record) => Number(record.id) || 0)) + 1
      : 1
    tfAlarmRuleMockStore.unshift({
      ...payload,
      id,
      status: normalizeTfAlarmRuleStatus(payload.status),
      lastAlarmTime: '-',
      createTime: now,
      createUser: '当前用户',
      updateTime: now,
      updateUser: '当前用户'
    })
    return Promise.resolve({ code: 0, data: { id }, msg: 'ok', success: true })
  }
  return request.post(`${TF_ALARM_RULE_PREFIX}/add`, payload)
}

export function editTfAlarmRuleApi(payload) {
  if (mockSwitches.tfAlarmRuleList) {
    const id = Number(payload?.id)
    const index = tfAlarmRuleMockStore.findIndex((record) => Number(record.id) === id)
    if (index >= 0) {
      tfAlarmRuleMockStore[index] = {
        ...tfAlarmRuleMockStore[index],
        ...payload,
        status: normalizeTfAlarmRuleStatus(payload.status),
        updateTime: getNowText(),
        updateUser: '当前用户'
      }
    }
    return Promise.resolve({ code: 0, data: true, msg: 'ok', success: true })
  }
  return request.post(`${TF_ALARM_RULE_PREFIX}/edit`, payload)
}

export function enableTfAlarmRuleApi(ids) {
  if (mockSwitches.tfAlarmRuleList) {
    const idSet = new Set((Array.isArray(ids) ? ids : [ids]).map(Number))
    tfAlarmRuleMockStore = tfAlarmRuleMockStore.map((record) =>
      idSet.has(Number(record.id)) ? { ...record, status: 1, updateTime: getNowText() } : record
    )
    return Promise.resolve({ code: 0, data: true, msg: 'ok', success: true })
  }
  return request.get(`${TF_ALARM_RULE_PREFIX}/enable`, { params: { ids } })
}

export function disableTfAlarmRuleApi(ids) {
  if (mockSwitches.tfAlarmRuleList) {
    const idSet = new Set((Array.isArray(ids) ? ids : [ids]).map(Number))
    tfAlarmRuleMockStore = tfAlarmRuleMockStore.map((record) =>
      idSet.has(Number(record.id)) ? { ...record, status: 0, updateTime: getNowText() } : record
    )
    return Promise.resolve({ code: 0, data: true, msg: 'ok', success: true })
  }
  return request.get(`${TF_ALARM_RULE_PREFIX}/disable`, { params: { ids } })
}

export function deleteTfAlarmRuleApi(ids) {
  if (mockSwitches.tfAlarmRuleList) {
    const idSet = new Set((Array.isArray(ids) ? ids : [ids]).map(Number))
    tfAlarmRuleMockStore = tfAlarmRuleMockStore.filter((record) => !idSet.has(Number(record.id)))
    return Promise.resolve({ code: 0, data: true, msg: 'ok', success: true })
  }
  return request.get(`${TF_ALARM_RULE_PREFIX}/delete`, { params: { ids } })
}

export function fetchTfAlarmRuleAlertContentTagsApi() {
  if (mockSwitches.alertContentTags) {
    return delay(220).then(() => tfAlarmRuleAlertContentTagsRaw)
  }
  // 告警内容可插入标签列表，RuleDia 负责把返回值归一化成 select/tag 可用结构。
  return request.get(`${TF_ALARM_RULE_PREFIX}/alarm-content-tags`)
}

export function fetchTfAlarmRuleScopeGroupsApi() {
  if (mockSwitches.scopeApis) {
    return delay(160).then(() => tfAlarmRuleScopeGroups.map((option) => ({ ...option })))
  }
  // 告警作用域分组列表；接口字段可能随后端调整，归一化逻辑留在弹窗组件里。
  return request.get(`${TF_ALARM_RULE_PREFIX}/group/options`)
}

export function fetchTfAlarmRulePhysicalMachinesApi(params) {
  if (mockSwitches.scopeApis) {
    return delay(160).then(() => [...(tfAlarmRulePhysicalMachinesByGroup[params?.groupId] || [])])
  }
  // 指定分组下的物理机列表，params 通常包含 groupId。
  return request.get(`${TF_ALARM_RULE_PREFIX}/agent/options`, { params })
}

export function fetchTfAlarmRuleImportResultApi() {
  return Promise.resolve({ ...tfAlarmRuleImportResult })
}

export async function queryTrafficForwardingListApi(params) {
  // 采集器列表目前是本地 mock；字段名按页面筛选模型设计，方便替换为真实 query 参数。
  await delay(250)
  const hostKeyword = String(params.physicalHost ?? '')
    .trim()
    .toLowerCase()
  const ipKeyword = String(params.physicalIP ?? '').trim()
  const groupKeyword = String(params.group ?? '').trim()
  const category = String(params.category ?? '')
  const connectStatus = String(params.connectStatus ?? '')
  const collectStatus = String(params.collectStatus ?? '')
  const opStatus = String(params.opStatus ?? '')
  const page = Number(params.page ?? 1)
  const pageSize = Number(params.pageSize ?? 10)

  const filtered = trafficForwardingNodeMockStore.filter((node) => {
    const okHost = !hostKeyword || node.host.toLowerCase().includes(hostKeyword)
    const okIp = !ipKeyword || node.ip.includes(ipKeyword)
    const okGroup = !groupKeyword || node.group.includes(groupKeyword)
    const okCategory = !category || node.category === category
    const okConnect = !connectStatus || node.connectStatus === connectStatus
    const okCollect = !collectStatus || node.collectStatus === collectStatus
    const okOp = !opStatus || node.opStatus === opStatus
    return okHost && okIp && okGroup && okCategory && okConnect && okCollect && okOp
  })

  const start = (page - 1) * pageSize
  return {
    list: filtered.slice(start, start + pageSize),
    total: filtered.length
  }
}

function findTrafficForwardingNode(id) {
  // 行级操作都先定位节点，再修改 opStatus / collectStatus，模拟后端状态流转。
  const numId = Number(id)
  return Number.isInteger(numId)
    ? trafficForwardingNodeMockStore.find((node) => node.id === numId)
    : null
}

export async function uninstallTrafficForwardingApi(params) {
  await delay(300)
  const node = findTrafficForwardingNode(params?.id)
  if (node) node.opStatus = '无'
  return true
}

export async function startTrafficForwardingCollectApi(params) {
  await delay(300)
  const node = findTrafficForwardingNode(params?.id)
  if (node) {
    node.collectStatus = '正在采集'
    node.opStatus = '无'
  }
  return true
}

export async function stopTrafficForwardingCollectApi(params) {
  await delay(300)
  const node = findTrafficForwardingNode(params?.id)
  if (node) {
    node.collectStatus = '未采集'
    node.opStatus = '无'
  }
  return true
}

export async function queryTrafficForwardingDetailApi(params) {
  await delay(250)
  const node = findTrafficForwardingNode(params?.id)
  return {
    detail: node
      ? {
          ...node,
          memoryLimit: '4GB',
          cpuLimit: '2核'
        }
      : null,
    networkIfaces: [
      `eth0 (${node?.ip ?? '192.168.1.100'})`,
      'eth1 (10.0.0.11)',
      'docker0 (172.17.0.1)',
      'veth0 (172.17.0.2)',
      'veth1 (172.17.0.3)',
      'veth2 (172.17.0.4)',
      'br-1234567890ab (172.18.0.1)',
      'lo (127.0.0.1)'
    ]
  }
}

function buildMonitoringTimeAxis() {
  const labels = []
  let hour = 13
  let minute = 20
  for (let i = 0; i < 30; i++) {
    labels.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
    minute += 1
    if (minute > 59) {
      minute = 0
      hour += 1
    }
  }
  return labels
}

function waveSeries(len, base, amplitude, phase = 0, seed = 0) {
  return Array.from({ length: len }, (_, i) => {
    const p = i + phase + (seed % 7)
    const value = base + amplitude * Math.sin(p / 4) + amplitude * 0.35 * Math.sin(p / 2.2)
    return Math.max(0, Math.round(value * 10) / 10)
  })
}

export async function queryTrafficForwardingMonitoringApi(params) {
  await delay(300)
  const nodeSeed = Number(params?.nodeId ?? 0) || 0
  const timeAxis = buildMonitoringTimeAxis()
  const len = timeAxis.length
  return {
    timeAxis,
    cpuData: waveSeries(len, 32, 12, 1, nodeSeed),
    memoryData: waveSeries(len, 48, 8, 3, nodeSeed),
    trafficSendData: waveSeries(len, 95, 35, 0, nodeSeed),
    trafficCollectData: waveSeries(len, 72, 28, 2, nodeSeed),
    lossData: waveSeries(len, 22, 14, 4, nodeSeed).map((value) => Math.max(0, Math.round(value)))
  }
}
