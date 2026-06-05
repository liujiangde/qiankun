/**
 * @file strategyFormShared — 三种策略子页与 index.vue 约定的 props（避免重复 defineProps）
 */
export const strategyFormProps = {
  /** 探针分组 ID，来自路由 query */
  groupId: { type: String, default: '' },
  /** 探针分组名称展示，来自路由 query */
  groupName: { type: String, default: '' },
  /** fetchCollectionStrategyDetailApi 返回值；支持 { list } / { policies } / 数组；null 时子页用本地默认一条策略 */
  initialDetail: { type: Object, default: null }
}

/**
 * dstIp（逗号分隔字符串）转 receivers 数组
 * @param {string} dstIp
 * @param {() => string} createId
 * @returns {{ id: string, ip: string }[]}
 */
export function parseDstIpToReceivers(dstIp, createId) {
  const parts = String(dstIp ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

  if (!parts.length) return []
  return parts.map((ip) => ({ id: createId(), ip }))
}

/**
 * receivers 数组转 dstIp（逗号分隔字符串）
 * @param {{ ip?: string }[]} receivers
 * @returns {string}
 */
export function stringifyReceiversToDstIp(receivers) {
  if (!Array.isArray(receivers)) return ''
  return receivers
    .map((r) => String(r?.ip ?? '').trim())
    .filter(Boolean)
    .join(',')
}

/**
 * 统一归一化策略对象中的 receivers 字段（兼容 receivers / receiverHost / dstIp）
 * @param {object} raw
 * @param {() => string} createId
 * @param {{ id: string, ip: string }[]} fallbackReceivers
 * @param {{ allowReceiverHost?: boolean }} [options]
 * @returns {{ id: string, ip: string }[]}
 */
export function normalizeReceiversFromRaw(raw, createId, fallbackReceivers, options = {}) {
  const allowReceiverHost = options.allowReceiverHost !== false

  if (Array.isArray(raw?.receivers)) {
    const fromReceivers = raw.receivers.map((r) => ({
      id: r?.id ?? createId(),
      ip: r?.ip ?? ''
    }))
    if (fromReceivers.length) return fromReceivers
  }

  if (allowReceiverHost && raw?.receiverHost) {
    return [{ id: createId(), ip: String(raw.receiverHost) }]
  }

  const fromDstIp = parseDstIpToReceivers(raw?.dstIp, createId)
  if (fromDstIp.length) return fromDstIp

  return fallbackReceivers
}

/**
 * 统一归一化状态字段：兼容 raw.status
 * @param {object} raw
 * @returns {'enable'|'disable'}
 */
export function normalizeStatusFromRaw(raw) {
  if (String(raw?.status ?? '').toLowerCase() === 'enable') return 'enable'
  return 'disable'
}

/**
 * 统一标准化状态值，避免各处重复三元表达式
 * @param {string} status
 * @returns {'enable'|'disable'}
 */
export function toEnabledStatus(status) {
  return String(status ?? '').toLowerCase() === 'enable' ? 'enable' : 'disable'
}
