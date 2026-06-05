/**
 * @file collectionStrategyApi — 采集策略接口层
 *
 * 当前为 delay + mock；接后端时替换为真实请求，保持函数签名与返回结构不变。
 */
let mockTfRouteRuleIdSeed = 100000

/**
 * @typedef {object} CollectionStrategyDetail
 * @property {string} probeGroupId
 * @property {'pm'|'vm'|'container'} strategyKind
 * @property {object[]} list 与前端各子页单条策略结构一致
 * @property {object[]} [policies] 兼容字段（与 list 相同）
 */

/** 模拟网络耗时 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 开启当前 Tab 对应的采集策略。
 *
 * @param {object} payload
 * @param {string} payload.probeGroupId 探针分组 ID
 * @param {string} [payload.probeGroupName] 探针分组名称
 * @param {'pm'|'vm'|'container'} payload.strategyKind 策略类型
 * @param {object} payload.policy 当前激活 Tab 的表单数据（纯 JSON 可序列化对象）
 * @returns {Promise<{ ok: boolean }>}
 */
export async function startCollectionStrategyApi(payload) {
  await delay(400)
  // 接后端：POST 开启采集，body 含 strategyKind + policy
  if (!payload?.probeGroupId) {
    throw new Error('缺少探针分组 ID')
  }
  return { ok: true }
}

/**
 * 查询探针分组下的采集策略详情（用于详情页回显）
 *
 * 接后端示例：
 * ```js
 * import request from '@/utils/request'
 * export function fetchCollectionStrategyDetailApi({ probeGroupId }) {
 *   return request.get(`/api/probe-groups/${probeGroupId}/collection-strategy`)
 * }
 * ```
 *
 * @param {object} params
 * @param {string} params.probeGroupId 探针分组 ID
 * @param {'pm'|'vm'|'container'|'unknown'} [params.strategyKind] 来自列表「类型」字段映射后的种类
 * @returns {Promise<CollectionStrategyDetail>}
 */
export async function fetchCollectionStrategyDetailApi({ probeGroupId, strategyKind = 'pm' }) {
  void strategyKind
  await delay(360)
  // 当前页面已统一使用 tfRouteRule/list；此接口保留签名仅做兼容
  if (!probeGroupId) {
    throw new Error('缺少探针分组 ID')
  }
  return []
}

/**
 * ========================= tfRouteRule 接口（来自 Swagger） =========================
 * 路径前缀：/apmServer-sl/tfRouteRule
 *
 * - GET  /list               规则列表（groupId[]）
 * - POST /add                新增规则（tfRouteRule body）
 * - POST /edit               编辑规则（tfRouteRule body）
 * - GET  /enable             启用规则（ids[]）
 * - GET  /disable            停用规则（ids[]）
 * - GET  /delete             删除规则（ids[]）
 * - GET  /cluster/options    集群下拉
 * - GET  /namespace/options  命名空间下拉（masterIp）
 * - GET  /workLoad/options   工作负载下拉（masterIp + namespace）
 *
 * 当前先按 mock 实现，接后端时可替换为 request.get/post。
 */

/**
 * 物理机规则（截图示例）
 * @typedef {object} TfPhysicalRule
 * @property {string} interface_name 例如 "eth0,eth1,vx*"
 */

/**
 * 虚机规则组项（截图示例）
 * @typedef {object} TfVmRuleItem
 * @property {string} field 例如 ip / hostname
 * @property {string} operator 例如 contains / equals
 * @property {string} value 匹配值
 */

/**
 * 虚机规则（截图示例）
 * @typedef {object} TfVmRule
 * @property {TfVmRuleItem[]} ruleGroup
 * @property {'AND'|'OR'} relation
 */

/**
 * 容器规则组项（截图示例）
 * @typedef {object} TfContainerRuleItem
 * @property {string} cluster
 * @property {string} namespace
 * @property {string} [workload]
 */

/**
 * 容器规则（截图示例）
 * @typedef {object} TfContainerRule
 * @property {TfContainerRuleItem[]} ruleGroup
 * @property {'AND'|'OR'} relation
 */

/**
 * @typedef {object} TfRouteRule
 * @property {number} [id]
 * @property {string} [name]
 * @property {string} [dstIp]
 * @property {string} [vni]
 * @property {number} [rateLimit]
 * @property {TfPhysicalRule|TfVmRule|TfContainerRule} [rule] 注意：rule 不是 string，而是结构化 JSON
 * @property {string} [status]
 * @property {number} [type]
 * @property {string} [createTime]
 * @property {string} [updateTime]
 * @property {string} [createUser]
 * @property {string} [updateUser]
 */

