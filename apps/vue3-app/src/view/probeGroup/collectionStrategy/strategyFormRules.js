/**
 * @file strategyFormRules — 采集策略表单通用校验
 *
 * - validateModelWithRules：按 path 遍历 rules（不依赖 el-form 实例，可供批量 Tab 校验）
 * - policyNameRequiredRule：策略名称 required
 * - buildVxlanFieldRules：物理 / 虚机 VXLAN；仅当 vxlanEnabled 为 true 时校验 vni / 接收端 IPv4 / Port / 限速
 * - appendReceiverIpRules：为 receivers.i.ip 批量补校验（仅 IPv4）
 * - isEmptyString / isValidIpv4 / isValidHostOrIp：validator 内复用
 */
import { toRaw } from 'vue'

/** 策略名称：各类型子页表单项共用 */
export const policyNameRequiredRule = [
  { required: true, message: '请输入策略名称', trigger: 'blur' }
]

/**
 * 按 path（如 rule.0.field）从对象取值
 * @param {object} obj
 * @param {string} path
 */
function getValueByPath(obj, path) {
  const parts = String(path).split('.')
  let cur = obj
  for (const p of parts) {
    if (cur == null) return undefined
    cur = cur[p]
  }
  return cur
}

/**
 * 使用与 el-form 相同的 rules 结构校验整条 model（含嵌套 path），不依赖 async-validator 包
 * @param {object} model
 * @param {Record<string, object[]>} rules
 */
export async function validateModelWithRules(model, rules) {
  const m = toRaw(model)
  // 与 Element 一致：按字段 path 顺序执行 required 与 validator
  for (const [path, ruleArr] of Object.entries(rules)) {
    const value = getValueByPath(m, path)
    const list = Array.isArray(ruleArr) ? ruleArr : [ruleArr]
    for (const rule of list) {
      if (rule.required) {
        const empty =
          value === undefined ||
          value === null ||
          value === '' ||
          (typeof value === 'string' && value.trim() === '') ||
          (Array.isArray(value) && value.length === 0)
        if (empty) {
          const err = new Error(rule.message || '请填写该项')
          throw err
        }
      }
      if (typeof rule.validator === 'function') {
        await new Promise((resolve, reject) => {
          rule.validator(rule, value, (e) => {
            if (e) reject(e)
            else resolve(undefined)
          })
        })
      }
    }
  }
}

/** 判断是否为未填写的字符串（含纯空格） */
export function isEmptyString(val) {
  if (val === undefined || val === null) return true
  if (typeof val === 'string') return val.trim() === ''
  return false
}

/** 合法的 IPv4 地址（每段0–255） */
export function isValidIpv4(val) {
  const s = String(val).trim()
  if (!s) return false
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(s)) return false
  const parts = s.split('.').map(Number)
  return parts.every((n) => n >= 0 && n <= 255)
}

/** IPv4 或常见主机名 */
export function isValidHostOrIp(val) {
  const s = String(val).trim()
  if (!s) return false
  if (isValidIpv4(s)) return true
  return /^[a-zA-Z0-9][-a-zA-Z0-9.]{0,253}$/.test(s)
}

/**
 * 物理机 / 虚拟机共用的 VXLAN 表单项（依赖 policy.vxlanEnabled）
 * @param {() => { vxlanEnabled?: boolean }} getPolicy
 */
export function buildVxlanFieldRules(getPolicy) {
  return {
    vni: [
      {
        validator: (_rule, val, cb) => {
          if (!getPolicy().vxlanEnabled) {
            cb()
            return
          }
          if (isEmptyString(val)) cb(new Error('请输入标识 VNI'))
          else cb()
        },
        trigger: 'blur'
      }
    ],
    receiverHost: [
      {
        validator: (_rule, val, cb) => {
          if (!getPolicy().vxlanEnabled) {
            cb()
            return
          }
          if (isEmptyString(val)) {
            cb(new Error('请输入接收端地址'))
            return
          }
          if (!isValidIpv4(val)) cb(new Error('请输入合法的 IP 地址'))
          else cb()
        },
        trigger: 'blur'
      }
    ],
    receiverPort: [
      {
        validator: (_rule, val, cb) => {
          if (!getPolicy().vxlanEnabled) {
            cb()
            return
          }
          if (val === undefined || val === null || val === '') {
            cb(new Error('请输入接收端 Port'))
            return
          }
          const n = Number(val)
          if (Number.isNaN(n) || n < 1 || n > 65535) cb(new Error('Port 范围为 1–65535'))
          else cb()
        },
        trigger: 'change'
      }
    ],
    rateLimit: [
      {
        validator: (_rule, val, cb) => {
          if (!getPolicy().vxlanEnabled) {
            cb()
            return
          }
          if (val === undefined || val === null || val === '') {
            cb(new Error('请输入限速'))
            return
          }
          const n = Number(val)
          if (Number.isNaN(n) || n < 1) cb(new Error('请输入有效的限速值（≥1）'))
          else cb()
        },
        trigger: 'change'
      }
    ]
  }
}

/**
 * 统一为 receivers.*.ip 追加校验规则
 * @param {Record<string, object[]>} base 已有 rules 对象
 * @param {{ receivers?: Array<any> }} policy 当前策略对象
 * @param {{ requiredMessage?: string, invalidMessage?: string }} [messages]
 */
export function appendReceiverIpRules(base, policy, messages = {}) {
  const requiredMessage = messages.requiredMessage ?? '请输入接收端地址'
  const invalidMessage = messages.invalidMessage ?? '请输入合法的 IP 地址'
  const rows = Array.isArray(policy?.receivers) ? policy.receivers : []
  rows.forEach((_, i) => {
    base[`receivers.${i}.ip`] = [
      {
        validator: (_rule, val, cb) => {
          if (isEmptyString(val)) {
            cb(new Error(requiredMessage))
            return
          }
          if (!isValidIpv4(val)) cb(new Error(invalidMessage))
          else cb()
        },
        trigger: 'blur'
      }
    ]
  })
  return base
}
