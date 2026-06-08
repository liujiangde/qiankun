<script setup>
/**
 * 容器（K8s）采集策略表单
 *
 * rule / receivers 动态行；clusterOptions、namespacesByCluster、workloadsByClusterNs 为演示级联数据
 * VXLAN 转发区块使用 StrategyVxlanForwardSection 共享组件
 */
import { computed, ref, watch } from 'vue'
import CollectionPolicyTabBar from './CollectionPolicyTabBar.vue'
import StrategyVxlanForwardSection from './StrategyVxlanForwardSection.vue'
import { appendReceiverIpRules, policyNameRequiredRule } from './strategyFormRules.js'
import {
  useFormValidate,
  wrapAddPolicyWithValidate
} from './useStrategyFormCore.js'
import {
  useCollectionSwitchAction,
  useMinListRemoveAction,
  useReceiverListActions
} from './useStrategySharedActions.js'
import {
  normalizeStatusFromRaw,
  normalizeReceiversFromRaw,
  strategyFormProps,
  toEnabledStatus,
  stringifyReceiversToDstIp
} from './strategyFormShared.js'
import { genPolicyId, usePolicyTabs } from './usePolicyTabs.js'
import {
  fetchTfRouteClusterOptionsApi,
  fetchTfRouteNamespaceOptionsApi,
  fetchTfRouteWorkloadOptionsApi
} from '@/api/probeGroup'
import { useTfRouteRulePage } from './useTfRouteRulePage.js'
import './collectionStrategyFormShared.css'

const props = defineProps(strategyFormProps)

/** 下拉选项：由 tfRouteRule 的 options 接口驱动 */
const clusterOptions = ref([])
const namespacesByCluster = ref({})
const workloadsByClusterNs = ref({})
// 只判断「是否已缓存该 key」，即便值是 [] 也视为命中，避免重复请求
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key)

/** 单条 K8s 选择规则（集群 + NS + workload 多选） */
function createK8sRule() {
  return {
    id: genPolicyId(),
    clusterId: '',
    namespace: '',
    workloads: []
  }
}

/**
 * 构造容器策略；blankForm 时接收端 ip 为空，首条 K8s 规则为空选项
 */
function createContainerPolicy(index, options = {}) {
  const name = `容器采集策略${index}`
  if (options.blankForm) {
    return {
      id: genPolicyId(),
      name,
      status: 'disable',
      rule: [createK8sRule()],
      vni: '',
      rateLimit: null,
      receivers: [{ id: genPolicyId(), ip: '' }]
    }
  }
  return {
    id: genPolicyId(),
    name,
    status: 'disable',
    rule: [createK8sRule()],
    vni: '',
    rateLimit: 100,
    receivers: [{ id: genPolicyId(), ip: '192.168.1.102' }]
  }
}

/** 接口数据归一化：为 rule / receivers 子项补 id */
function normalizeContainerPolicy(raw, index) {
  const d = createContainerPolicy(index + 1)
  if (!raw || typeof raw !== 'object') return d
  const rules = Array.isArray(raw.rule)
    ? raw.rule.map((r) => ({
        id: r?.id ?? genPolicyId(),
        clusterId: r?.clusterId ?? '',
        namespace: r?.namespace ?? '',
        workloads: Array.isArray(r?.workloads) ? [...r.workloads] : []
      }))
    : d.rule
  const receivers = normalizeReceiversFromRaw(raw, genPolicyId, d.receivers, {
    allowReceiverHost: false
  })
  return {
    ...d,
    ...raw,
    id: raw.id ?? d.id,
    name: raw.name ?? d.name,
    status: normalizeStatusFromRaw(raw),
    rule: rules.length ? rules : d.rule,
    vni: raw.vni ?? d.vni,
    rateLimit: raw.rateLimit ?? d.rateLimit,
    receivers: receivers.length ? receivers : d.receivers
  }
}

