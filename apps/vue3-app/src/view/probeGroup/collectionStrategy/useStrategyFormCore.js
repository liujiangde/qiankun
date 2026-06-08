/**
 * @file useStrategyFormCore — 物理 / 虚机 / 容器策略页共用逻辑
 *
 * - useFormValidate：封装 el-form.validate，供保存、开启采集、新增 Tab 前复用
 * - useInitialDetailHydrate：监听 props.initialDetail，兼容 list / policies / 纯数组并回显
 * - useStrategySaveAndStart：工具栏「保存策略」「开启采集」
 * - wrapAddPolicyWithValidate：Tab「+ 新增策略」先校验表单再调用 usePolicyTabs.addPolicy
 */
import { ElMessage } from 'element-plus'
import { ref, watch } from 'vue'
import { startCollectionStrategyApi } from '@/api/probeGroup'
import { clonePolicyForApi } from './usePolicyTabs.js'

/** 保存时校验未通过 */
export const MSG_FIX_FORM_BEFORE_SAVE = '请修正当前策略表单后再保存'
/** 新增 Tab 前校验未通过（与「未保存脏检测」不同，此处走 el-form rules） */
export const MSG_FIX_FORM_BEFORE_ADD = '请修正当前策略表单后再新增策略'
export const MSG_MISSING_GROUP = '缺少探针分组信息，请从探针分组列表进入'
export const MSG_START_COLLECTION_FAIL = '开启采集失败，请稍后重试'

/** 统一处理表单校验失败提示，避免各入口重复写 warning 分支 */
async function validateOrWarn(validateForm, message) {
  const passed = await validateForm()
  if (!passed && message) {
    ElMessage.warning(message)
  }
  return passed
}

/** 统一解析 initialDetail 内的策略数组，兼容 list / policies / 纯数组 */
function extractPolicyList(detail) {
  if (Array.isArray(detail)) return detail
  if (Array.isArray(detail?.list)) return detail.list
  if (Array.isArray(detail?.policies)) return detail.policies
  return []
}

/**
 * 先校验当前 Tab 的 el-form，通过后再执行 usePolicyTabs 的 addPolicy（内含未保存脏检测）
 * @param {() => Promise<boolean>} validateForm
 * @param {function} addPolicy
 */
export function wrapAddPolicyWithValidate(validateForm, addPolicy) {
  return async function onAddPolicyTab() {
    if (!(await validateOrWarn(validateForm, MSG_FIX_FORM_BEFORE_ADD))) return
    addPolicy()
  }
}

/**
 * 返回校验当前 Tab 表单的函数（依赖 formRef 指向带 rules 的 el-form）
 * @param {import('vue').Ref} formRef
 * @returns {() => Promise<boolean>} 通过为 true，校验失败为 false（字段错误由 Element 展示）
 */
export function useFormValidate(formRef) {
  return async function validateForm() {
    const form = formRef.value
    if (!form) return false
    try {
      await form.validate()
      return true
    } catch {
      return false
    }
  }
}

/**
 * initialDetail 回显（兼容以下结构）：
 * - { list: [...] }（后端常见）
 * - { policies: [...] }（历史结构）
 * - [...]（直接数组）
 * @param {object} props 含 initialDetail
 * @param {function} hydratePolicies usePolicyTabs 返回
 * @param {(raw: object, index: number) => object} normalizePolicy
 */
export function useInitialDetailHydrate(props, hydratePolicies, normalizePolicy) {
  watch(
    () => props.initialDetail,
    (d) => {
      const list = extractPolicyList(d)
      if (!list.length) return
      hydratePolicies(list.map((raw, i) => normalizePolicy(raw, i)))
    },
    { immediate: true }
  )
}

/**
 * 生成 onSave / onStartCollection 及 startLoading；开启采集成功后写回 status 并 markCurrentPolicySaved
 * @param {object} opt
 * @param {{ groupId: string, groupName: string }} opt.props
 * @param {import('vue').ComputedRef} opt.activePolicy
 * @param {function} opt.markCurrentPolicySaved
 * @param {function} opt.validateForm
 * @param {'pm'|'vm'|'container'} opt.strategyKind 与 src/api/probeGroup.js 一致
 * @param {string} opt.strategyTypeName 成功提示用，如「物理机」「虚拟机」「容器」
 * @returns {{ startLoading: import('vue').Ref<boolean>, onSave: Function, onStartCollection: Function }}
 */
export function useStrategySaveAndStart({
  props,
  activePolicy,
  markCurrentPolicySaved,
  validateForm,
  strategyKind,
  strategyTypeName
}) {
  const startLoading = ref(false)

  async function onSave() {
    if (!(await validateOrWarn(validateForm, MSG_FIX_FORM_BEFORE_SAVE))) return
    markCurrentPolicySaved()
    const policyName = activePolicy.value?.name || '当前策略'
    ElMessage.success(`已保存「${policyName}」${strategyTypeName}采集策略`)
  }

  async function onStartCollection() {
    if (!props.groupId) {
      ElMessage.warning(MSG_MISSING_GROUP)
      return
    }
    if (!(await validateForm())) return
    const policy = clonePolicyForApi(activePolicy.value)
    startLoading.value = true
    try {
      await startCollectionStrategyApi({
        probeGroupId: props.groupId,
        probeGroupName: props.groupName,
        strategyKind,
        policy
      })
      if (activePolicy.value) {
        activePolicy.value.status = 'enable'
      }
      markCurrentPolicySaved()
      const policyName = activePolicy.value?.name || '当前策略'
      ElMessage.success(`「${policyName}」采集已开启`)
    } catch (e) {
      ElMessage.error(e?.message || MSG_START_COLLECTION_FAIL)
    } finally {
      startLoading.value = false
    }
  }

  return { startLoading, onSave, onStartCollection }
}
