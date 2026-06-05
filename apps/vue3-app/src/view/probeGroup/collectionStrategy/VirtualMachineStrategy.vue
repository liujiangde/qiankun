<script setup>
/**
 * 虚拟机采集策略表单
 *
 * rule 为动态行；rules 随行数在 buildVmFormRules 中生成 rule.i.*
 * VXLAN 转发区块使用 StrategyVxlanForwardSection 共享组件
 */
import { Close } from '@element-plus/icons-vue'
import { computed, ref, watch } from 'vue'
import CollectionPolicyTabBar from './CollectionPolicyTabBar.vue'
import StrategyVxlanForwardSection from './StrategyVxlanForwardSection.vue'
import { appendReceiverIpRules, isEmptyString, policyNameRequiredRule } from './strategyFormRules.js'
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
import { useTfRouteRulePage } from './useTfRouteRulePage.js'
import './collectionStrategyFormShared.css'

const props = defineProps(strategyFormProps)

/** 采集规则行 — 字段下拉选项（演示数据） */
const ruleFieldOptions = [
  { label: '虚拟机名称', value: 'vm_name' },
  { label: '虚拟机 UUID', value: 'vm_uuid' },
  { label: '所属宿主机', value: 'host_name' },
  { label: '资源池 / 集群', value: 'cluster' }
]

/** 采集规则：运算符 */
const ruleOperatorOptions = [
  { label: '是', value: 'eq' },
  { label: '否', value: 'ne' },
  { label: '包含', value: 'contains' },
  { label: '不包含', value: 'not_contains' }
]

/** 单条采集规则行（vm 维度） */
function createCollectRule() {
  return {
    id: genPolicyId(),
    field: 'vm_name',
    operator: 'eq',
    value: ''
  }
}

/**
 * 构造一条虚机策略；options.blankForm 时除名称外置空
 */
function createVmPolicy(index, options = {}) {
  const name = `虚机采集策略${index}`
  if (options.blankForm) {
    return {
      id: genPolicyId(),
      name,
      status: 'disable',
      rule: [createCollectRule()],
      vni: '',
      rateLimit: null,
      receivers: [{ id: genPolicyId(), ip: '' }]
    }
  }
  return {
    id: genPolicyId(),
    name,
    status: 'disable',
    rule: [createCollectRule()],
    vni: '200',
    rateLimit: 100,
    receivers: [{ id: genPolicyId(), ip: '192.168.1.101' }]
  }
}