function normalizeContainerPolicyFromTfRule(raw, index) {
  const d = createContainerPolicy(index + 1)
  const receivers = normalizeReceiversFromRaw(raw, genPolicyId, d.receivers, { allowReceiverHost: false })
  const rows = Array.isArray(raw?.rule?.ruleGroup) ? raw.rule.ruleGroup : []
  // 后端 ruleGroup 可能同 cluster+namespace 多行（不同 workload），前端合并成一行多选 workloads
  const map = new Map()
  for (const row of rows) {
    const c = row?.cluster ?? ''
    const ns = row?.namespace ?? ''
    const key = `${c}:${ns}`
    if (!map.has(key)) {
      map.set(key, { id: genPolicyId(), clusterId: c, namespace: ns, workloads: [] })
    }
    if (row?.workload) {
      map.get(key).workloads.push(row.workload)
    }
  }
  const rules = [...map.values()]
  return {
    ...d,
    id: Number.isFinite(Number(raw?.id)) ? String(raw.id) : d.id,
    name: raw?.name ?? d.name,
    status: normalizeStatusFromRaw(raw),
    rule: rules.length ? rules : d.rule,
    vni: raw?.vni ?? d.vni,
    rateLimit: raw?.rateLimit ?? d.rateLimit,
    receivers: receivers.length ? receivers : d.receivers
  }
}

function toContainerTfRouteRule(policy) {
  const ruleGroup = []
  // 前端一行多 workload，回传时展开成多条 ruleGroup 项
  for (const row of policy.rule) {
    const workloads = Array.isArray(row.workloads) && row.workloads.length ? row.workloads : ['']
    for (const workload of workloads) {
      ruleGroup.push({
        cluster: row.clusterId,
        namespace: row.namespace,
        ...(workload ? { workload } : {})
      })
    }
  }
  return {
    id: Number(policy.id) || undefined,
    name: policy.name,
    dstIp: stringifyReceiversToDstIp(policy.receivers),
    vni: String(policy.vni ?? ''),
    rateLimit: Number(policy.rateLimit ?? 0),
    status: toEnabledStatus(policy.status),
    type: 2,
    rule: {
      ruleGroup,
      relation: 'OR'
    }
  }
}

const { policies, activeId, activePolicy, addPolicy, removeTab, replacePolicyId, hydratePolicies, markCurrentPolicySaved } =
  usePolicyTabs(createContainerPolicy)

async function loadClusterOptions() {
  try {
    const res = await fetchTfRouteClusterOptionsApi()
    const list = Array.isArray(res?.data) ? res.data : []
    clusterOptions.value = list.map((x) => ({ label: String(x), value: String(x) }))
  } catch {
    clusterOptions.value = []
  }
}

async function ensureNamespaces(clusterId) {
  // 按 cluster 缓存命名空间，避免重复请求
  if (!clusterId || hasOwn(namespacesByCluster.value, clusterId)) return
  try {
    const res = await fetchTfRouteNamespaceOptionsApi({ masterIp: clusterId })
    const list = Array.isArray(res?.data) ? res.data : []
    namespacesByCluster.value = {
      ...namespacesByCluster.value,
      [clusterId]: list.map((x) => ({ label: String(x), value: String(x) }))
    }
  } catch {
    namespacesByCluster.value = { ...namespacesByCluster.value, [clusterId]: [] }
  }
}

async function ensureWorkloads(clusterId, namespace) {
  const key = `${clusterId}:${namespace}`
  // 按 cluster:namespace 缓存 workload，减少级联切换抖动
  if (!clusterId || !namespace || hasOwn(workloadsByClusterNs.value, key)) return
  try {
    const res = await fetchTfRouteWorkloadOptionsApi({ masterIp: clusterId, namespace })
    const list = Array.isArray(res?.data) ? res.data : []
    workloadsByClusterNs.value = {
      ...workloadsByClusterNs.value,
      [key]: list.map((x) => ({ label: String(x), value: String(x) }))
    }
  } catch {
    workloadsByClusterNs.value = { ...workloadsByClusterNs.value, [key]: [] }
  }
}

async function afterHydrateContainerRules(policyList) {
  // 回显后并行预拉取级联 options，减少多规则场景等待时间
  const clusterIds = new Set()
  const clusterNsKeys = new Set()
  for (const p of policyList) {
    const rows = Array.isArray(p?.rule) ? p.rule : []
    for (const row of rows) {
      const clusterId = String(row?.clusterId ?? '')
      const namespace = String(row?.namespace ?? '')
      if (clusterId) clusterIds.add(clusterId)
      if (clusterId && namespace) clusterNsKeys.add(`${clusterId}:${namespace}`)
    }
  }
  await Promise.all([...clusterIds].map((clusterId) => ensureNamespaces(clusterId)))
  await Promise.all(
    [...clusterNsKeys].map((key) => {
      // key 来自 `${clusterId}:${namespace}`，保持和 ensureWorkloads 缓存 key 一致
      const [clusterId, namespace] = key.split(':')
      return ensureWorkloads(clusterId, namespace)
    })
  )
}

