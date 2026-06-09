import request from '@/utils/request'
import { mockSwitches } from '@/config/mock'
import { probeCollectorMockRecords, probeGroupMockRecords } from '@/mocks/probeGroup'

const TF_ROUTE_RULE_PREFIX = '/apmServer-sl/tfRouteRule'
const USE_MOCK_TF_ROUTE_RULE = mockSwitches.tfRouteRule

let mockTfRouteRuleIdSeed = 100000
let probeGroupMockStore = probeGroupMockRecords.map((record) => ({ ...record }))

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeIdArray(raw, fieldName) {
  const list = Array.isArray(raw) ? raw : [raw]
  const result = list.map((x) => Number(x)).filter((n) => !Number.isNaN(n))
  if (!result.length) {
    throw new Error(`${fieldName} 不能为空`)
  }
  return result
}

function buildRepeatedParams(key, values) {
  const params = new URLSearchParams()
  for (const value of values) {
    params.append(key, String(value))
  }
  return params
}

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

function normalizeCollectorForList(collector) {
  return {
    id: collector.id,
    name: collector.name ?? '',
    ip: collector.ip ?? '',
    status: collector.status ?? '—',
    type: collector.type,
    region: collector.region
  }
}

function hitCollectorRule(collector, rule) {
  const text = String(rule.field === 'ip' ? collector.ip : collector.name).toLowerCase()
  const value = String(rule.value ?? '').trim().toLowerCase()
  if (!value) return true
  if (rule.operator === 'equals') return text === value
  if (rule.operator === 'notEquals') return text !== value
  if (rule.operator === 'notContains') return !text.includes(value)
  return text.includes(value)
}

function filterCollectorsLocal(collectors, ruleGroup, type, region, relation) {
  const targetType = String(type ?? '')
  const targetRegion = String(region ?? '')
  const rel = relation === 'and' ? 'and' : 'or'
  return collectors.filter((collector) => {
    const okType = !targetType || collector.type === targetType
    const okRegion = !targetRegion || collector.region === targetRegion
    if (!okType || !okRegion) return false
    if (!ruleGroup.length) return true
    const hits = ruleGroup.map((rule) => hitCollectorRule(collector, rule))
    return rel === 'and' ? hits.every(Boolean) : hits.some(Boolean)
  })
}

export async function queryProbeGroupListApi(params) {
  await delay(250)
  const nameKeyword = String(params.name ?? '').trim().toLowerCase()
  const type = String(params.type ?? '')
  const region = String(params.region ?? '')
  const status = String(params.status ?? '')
  const page = Number(params.page ?? 1)
  const pageSize = Number(params.pageSize ?? 10)

  const filtered = probeGroupMockStore.filter((group) => {
    const okName = !nameKeyword || group.name.toLowerCase().includes(nameKeyword)
    const okType = !type || group.type === type
    const okRegion = !region || group.region === region
    const okStatus = !status || group.status === status
    return okName && okType && okRegion && okStatus
  })

  const start = (page - 1) * pageSize
  return { list: filtered.slice(start, start + pageSize), total: filtered.length }
}

export async function createProbeGroupApi(payload) {
  await delay(400)
  const id = probeGroupMockStore.length
    ? Math.max(...probeGroupMockStore.map((group) => Number(group.id) || 0)) + 1
    : 1
  const record = {
    id,
    name: payload.name,
    type: payload.type,
    region: payload.region,
    status: payload.status,
    collectorCount: Number(payload.collectorCount ?? 0),
    createdAt: getTodayString(),
    rule: payload.rule
  }
  probeGroupMockStore.unshift(record)
  return record
}

export async function updateProbeGroupApi(id, body) {
  await delay(400)
  const index = probeGroupMockStore.findIndex((group) => group.id === id)
  if (index < 0) {
    throw new Error('分组不存在或已删除')
  }
  probeGroupMockStore[index] = {
    ...probeGroupMockStore[index],
    name: body.name,
    type: body.type,
    region: body.region,
    status: body.status,
    collectorCount: Number(body.collectorCount ?? 0),
    rule: body.rule
  }
  return probeGroupMockStore[index]
}

export async function deleteProbeGroupApi(id) {
  await delay(300)
  probeGroupMockStore = probeGroupMockStore.filter((group) => group.id !== id)
  return true
}

export async function enableProbeGroupApi(id) {
  await delay(300)
  const group = probeGroupMockStore.find((item) => item.id === id)
  if (group) group.status = '已启用'
  return true
}

export async function stopProbeGroupApi(id) {
  await delay(300)
  const group = probeGroupMockStore.find((item) => item.id === id)
  if (group) group.status = '未启用'
  return true
}

export async function queryMatchedCollectorsApi(payload) {
  await delay(280)
  const ruleGroup = payload.rule?.ruleGroup ?? []
  const relation = payload.rule?.relation ?? 'or'
  return filterCollectorsLocal(
    probeCollectorMockRecords,
    ruleGroup,
    payload.type,
    payload.region,
    relation
  ).map(normalizeCollectorForList)
}