/** 接口单条策略归一化：补全 rule 内每条规则的 id */
function normalizeVmPolicy(raw, index) {
  const d = createVmPolicy(index + 1)
  if (!raw || typeof raw !== 'object') return d
  const rules = Array.isArray(raw.rule)
    ? raw.rule.map((r) => ({
        id: r?.id ?? genPolicyId(),
        field: r?.field ?? 'vm_name',
        operator: r?.operator ?? 'eq',
        value: r?.value ?? ''
      }))
    : d.rule
  const receivers = normalizeReceiversFromRaw(raw, genPolicyId, d.receivers, {
    allowReceiverHost: true
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

function normalizeVmPolicyFromTfRule(raw, index) {
  const d = createVmPolicy(index + 1)
  const rule = raw?.rule ?? {}
  const receivers = normalizeReceiversFromRaw(raw, genPolicyId, d.receivers, { allowReceiverHost: true })
  // tfRouteRule.rule.ruleGroup -> rule（每行补本地 id，便于列表渲染/删除）
  const rules = Array.isArray(rule?.ruleGroup)
    ? rule.ruleGroup.map((r) => ({
        id: genPolicyId(),
        field: r?.field ?? 'vm_name',
        operator: r?.operator ?? 'eq',
        value: r?.value ?? ''
      }))
    : d.rule
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

function toVmTfRouteRule(policy) {
  // 页面模型 -> tfRouteRule（type=1 虚机）；当前 relation 固定 AND
  return {
    id: Number(policy.id) || undefined,
    name: policy.name,
    dstIp: stringifyReceiversToDstIp(policy.receivers),
    vni: String(policy.vni ?? ''),
    rateLimit: Number(policy.rateLimit ?? 0),
    status: toEnabledStatus(policy.status),
    type: 1,
    rule: {
      ruleGroup: policy.rule.map((r) => ({
        field: r.field,
        operator: r.operator,
        value: String(r.value ?? '')
      })),
      relation: 'AND'
    }
  }
}

const { policies, activeId, activePolicy, addPolicy, removeTab, replacePolicyId, hydratePolicies, markCurrentPolicySaved } =
  usePolicyTabs(createVmPolicy)

const formRef = ref(null)
const validateForm = useFormValidate(formRef)

/** 先校验表单再新增 Tab（见 wrapAddPolicyWithValidate） */
const onAddPolicyTab = wrapAddPolicyWithValidate(validateForm, addPolicy)

const {
  startLoading,
  loadTfRouteRules,
  onSave,
  onToggleCollection,
  onRemovePolicyTab
} = useTfRouteRulePage({
  props,
  type: 1,
  // 仅处理虚机策略
  strategyTypeName: '虚拟机',
  policies,
  activePolicy,
  hydratePolicies,
  markCurrentPolicySaved,
  replacePolicyId,
  validateForm,
  removeTab,
  normalizePolicyFromTfRule: normalizeVmPolicyFromTfRule,
  normalizePolicyFromDetail: normalizeVmPolicy,
  toTfRouteRulePayload: toVmTfRouteRule
})

watch(() => props.groupId, loadTfRouteRules, { immediate: true })

/** 动态生成 rule.* 的 prop 规则，与当前策略行数一致 */
function buildVmFormRules(policy) {
  const base = appendReceiverIpRules({
    name: policyNameRequiredRule,
    vni: [{ required: true, message: '请输入标识 VNI', trigger: 'blur' }],
    rateLimit: [{ required: true, message: '请输入限速', trigger: 'change' }]
  }, policy)
  policy.rule.forEach((_, i) => {
    base[`rule.${i}.field`] = [{ required: true, message: '请选择字段', trigger: 'change' }]
    base[`rule.${i}.operator`] = [{ required: true, message: '请选择运算符', trigger: 'change' }]
    base[`rule.${i}.value`] = [
      {
        validator: (_rule, val, cb) => {
          if (isEmptyString(val)) cb(new Error('请输入规则值'))
          else cb()
        },
        trigger: 'blur'
      }
    ]
  })
  return base
}

const formRules = computed(() => buildVmFormRules(activePolicy.value))

/** 当前策略下追加一条采集规则 */
function addCollectRule() {
  activePolicy.value.rule.push(createCollectRule())
}

const { removeAt: removeCollectRule } = useMinListRemoveAction({
  // activePolicy 切换时 rule 引用会变化，需按调用时实时读取
  getList: () => activePolicy.value?.rule,
  min: 1,
  minMsg: '至少保留一条采集规则'
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
    <!-- Tab + 当前策略表单 -->
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

        <!-- 采集规则 -->
        <section class="form-block">
          <div class="section-head">
            <h3 class="block-title section-head__title">采集规则</h3>
            <el-button type="primary" link @click="addCollectRule">+ 添加规则</el-button>
          </div>

          <div
            v-for="(rule, idx) in activePolicy.rule"
            :key="rule.id"
            class="rule-row-card"
          >
            <span class="rule-row-card__index">规则 {{ idx + 1 }}</span>
            <el-form-item
              :prop="`rule.${idx}.field`"
              class="rule-form-item rule-form-item--field"
              label-width="0"
            >
              <el-select v-model="rule.field" placeholder="字段" class="rule-row-card__field">
                <el-option v-for="f in ruleFieldOptions" :key="f.value" :label="f.label" :value="f.value" />
              </el-select>
            </el-form-item>
            <el-form-item
              :prop="`rule.${idx}.operator`"
              class="rule-form-item rule-form-item--op"
              label-width="0"
            >
              <el-select v-model="rule.operator" placeholder="运算符" class="rule-row-card__op">
                <el-option v-for="o in ruleOperatorOptions" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
            <el-form-item
              :prop="`rule.${idx}.value`"
              class="rule-form-item rule-form-item--value"
              label-width="0"
            >
              <el-input v-model="rule.value" placeholder="请输入值" clearable class="rule-row-card__value" />
            </el-form-item>
            <el-button
              v-if="activePolicy.rule.length > 1"
              link
              type="danger"
              class="rule-row-card__remove"
              :icon="Close"
              @click="removeCollectRule(idx)"
            />
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
.strategy-form .rule-row-card :deep(.el-form-item) {
  margin-bottom: 0;
}
.strategy-form .rule-row-card :deep(.el-form-item__error) {
  position: absolute;
  top: 100%;
  left: 0;
  padding-top: 2px;
  white-space: nowrap;
}
.rule-form-item {
  position: relative;
  margin-bottom: 22px;
}
.rule-form-item--value {
  flex: 0 1 360px;
  max-width: 400px;
  min-width: 140px;
}
.block-title {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.4;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.section-head__title {
  margin: 0;
}
.rule-row-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  margin-bottom: 10px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
}
.rule-row-card:last-child {
  margin-bottom: 0;
}
.rule-row-card__index {
  flex-shrink: 0;
  width: 92px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}
.rule-row-card__field {
  width: 160px;
  min-width: 120px;
}
.rule-row-card__op {
  width: 100px;
  min-width: 80px;
}
.rule-row-card__value {
  flex: 0 1 360px;
  max-width: 400px;
  min-width: 140px;
}
.rule-row-card__remove {
  flex-shrink: 0;
}
</style>
