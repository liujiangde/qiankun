import request from '@/utils/request'
import { mockSwitches } from '@/config/mock'
import {
  dialPoolMockRecords,
  dialRuleAlertTagOptions,
  dialRuleMockRecords,
  tbDetectionAlertMockRecords
} from '@/mocks/dial'

const DETECTION_RESULT_PREFIX = '/cloudmonitor/tbDetectionResult'
const DETECTION_ALERT_PREFIX = '/tbDetectionAlert'

// 拨测模块当前同时支持真实接口和本地 mock。
// 页面统一调用本文件导出的函数，不需要关心数据来自后端还是 mockStore。
let dialRuleMockStore = dialRuleMockRecords.map((record) => ({ ...record }))
let dialPoolMockStore = dialPoolMockRecords.map((record) => ({ ...record }))
const dialSourceMockStores = new Map()

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function pickResponseData(raw) {
  return raw?.data ?? raw
}

function toTimeMs(value) {
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function buildPagedResponse(list, current, size) {
  // mock 数据也包装成后端分页响应形状，页面归一化逻辑就能和真实接口保持一致。
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

function queryTbDetectionAlertListByMock(params) {
  // 拨测告警历史：按时间范围、关键字和排序模拟后端分页查询。
  const keyword = String(params.query ?? '')
    .trim()
    .toLowerCase()
  const fromMs = params.from ? toTimeMs(`${params.from}T00:00:00`) : 0
  const toMs = params.to ? toTimeMs(`${params.to}T23:59:59`) : Number.MAX_SAFE_INTEGER

  let list = tbDetectionAlertMockRecords.filter((record) => {
    const time = toTimeMs(record.createTime)
    const inRange = time >= fromMs && time <= toMs
    if (!inRange) return false
    if (!keyword) return true
    return [record.content, record.ruleName, record.target].some((field) =>
      String(field ?? '')
        .toLowerCase()
        .includes(keyword)
    )
  })

  if (params.orderBy === 'createTime' && params.order) {
    const factor = params.order === 'asc' ? 1 : -1
    list = list.slice().sort((a, b) => (toTimeMs(a.createTime) - toTimeMs(b.createTime)) * factor)
  }

  return buildPagedResponse(list, params.current, params.size)
}

function normalizeLineData(raw) {
  const data = pickResponseData(raw)
  return data && typeof data === 'object' ? data : {}
}

function queryDetectionLineApi(type, params) {
  // 页面只传业务参数；路径、请求方式、响应兜底统一放在 API 模块里。
  return request
    .get(`${DETECTION_RESULT_PREFIX}/${type}`, {
      params,
      dedupeKey: `dial:detection-line:${type}`
    })
    .then(normalizeLineData)
}

export function queryDetectionResultLineApi(params) {
  return queryDetectionLineApi('resultLine', params)
}

export function queryDetectionTimeSpentLineApi(params) {
  return queryDetectionLineApi('timeSpentLine', params)
}

export function fetchTbDetectionAlertListApi(params) {
  if (mockSwitches.tbDetectionAlert) {
    return Promise.resolve(queryTbDetectionAlertListByMock(params))
  }
  // 拨测告警列表仍保留原后端分页参数，由页面负责把筛选态转换成 params。
  return request.get(`${DETECTION_ALERT_PREFIX}/list`, {
    params,
    dedupeKey: 'dial:alert-list'
  })
}

function getTodayString() {
  const today = new Date()
  const yyyy = String(today.getFullYear())
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatTimeout(timeoutMs) {
  return timeoutMs >= 1000 ? `${Math.round(timeoutMs / 1000)}秒` : `${timeoutMs}ms`
}

function buildDialRuleRecord(payload, extra = {}) {
  return {
    pool: payload.pool,
    method: payload.method,
    target: payload.target,
    cron: payload.cron,
    timeout: formatTimeout(payload.timeoutMs),
    retry: payload.retry,
    isOpen: payload.isOpen,
    alertCondition: payload.alertCondition,
    alertContent: payload.alertContent,
    compressTime: payload.compressTime,
    updatedAt: getTodayString(),
    ...extra
  }
}

function getDialSourceStore(poolId) {
  // 每个拨测池维护一份拨测源 mockStore，模拟“池和源是一对多”的业务关系。
  const key = String(poolId || 'default')
  if (!dialSourceMockStores.has(key)) {
    const base = Number(poolId || 0) || 1
    const records = Array.from({ length: 12 }, (_, index) => {
      const no = index + 1
      return {
        id: base * 1000 + no,
        name: `物理机${String(no).padStart(3, '0')}`,
        ip: `192.168.${base}.${no}`,
        adder: ['张三', '李四', '王五', '赵六', '钱七'][index % 5],
        addedAt: `2026-02-${String(((index + base) % 28) + 1).padStart(2, '0')}`,
        status: index % 3 === 0 ? '离线' : '在线'
      }
    })
    dialSourceMockStores.set(key, records)
  }
  return dialSourceMockStores.get(key)
}

const DIAL_POOL_SORTABLE_FIELDS = new Set(['name', 'region', 'sourceCount', 'updatedAt'])

function sortRows(rows, field, order, sortableFields) {
  if (!field || !order || !sortableFields.has(field)) return rows
  const dir = order === 'desc' ? -1 : 1
  return rows.sort((a, b) => {
    const av = a[field]
    const bv = b[field]
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av ?? '').localeCompare(String(bv ?? ''), 'zh-Hans-CN') * dir
  })
}

export async function queryDialRuleListApi(params) {
  // 当前为本地 mock 分页；接真实后端时只需要替换这里，页面调用方式保持不变。
  await delay(300)
  const keyword = String(params.keyword ?? '').trim()
  const method = String(params.method ?? '')
  const status = String(params.status ?? '')
  const page = Number(params.page ?? 1)
  const pageSize = Number(params.pageSize ?? 10)

  const filtered = dialRuleMockStore.filter((rule) => {
    const okMethod = !method || rule.method === method
    const okStatus = !status || rule.status === status
    const okKeyword =
      !keyword ||
      rule.pool?.includes(keyword) ||
      rule.target?.includes(keyword) ||
      rule.creator?.includes(keyword)
    return okMethod && okStatus && okKeyword
  })

  const start = (page - 1) * pageSize
  return { list: filtered.slice(start, start + pageSize), total: filtered.length }
}

export async function startDialRuleApi(id) {
  await delay(300)
  const rule = dialRuleMockStore.find((item) => item.id === id)
  if (rule) rule.status = '运行中'
  return true
}

export async function stopDialRuleApi(id) {
  await delay(300)
  const rule = dialRuleMockStore.find((item) => item.id === id)
  if (rule) rule.status = '已停止'
  return true
}

export async function deleteDialRuleApi(id) {
  await delay(300)
  dialRuleMockStore = dialRuleMockStore.filter((rule) => rule.id !== id)
  return true
}

export async function createDialRuleApi(payload) {
  await delay(300)
  const id = dialRuleMockStore.length
    ? Math.max(...dialRuleMockStore.map((rule) => rule.id)) + 1
    : 1
  const record = buildDialRuleRecord(payload, {
    id,
    creator: '当前用户',
    status: '已停止'
  })
  dialRuleMockStore.unshift(record)
  return { id, record }
}

export async function updateDialRuleApi(id, payload) {
  await delay(300)
  const index = dialRuleMockStore.findIndex((rule) => rule.id === id)
  if (index < 0) return false

  dialRuleMockStore[index] = {
    ...dialRuleMockStore[index],
    ...buildDialRuleRecord(payload)
  }
  return true
}

export async function queryDialRuleAlertTagsApi() {
  await delay(200)
  return [...dialRuleAlertTagOptions]
}

export async function testDialRuleConnectivityApi(params) {
  await delay(600)
  return {
    success: true,
    message: `目标 ${params.target} 连通性测试通过`
  }
}

export async function queryDialPoolListApi(params) {
  // 拨测池列表负责承载“区域 / 状态 / 名称 / 排序 / 分页”的主查询。
  await delay(300)
  const name = String(params.name ?? '').trim()
  const region = String(params.region ?? '')
  const status = String(params.status ?? '')
  const page = Number(params.page ?? 1)
  const pageSize = Number(params.pageSize ?? 10)
  const sortField = String(params.sortField ?? '')
  const sortOrder = String(params.sortOrder ?? '')

  const filtered = dialPoolMockStore.filter((row) => {
    const okRegion = !region || row.region === region
    const okStatus = !status || row.status === status
    const okName = !name || row.name.includes(name)
    return okRegion && okStatus && okName
  })

  sortRows(filtered, sortField, sortOrder, DIAL_POOL_SORTABLE_FIELDS)
  const start = (page - 1) * pageSize
  return { list: filtered.slice(start, start + pageSize), total: filtered.length }
}

export async function createDialPoolApi(payload) {
  await delay(300)
  const id = dialPoolMockStore.length
    ? Math.max(...dialPoolMockStore.map((pool) => pool.id)) + 1
    : 1
  const record = {
    id,
    name: payload.name,
    region: payload.region,
    sourceCount: Number(payload.sourceCount ?? 0),
    creator: payload.creator?.trim?.() || '当前用户',
    updatedAt: getTodayString(),
    status: payload.status || '正常'
  }
  dialPoolMockStore.unshift(record)
  return record
}

export async function updateDialPoolApi(id, payload) {
  await delay(300)
  const index = dialPoolMockStore.findIndex((pool) => pool.id === id)
  if (index < 0) return false
  dialPoolMockStore[index] = {
    ...dialPoolMockStore[index],
    name: payload.name,
    region: payload.region,
    sourceCount: Number(payload.sourceCount ?? 0),
    creator: payload.creator?.trim?.() || dialPoolMockStore[index].creator,
    updatedAt: getTodayString(),
    status: payload.status || dialPoolMockStore[index].status
  }
  return true
}

export async function deleteDialPoolApi(id) {
  await delay(300)
  dialPoolMockStore = dialPoolMockStore.filter((pool) => pool.id !== id)
  return true
}

export async function queryDialSourceListApi(params) {
  await delay(300)
  const poolId = String(params.poolId ?? '')
  const keyword = String(params.keyword ?? '').trim()
  const page = Number(params.page ?? 1)
  const pageSize = Number(params.pageSize ?? 10)
  const allSources = getDialSourceStore(poolId)
  const filtered = allSources.filter((source) => {
    if (!keyword) return true
    return (
      source.name.includes(keyword) || source.ip.includes(keyword) || source.adder.includes(keyword)
    )
  })
  const start = (page - 1) * pageSize
  return {
    list: filtered.slice(start, start + pageSize),
    total: filtered.length,
    allOptions: allSources.map((source) => ({ ip: source.ip, name: source.name }))
  }
}

export async function deleteDialSourceApi(params) {
  await delay(300)
  const key = String(params.poolId || 'default')
  const currentSources = getDialSourceStore(key)
  dialSourceMockStores.set(
    key,
    currentSources.filter((source) => source.id !== params.sourceId)
  )
  return true
}

export async function batchDeleteDialSourceApi(params) {
  await delay(300)
  const key = String(params.poolId || 'default')
  const ids = new Set(params.sourceIds ?? [])
  const currentSources = getDialSourceStore(key)
  dialSourceMockStores.set(
    key,
    currentSources.filter((source) => !ids.has(source.id))
  )
  return true
}

export async function queryDialSourceOptionsApi(params) {
  await delay(300)
  const base = Number(params.poolId || 0) || 1
  return Array.from({ length: 500 }, (_, index) => {
    const no = index + 1
    return {
      ip: `10.10.${base}.${no}`,
      name: `候选物理机${String(no).padStart(3, '0')}`
    }
  })
}

export async function batchAddDialSourcesApi(params) {
  await delay(300)
  const key = String(params.poolId || 'default')
  const currentSources = getDialSourceStore(key)
  const existed = new Set(currentSources.map((source) => source.ip))
  const addedAt = getTodayString()
  let added = 0

  for (const option of params.sources ?? []) {
    const ip = option?.ip
    if (!ip || existed.has(ip)) continue
    const name = option.name ?? `物理机${String(currentSources.length + 1).padStart(3, '0')}`
    const id = currentSources.length
      ? Math.max(...currentSources.map((source) => source.id)) + 1
      : 1
    currentSources.unshift({
      id,
      name,
      ip,
      adder: '当前用户',
      addedAt,
      status: '在线'
    })
    existed.add(ip)
    added += 1
  }

  return { added }
}

export async function queryDialVisualRuleOptionsApi() {
  await delay(300)
  return dialRuleMockStore.map((rule) => ({
    label: `规则${rule.id}`,
    value: rule.id
  }))
}

export async function queryDialVisualPoolOptionsApi() {
  await delay(300)
  return [
    { label: '选择拨测池', value: '' },
    ...dialPoolMockStore.map((pool) => ({ label: pool.name, value: pool.name }))
  ]
}

export async function queryDialVisualSourceOptionsApi() {
  await delay(300)
  const sources = Array.from(dialSourceMockStores.values()).flat()
  const fallback = [
    { label: '145.9.3.136', value: '145.9.3.136' },
    { label: '145.0.20.131', value: '145.0.20.131' },
    { label: '145.9.3.138', value: '145.9.3.138' }
  ]
  const options = sources.length
    ? sources.slice(0, 20).map((source) => ({ label: source.ip, value: source.ip }))
    : fallback
  return [{ label: '选择拨测源', value: '' }, ...options]
}