export function importProbeGroupUploadApi(formData) {
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
          for (const group of probeGroupMockStore) {
            const numericId = Number(group.id)
            if (!Number.isNaN(numericId) && numericId > maxId) maxId = numericId
          }

          const now = getTodayString()
          let added = 0
          for (const raw of list) {
            const name = String(raw?.name ?? '').trim()
            if (!name) continue
            maxId += 1
            probeGroupMockStore.push({
              id: maxId,
              name,
              type: String(raw?.type ?? '物理'),
              region: String(raw?.region ?? ''),
              collectorCount: Math.max(0, Number(raw?.collectorCount) || 0),
              status: raw?.status === '未启用' ? '未启用' : '已启用',
              createdAt: String(raw?.createdAt ?? now),
              rule: raw?.rule
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

export async function exportProbeGroupApi(rows) {
  await delay(400)
  const payload = rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    region: row.region,
    collectorCount: row.collectorCount,
    status: row.status,
    createdAt: row.createdAt,
    rule: row.rule
  }))
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const filename = `probe-groups-${new Date().toISOString().slice(0, 10)}.json`
  return { blob, filename }
}

/**
 * 采集策略接口层。
 *
 * 页面只依赖本文件导出的函数签名；默认走 mock，联调时把
 * VITE_USE_MOCK_TF_ROUTE_RULE=false 即可切到真实后端。
 */
export async function startCollectionStrategyApi(payload) {
  await delay(400)
  // 当前没有明确的后端路径，先保留历史 mock 签名，后续联调只需要替换这里。
  if (!payload?.probeGroupId) {
    throw new Error('缺少探针分组 ID')
  }
  return { ok: true }
}

export async function fetchCollectionStrategyDetailApi({
  probeGroupId,
  strategyKind = 'pm'
}) {
  void strategyKind
  await delay(360)
  // 采集策略详情页当前统一通过 tfRouteRule/list 回显，此函数保留给旧调用兼容。
  if (!probeGroupId) {
    throw new Error('缺少探针分组 ID')
  }
  return []
}

export async function fetchTfRouteRuleListApi({ groupId }) {
  const groupIds = normalizeIdArray(groupId, 'groupId')
  if (!USE_MOCK_TF_ROUTE_RULE) {
    return request.get(`${TF_ROUTE_RULE_PREFIX}/list`, {
      params: buildRepeatedParams('groupId', groupIds),
      dedupeKey: 'probe-group:tf-route-rule-list'
    })
  }
  await delay(260)
  return {
    code: 0,
    data: [],
    msg: 'ok',
    success: true
  }
}

export async function addTfRouteRuleApi(tfRouteRule) {
  if (!tfRouteRule || typeof tfRouteRule !== 'object') {
    throw new Error('tfRouteRule 参数不能为空')
  }
  if (!USE_MOCK_TF_ROUTE_RULE) {
    return request.post(`${TF_ROUTE_RULE_PREFIX}/add`, tfRouteRule)
  }
  await delay(220)
  mockTfRouteRuleIdSeed += 1
  return { code: 0, data: { id: mockTfRouteRuleIdSeed }, msg: 'ok', success: true }
}

export async function editTfRouteRuleApi(tfRouteRule) {
  if (!tfRouteRule || typeof tfRouteRule !== 'object') {
    throw new Error('tfRouteRule 参数不能为空')
  }
  if (!USE_MOCK_TF_ROUTE_RULE) {
    return request.post(`${TF_ROUTE_RULE_PREFIX}/edit`, tfRouteRule)
  }
  await delay(220)
  return { code: 0, data: true, msg: 'ok', success: true }
}

export async function enableTfRouteRuleApi({ ids }) {
  const idList = normalizeIdArray(ids, 'ids')
  if (!USE_MOCK_TF_ROUTE_RULE) {
    return request.get(`${TF_ROUTE_RULE_PREFIX}/enable`, {
      params: buildRepeatedParams('ids', idList)
    })
  }
  await delay(180)
  return { code: 0, data: true, msg: 'ok', success: true }
}

export async function disableTfRouteRuleApi({ ids }) {
  const idList = normalizeIdArray(ids, 'ids')
  if (!USE_MOCK_TF_ROUTE_RULE) {
    return request.get(`${TF_ROUTE_RULE_PREFIX}/disable`, {
      params: buildRepeatedParams('ids', idList)
    })
  }
  await delay(180)
  return { code: 0, data: true, msg: 'ok', success: true }
}

export async function deleteTfRouteRuleApi({ ids }) {
  const idList = normalizeIdArray(ids, 'ids')
  if (!USE_MOCK_TF_ROUTE_RULE) {
    return request.get(`${TF_ROUTE_RULE_PREFIX}/delete`, {
      params: buildRepeatedParams('ids', idList)
    })
  }
  await delay(180)
  return { code: 0, data: true, msg: 'ok', success: true }
}

export async function fetchTfRouteClusterOptionsApi() {
  if (!USE_MOCK_TF_ROUTE_RULE) {
    return request.get(`${TF_ROUTE_RULE_PREFIX}/cluster/options`)
  }
  await delay(180)
  return { code: 0, data: [], msg: 'ok', success: true }
}

export async function fetchTfRouteNamespaceOptionsApi({ masterIp }) {
  if (!masterIp) throw new Error('masterIp 不能为空')
  if (!USE_MOCK_TF_ROUTE_RULE) {
    return request.get(`${TF_ROUTE_RULE_PREFIX}/namespace/options`, {
      params: { masterIp }
    })
  }
  await delay(180)
  return { code: 0, data: [], msg: 'ok', success: true }
}

export async function fetchTfRouteWorkloadOptionsApi({ masterIp, namespace }) {
  if (!masterIp) throw new Error('masterIp 不能为空')
  if (!namespace) throw new Error('namespace 不能为空')
  if (!USE_MOCK_TF_ROUTE_RULE) {
    return request.get(`${TF_ROUTE_RULE_PREFIX}/workLoad/options`, {
      params: { masterIp, namespace }
    })
  }
  await delay(180)
  return { code: 0, data: [], msg: 'ok', success: true }
}