/** 统一：将 query 的 ids/groupId 规范为 number[] */
function normalizeIdArray(raw, fieldName) {
  const list = Array.isArray(raw) ? raw : [raw]
  const result = list
    .map((x) => Number(x))
    .filter((n) => !Number.isNaN(n))
  if (!result.length) {
    throw new Error(`${fieldName} 不能为空`)
  }
  return result
}

/** GET /apmServer-sl/tfRouteRule/list?groupId=1&groupId=2 */
export async function fetchTfRouteRuleListApi({ groupId }) {
  normalizeIdArray(groupId, 'groupId')
  await delay(260)
  // 接后端：
  // return request.get('/apmServer-sl/tfRouteRule/list', { params: { groupId } })
  return {
    code: 0,
    data: [],
    msg: 'ok',
    success: true
  }
}

/** POST /apmServer-sl/tfRouteRule/add */
export async function addTfRouteRuleApi(tfRouteRule) {
  await delay(220)
  if (!tfRouteRule || typeof tfRouteRule !== 'object') {
    throw new Error('tfRouteRule 参数不能为空')
  }
  mockTfRouteRuleIdSeed += 1
  // 接后端：
  // return request.post('/apmServer-sl/tfRouteRule/add', tfRouteRule)
  return { code: 0, data: { id: mockTfRouteRuleIdSeed }, msg: 'ok', success: true }
}

/** POST /apmServer-sl/tfRouteRule/edit */
export async function editTfRouteRuleApi(tfRouteRule) {
  await delay(220)
  if (!tfRouteRule || typeof tfRouteRule !== 'object') {
    throw new Error('tfRouteRule 参数不能为空')
  }
  // 接后端：
  // return request.post('/apmServer-sl/tfRouteRule/edit', tfRouteRule)
  return { code: 0, data: true, msg: 'ok', success: true }
}

/** GET /apmServer-sl/tfRouteRule/enable?ids=1&ids=2 */
export async function enableTfRouteRuleApi({ ids }) {
  normalizeIdArray(ids, 'ids')
  await delay(180)
  // 接后端：
  // return request.get('/apmServer-sl/tfRouteRule/enable', { params: { ids } })
  return { code: 0, data: true, msg: 'ok', success: true }
}

/** GET /apmServer-sl/tfRouteRule/disable?ids=1&ids=2 */
export async function disableTfRouteRuleApi({ ids }) {
  normalizeIdArray(ids, 'ids')
  await delay(180)
  // 接后端：
  // return request.get('/apmServer-sl/tfRouteRule/disable', { params: { ids } })
  return { code: 0, data: true, msg: 'ok', success: true }
}

/** GET /apmServer-sl/tfRouteRule/delete?ids=1&ids=2 */
export async function deleteTfRouteRuleApi({ ids }) {
  normalizeIdArray(ids, 'ids')
  await delay(180)
  // 接后端：
  // return request.get('/apmServer-sl/tfRouteRule/delete', { params: { ids } })
  return { code: 0, data: true, msg: 'ok', success: true }
}

/** GET /apmServer-sl/tfRouteRule/cluster/options */
export async function fetchTfRouteClusterOptionsApi() {
  await delay(180)
  // 接后端：
  // return request.get('/apmServer-sl/tfRouteRule/cluster/options')
  return { code: 0, data: [], msg: 'ok', success: true }
}

/** GET /apmServer-sl/tfRouteRule/namespace/options?masterIp=xxx */
export async function fetchTfRouteNamespaceOptionsApi({ masterIp }) {
  await delay(180)
  if (!masterIp) throw new Error('masterIp 不能为空')
  // 接后端：
  // return request.get('/apmServer-sl/tfRouteRule/namespace/options', { params: { masterIp } })
  return { code: 0, data: [], msg: 'ok', success: true }
}

/** GET /apmServer-sl/tfRouteRule/workLoad/options?masterIp=xxx&namespace=yyy */
export async function fetchTfRouteWorkloadOptionsApi({ masterIp, namespace }) {
  await delay(180)
  if (!masterIp) throw new Error('masterIp 不能为空')
  if (!namespace) throw new Error('namespace 不能为空')
  // 接后端：
  // return request.get('/apmServer-sl/tfRouteRule/workLoad/options', { params: { masterIp, namespace } })
  return { code: 0, data: [], msg: 'ok', success: true }
}