const formRef = ref(null)
const validateForm = useFormValidate(formRef)

/** 先校验表单再新增 Tab */
const onAddPolicyTab = wrapAddPolicyWithValidate(validateForm, addPolicy)

const {
  startLoading,
  loadTfRouteRules,
  onSave,
  onToggleCollection,
  onRemovePolicyTab
} = useTfRouteRulePage({
  props,
  type: 2,
  // 仅处理容器策略
  strategyTypeName: '容器',
  policies,
  activePolicy,
  hydratePolicies,
  markCurrentPolicySaved,
  replacePolicyId,
  validateForm,
  removeTab,
  normalizePolicyFromTfRule: normalizeContainerPolicyFromTfRule,
  normalizePolicyFromDetail: normalizeContainerPolicy,
  toTfRouteRulePayload: toContainerTfRouteRule,
  afterHydrate: afterHydrateContainerRules
})

watch(() => props.groupId, async () => {
  await loadClusterOptions()
  await loadTfRouteRules()
}, { immediate: true })

/** 动态 rules：含 rule.*、receivers.*.ip */
function buildContainerFormRules(policy) {
  const base = appendReceiverIpRules({
    name: policyNameRequiredRule,
    vni: [{ required: true, message: '请输入标识 VNI', trigger: 'blur' }],
    rateLimit: [{ required: true, message: '请输入限速', trigger: 'change' }]
  }, policy)
  policy.rule.forEach((_, i) => {
    base[`rule.${i}.clusterId`] = [{ required: true, message: '请选择集群', trigger: 'change' }]
    base[`rule.${i}.namespace`] = [{ required: true, message: '请选择命名空间', trigger: 'change' }]
    base[`rule.${i}.workloads`] = [
      {
        validator: (_rule, val, cb) => {
          if (!Array.isArray(val) || val.length === 0) {
            cb(new Error('请选择工作负载'))
            return
          }
          cb()
        },
        trigger: 'change'
      }
    ]
  })
  return base
}

const formRules = computed(() => buildContainerFormRules(activePolicy.value))

/** 级联：当前集群下可选命名空间 */
function namespaceOptionsForCluster(clusterId) {
  if (!clusterId) return []
  return namespacesByCluster.value[clusterId] ?? []
}

/** 级联：集群+NS 确定后可选工作负载选项 */
function workloadOptionsForRule(rule) {
  if (!rule.clusterId || !rule.namespace) return []
  const key = `${rule.clusterId}:${rule.namespace}`
  return workloadsByClusterNs.value[key] ?? []
}

/** 工作负载下拉占位提示（依赖上级是否已选） */
function workloadPlaceholderFor(rule) {
  if (!rule.clusterId) return '请先选择集群'
  if (!rule.namespace) return '请先选择命名空间'
  return '请选择工作负载（可多选）'
}

/** 切换集群时清空下级命名空间与工作负载 */
async function onK8sClusterChange(rule) {
  rule.namespace = ''
  rule.workloads = []
  await ensureNamespaces(rule.clusterId)
}

/** 切换命名空间时清空工作负载 */
async function onK8sNamespaceChange(rule) {
  rule.workloads = []
  await ensureWorkloads(rule.clusterId, rule.namespace)
}

/** 当前策略下增加一条 K8s 规则卡片 */
function addK8sRule() {
  activePolicy.value.rule.push(createK8sRule())
}

const { removeAt: removeK8sRule } = useMinListRemoveAction({
  // 与虚机页一致：通过函数实时获取当前激活策略的 rule
  getList: () => activePolicy.value?.rule,
  min: 1,
  minMsg: '至少保留一条 K8s 选择规则'
})

/** 接收端增删与采集开关切换复用逻辑 */
const { addReceiver, removeReceiver } = useReceiverListActions({
  activePolicy,
  createEmptyReceiver: () => ({ id: genPolicyId(), ip: '' })
})
const { onCollectionSwitchChange } = useCollectionSwitchAction({ activePolicy, onToggleCollection })

defineExpose({
  saveStrategy: onSave,
  startCollection: onToggleCollection
})
</script>

