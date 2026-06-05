import { ElMessage } from 'element-plus'
import { ref } from 'vue'
import {
  fetchTfRouteRuleListApi,
  addTfRouteRuleApi,
  editTfRouteRuleApi,
  enableTfRouteRuleApi,
  disableTfRouteRuleApi,
  deleteTfRouteRuleApi
} from './collectionStrategyApi.js'

/** 兼容历史详情结构：数组 / { list } / { policies } */
function getSeedFromDetail(detail) {
  if (Array.isArray(detail)) return detail
  if (Array.isArray(detail?.list)) return detail.list
  if (Array.isArray(detail?.policies)) return detail.policies
  return []
}

function isPolicyStarted(policy) {
  if (!policy || typeof policy !== 'object') return false
  return typeof policy.status === 'string' && policy.status.toLowerCase() === 'enable'
}

function setPolicyStarted(policy, started) {
  if (!policy || typeof policy !== 'object') return
  const next = Boolean(started)
  policy.status = next ? 'enable' : 'disable'
}

/** 接口回显：rule 可能是 JSON 字符串，统一转为对象 */
function parseRuleFromApi(rule) {
  if (typeof rule !== 'string') return rule
  try {
    return JSON.parse(rule)
  } catch {
    return rule
  }
}

/** 接口提交：新增/编辑时将 rule 统一转为 JSON 字符串 */
function stringifyRuleForApi(rule) {
  if (typeof rule === 'string') return rule
  if (rule == null) return ''
  try {
    return JSON.stringify(rule)
  } catch {
    return ''
  }
}

/**
 * tfRouteRule 页面级通用逻辑（列表加载、保存、启停、删除）
 */
export function useTfRouteRulePage({
  props,
  type,
  strategyTypeName,
  policies,
  activePolicy,
  hydratePolicies,
  markCurrentPolicySaved,
  replacePolicyId,
  validateForm,
  removeTab,
  normalizePolicyFromTfRule,
  normalizePolicyFromDetail,
  toTfRouteRulePayload,
  afterHydrate
}) {
  /** 工具栏「开启/停用」按钮 loading */
  const startLoading = ref(false)

  /**
   * 首选 tfRouteRule/list 回显；无数据时回退到父级 initialDetail
   * 这样兼容“已接后端规则列表”与“旧详情接口下发”
   */
  async function loadTfRouteRules() {
    if (!props.groupId) return
    try {
      const res = await fetchTfRouteRuleListApi({ groupId: [Number(props.groupId)] })
      const list = Array.isArray(res?.data) ? res.data.filter((x) => Number(x?.type) === type) : []
      if (list.length) {
        hydratePolicies(
          list.map((raw, i) =>
            normalizePolicyFromTfRule(
              {
                ...raw,
                rule: parseRuleFromApi(raw?.rule)
              },
              i
            )
          )
        )
        markCurrentPolicySaved()
        await afterHydrate?.(policies.value)
        return
      }

      const seed = getSeedFromDetail(props.initialDetail)
      if (seed.length) {
        hydratePolicies(
          seed.map((raw, i) =>
            normalizePolicyFromDetail(
              {
                ...raw,
                rule: parseRuleFromApi(raw?.rule)
              },
              i
            )
          )
        )
        markCurrentPolicySaved()
        await afterHydrate?.(policies.value)
      }
    } catch (e) {
      ElMessage.error(e?.message || `加载${strategyTypeName}策略失败`)
    }
  }

  async function onSave() {
    if (!(await validateForm())) {
      ElMessage.warning('请修正当前策略表单后再保存')
      return false
    }
    try {
      const payload = toTfRouteRulePayload(activePolicy.value)
      payload.rule = stringifyRuleForApi(payload.rule)
      // 有 id 视为编辑，无 id 视为新增
      if (Number(payload.id) > 0) {
        await editTfRouteRuleApi(payload)
      } else {
        const prevId = String(activePolicy.value?.id ?? '')
        const res = await addTfRouteRuleApi(payload)
        const realId = Number(res?.data?.id)
        if (Number.isFinite(realId) && realId > 0) {
          replacePolicyId?.(prevId, String(realId))
        }
      }
      markCurrentPolicySaved()
      ElMessage.success(`已保存「${activePolicy.value.name}」${strategyTypeName}采集策略`)
      return true
    } catch (e) {
      ElMessage.error(e?.message || '保存策略失败')
      return false
    }
  }

  async function onToggleCollection(nextStarted) {
    if (!(await validateForm())) return false
    if (!props.groupId) {
      ElMessage.warning('缺少探针分组信息，请从探针分组列表进入')
      return false
    }
    if (!Number(activePolicy.value.id)) {
      const ok = await onSave()
      if (!ok) return false
    }
    if (!Number(activePolicy.value.id)) {
      ElMessage.warning('请先保存策略后再切换采集状态')
      return false
    }
    startLoading.value = true
    try {
      const id = Number(activePolicy.value.id)
      const shouldStart =
        typeof nextStarted === 'boolean' ? nextStarted : !isPolicyStarted(activePolicy.value)
      if (shouldStart) {
        await enableTfRouteRuleApi({ ids: [id] })
        setPolicyStarted(activePolicy.value, true)
        ElMessage.success(`「${activePolicy.value.name}」采集已开启`)
      } else {
        await disableTfRouteRuleApi({ ids: [id] })
        setPolicyStarted(activePolicy.value, false)
        ElMessage.success(`「${activePolicy.value.name}」采集已停用`)
      }
      markCurrentPolicySaved()
      return true
    } catch (e) {
      ElMessage.error(e?.message || '采集状态切换失败，请稍后重试')
      return false
    } finally {
      startLoading.value = false
    }
  }

  async function onRemovePolicyTab(tabName) {
    const p = policies.value.find((x) => x.id === tabName)
    // 仅后端已存在（有数值 id）才调用删除接口；本地未保存 Tab 直接移除
    if (p && Number(p.id) > 0) {
      try {
        await deleteTfRouteRuleApi({ ids: [Number(p.id)] })
      } catch (e) {
        ElMessage.error(e?.message || '删除策略失败')
        return
      }
    }
    removeTab(tabName)
  }

  return { startLoading, loadTfRouteRules, onSave, onToggleCollection, onRemovePolicyTab }
}
