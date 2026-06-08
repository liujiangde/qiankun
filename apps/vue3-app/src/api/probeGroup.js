import request from '@/utils/request'
import { mockSwitches } from '@/config/mock'

const TF_ROUTE_RULE_PREFIX = '/apmServer-sl/tfRouteRule'
const USE_MOCK_TF_ROUTE_RULE = mockSwitches.tfRouteRule

let mockTfRouteRuleIdSeed = 100000

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
