/**
 * @file 多 Tab 采集策略（usePolicyTabs）
 *
 * 职责：
 * - 维护 policies / activeId，表单与当前 activePolicy 双向绑定
 * - 「已保存基线」savedBaselineById：与快照对比得到 isActivePolicyDirty，用于新增 Tab 前拦截
 * - hydratePolicies：详情接口回显时整表替换并重置基线；markCurrentPolicySaved：保存/开启采集成功后更新当前 Tab 基线
 *
 * 注意：addPolicy 内建脏检测；若需 el-form 规则校验，由页面用 wrapAddPolicyWithValidate 包裹后再绑定 Tab 栏
 */
import { computed, ref, toRaw } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

/** 生成策略或子项的稳定 id（优先 UUID） */
export function genPolicyId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/** 调用开启采集等接口时去掉前端展示用字段 */
export function clonePolicyForApi(policy) {
  const o = deepClone(toRaw(policy))
  return o
}

/** 深拷贝（优先 structuredClone） */
function deepClone(value) {
  // 保留 JSON 回退，兼容不支持 structuredClone 的运行环境
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}

/** 深拷贝后序列化，用于脏检测与基线对比 */
function policySnapshotString(policy) {
  return JSON.stringify(toRaw(policy))
}

/**
 * 同一探针分组下多条采集策略：Tab 切换、增删（至少保留一条）
 * @param {(index: number, options?: { blankForm?: boolean }) => object} createPolicy
 *   新建策略初始数据；index 为展示序号（从 1 起）；blankForm 为 true 时表示用户点击「新增策略」，表单除名称外置空
 */
export function usePolicyTabs(createPolicy) {
  // 空详情场景下，首条策略默认展示空白表单（名称仍按 createPolicy 规则初始化）
  const first = createPolicy(1, { blankForm: true })
  const policies = ref([first])
  const activeId = ref(first.id)
  /** 各策略 id → 上次保存或回显时的内容快照，用于判断是否有未保存修改 */
  const savedBaselineById = ref({ [first.id]: policySnapshotString(first) })

  /** 统一写入某个策略的已保存基线，避免重复展开对象 */
  function setPolicyBaseline(id, policy) {
    if (!id) return
    savedBaselineById.value[id] = policySnapshotString(policy)
  }

  /** 统一删除某个策略基线 */
  function removePolicyBaseline(id) {
    if (!id) return
    delete savedBaselineById.value[id]
  }

  /** 当前激活 Tab 对应的策略对象（表单双向绑定此对象） */
  const activePolicy = computed(() => {
    const p = policies.value.find((x) => x.id === activeId.value)
    return p ?? policies.value[0]
  })

  /** 当前 Tab 是否存在相对基线的未保存修改 */
  const isActivePolicyDirty = computed(() => {
    const p = activePolicy.value
    if (!p?.id) return false
    const baseline = savedBaselineById.value[p.id]
    if (baseline === undefined) return true
    return policySnapshotString(p) !== baseline
  })

  /** 将当前激活策略标为已保存（与当前表单内容对齐） */
  function markCurrentPolicySaved() {
    const p = activePolicy.value
    if (!p?.id) return
    setPolicyBaseline(p.id, p)
  }

  /**
   * 新增保存成功后，用后端真实 id 替换本地临时 id，并同步 activeId 与已保存基线键
   * @param {string} fromId 本地临时 id
   * @param {string} toId 后端返回的真实 id
   */
  function replacePolicyId(fromId, toId) {
    const prev = String(fromId ?? '')
    const next = String(toId ?? '')
    if (!prev || !next || prev === next) return
    const p = policies.value.find((x) => x.id === prev)
    if (!p) return
    p.id = next
    if (activeId.value === prev) {
      activeId.value = next
    }
    const baselines = { ...savedBaselineById.value }
    if (Object.prototype.hasOwnProperty.call(baselines, prev)) {
      baselines[next] = baselines[prev]
      delete baselines[prev]
      savedBaselineById.value = baselines
    }
  }

  /** 追加新 Tab 并切换过去；blankForm 由 createPolicy 将除名称外的表单置空 */
  function pushNewPolicyTab() {
    const n = policies.value.length + 1
    const p = createPolicy(n, { blankForm: true })
    policies.value.push(p)
    activeId.value = p.id
    setPolicyBaseline(p.id, p)
  }

  /**
   * 新增策略 Tab（供 Tab 栏调用，通常经 wrapAddPolicyWithValidate 先走 validate）
   * 若当前 Tab 相对基线有未保存修改则弹框阻止
   */
  function addPolicy() {
    if (isActivePolicyDirty.value) {
      ElMessageBox.alert(
        '当前策略有未保存的修改，请先点击「保存策略」保存当前标签页后，再新增策略。',
        '无法新增策略',
        { type: 'warning', confirmButtonText: '知道了' }
      )
      return
    }
    pushNewPolicyTab()
  }

  /** 关闭 Tab；至少保留一条策略 */
  function removeTab(tabName) {
    if (policies.value.length <= 1) {
      ElMessage.warning('至少保留一条采集策略')
      return
    }
    const idx = policies.value.findIndex((p) => p.id === tabName)
    // 防御式判断：外部传入了不存在的 tabName 时不做任何修改
    if (idx < 0) return
    policies.value.splice(idx, 1)
    if (activeId.value === tabName) {
      activeId.value = policies.value[Math.max(0, idx - 1)].id
    }
    removePolicyBaseline(tabName)
  }

  /**
   * 用接口返回的策略列表替换当前 Tab 数据（深拷贝）
   * @param {object[]} normalizedPolicies 已与前端字段对齐的策略对象数组
   */
  function hydratePolicies(normalizedPolicies) {
    if (!Array.isArray(normalizedPolicies) || normalizedPolicies.length === 0) return
    const list = normalizedPolicies.map((p) => deepClone(p))
    policies.value = list
    activeId.value = list[0].id
    const baselines = {}
    for (const p of list) {
      baselines[p.id] = policySnapshotString(p)
    }
    savedBaselineById.value = baselines
  }

  return {
    /** 当前分组下全部策略行数据 */
    policies,
    /** 当前激活 Tab 的 id，与 el-tabs 同步 */
    activeId,
    /** 当前激活行对应的策略对象（表单 model） */
    activePolicy,
    /** 当前 Tab 是否与上次保存/回显基线不一致（脏） */
    isActivePolicyDirty,
    addPolicy,
    removeTab,
    replacePolicyId,
    hydratePolicies,
    /** 将当前 Tab 内容同步为「已保存」基线 */
    markCurrentPolicySaved
  }
}