<template>
  <div class="strategy-panel">
    <!-- Tab + 容器策略表单 -->
    <CollectionPolicyTabBar
      :policies="policies"
      :active-id="activeId"
      @update:active-id="activeId = $event"
      @add="onAddPolicyTab"
      @remove="onRemovePolicyTab"
    />

    <div class="form-card">
      <el-form
        :key="activeId"
        ref="formRef"
        :model="activePolicy"
        :rules="formRules"
        label-position="left"
        label-width="120px"
        class="strategy-form"
        require-asterisk-position="right"
      >
        <div class="form-card-toolbar">
          <el-button type="primary" @click="onSave">保存策略</el-button>
        </div>
        <div class="block-divider form-card-toolbar-divider" />

        <!-- 策略名称 -->
        <section class="form-block">
          <el-form-item label="策略名称" prop="name">
            <el-input
              v-model="activePolicy.name"
              class="field-input--policy-name"
              placeholder="请输入策略名称"
              clearable
            />
          </el-form-item>
          <el-form-item label="采集状态">
            <el-switch
              v-model="activePolicy.status"
              active-value="enable"
              inactive-value="disable"
              :loading="startLoading"
              inline-prompt
              active-text="开启"
              inactive-text="关闭"
              @change="onCollectionSwitchChange"
            />
          </el-form-item>
        </section>

        <div class="block-divider" />

        <!-- K8s 选择规则（可多条） -->
        <section class="form-block">
          <div class="k8s-rules-head">
            <h3 class="block-title k8s-rules-title">K8s 选择规则</h3>
            <el-button type="primary" link @click="addK8sRule">+ 添加规则</el-button>
          </div>

          <div
            v-for="(rule, rIdx) in activePolicy.rule"
            :key="rule.id"
            class="k8s-rule-card"
          >
            <div class="k8s-rule-card__head">
              <span class="k8s-rule-card__index">规则 {{ rIdx + 1 }}</span>
              <el-button
                v-if="activePolicy.rule.length > 1"
                link
                type="danger"
                @click="removeK8sRule(rIdx)"
              >
                删除
              </el-button>
            </div>
            <el-row :gutter="24">
              <el-col :xs="24" :sm="8">
                <el-form-item label="选择集群" :prop="`rule.${rIdx}.clusterId`" label-position="top">
                  <el-select
                    v-model="rule.clusterId"
                    placeholder="请选择集群"
                    clearable
                    style="width: 100%"
                    @change="onK8sClusterChange(rule)"
                  >
                    <el-option v-for="c in clusterOptions" :key="c.value" :label="c.label" :value="c.value" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="8">
                <el-form-item label="选择命名空间" :prop="`rule.${rIdx}.namespace`" label-position="top">
                  <el-select
                    v-model="rule.namespace"
                    :disabled="!rule.clusterId"
                    :placeholder="!rule.clusterId ? '请先选择集群' : '请选择命名空间'"
                    clearable
                    style="width: 100%"
                    @change="onK8sNamespaceChange(rule)"
                  >
                    <el-option
                      v-for="n in namespaceOptionsForCluster(rule.clusterId)"
                      :key="n.value"
                      :label="n.label"
                      :value="n.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="8">
                <el-form-item label="工作负载" :prop="`rule.${rIdx}.workloads`" label-position="top">
                  <el-select
                    v-model="rule.workloads"
                    multiple
                    collapse-tags
                    collapse-tags-tooltip
                    :max-collapse-tags="2"
                    :disabled="!rule.namespace"
                    :placeholder="workloadPlaceholderFor(rule)"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="w in workloadOptionsForRule(rule)"
                      :key="w.value"
                      :label="w.label"
                      :value="w.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </section>

        <div class="block-divider" />

        <StrategyVxlanForwardSection
          :policy="activePolicy"
          @add-receiver="addReceiver"
          @remove-receiver="removeReceiver"
        />
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.strategy-form .k8s-rule-card :deep(.el-form-item) {
  margin-bottom: 8px;
}
.block-title {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.4;
}
.k8s-rules-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.k8s-rules-title {
  margin: 0;
}
.k8s-rule-card {
  padding: 16px;
  margin-bottom: 12px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
}
.k8s-rule-card:last-child {
  margin-bottom: 0;
}
.k8s-rule-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.k8s-rule-card__index {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}
.block-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.4;
}
</style>
