import request from '@/utils/request'
import { dialRuleAlertTagOptions, dialRuleMockRecords } from '@/mocks/dial'

const DETECTION_RESULT_PREFIX = '/cloudmonitor/tbDetectionResult'
const DETECTION_ALERT_PREFIX = '/tbDetectionAlert'

let dialRuleMockStore = dialRuleMockRecords.map((record) => ({ ...record }))

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function pickResponseData(raw) {
  return raw?.data ?? raw
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
  const id = dialRuleMockStore.length ? Math.max(...dialRuleMockStore.map((rule) => rule.id)) + 1 : 1
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
