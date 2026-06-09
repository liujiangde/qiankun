<script setup>
/**
 * 物理机采集策略表单
 *
 * 数据结构：createPhysicalPolicy / normalizePhysicalPolicy → usePolicyTabs
 * 交互：Tab 栏 + 单 el-form（model=activePolicy）；新增 Tab 先 validate 再 addPolicy（含脏拦截）
 * 对外：defineExpose saveStrategy、startCollection（供父级或其它入口调用）
 */
import { QuestionFilled } from '@element-plus/icons-vue'
import { computed, ref, watch } from 'vue'
import CollectionPolicyTabBar from './CollectionPolicyTabBar.vue'
import StrategyVxlanForwardSection from './StrategyVxlanForwardSection.vue'
import { appendReceiverIpRules, policyNameRequiredRule } from './strategyFormRules.js'
import { useFormValidate, wrapAddPolicyWithValidate } from './useStrategyFormCore.js'
import { useCollectionSwitchAction, useReceiverListActions } from './useStrategySharedActions.js'
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

/**
 * 构造一条物理策略初始值
 * @param {number} index 展示序号，用于默认策略名称
 * @param {{ blankForm?: boolean }} [options] blankForm：用户点「新增策略」时除名称外字段置空
 */
function createPhysicalPolicy(index, options = {}) {
  const name = `网卡采集策略${index}`
  if (options.blankForm) {
    return {
      id: genPolicyId(),
      name,
      status: 'disable',
      nicNames: '',
      vni: '',
      rateLimit: null,
      receivers: [{ id: genPolicyId(), ip: '' }]
    }
  }
  return {
    id: genPolicyId(),
    name,
    status: 'disable',
    nicNames: 'eth0,eth1',
    vni: '100',
    rateLimit: 100,
    receivers: [{ id: genPolicyId(), ip: '192.168.1.100' }]
  }
}

/** 将接口返回的单条策略与本地默认值合并，缺省字段用默认补齐 */
function normalizePhysicalPolicy(raw, index) {
  const d = createPhysicalPolicy(index + 1)
  if (!raw || typeof raw !== 'object') return d
  const receivers = normalizeReceiversFromRaw(raw, genPolicyId, d.receivers, {
    allowReceiverHost: true
  })
  return {
    ...d,
    ...raw,
    id: raw.id ?? d.id,
    name: raw.name ?? d.name,
    status: normalizeStatusFromRaw(raw),
    nicNames: raw.nicNames ?? d.nicNames,
    vni: raw.vni ?? d.vni,
    rateLimit: raw.rateLimit ?? d.rateLimit,
    receivers: receivers.length ? receivers : d.receivers
  }
}

function normalizePhysicalPolicyFromTfRule(raw, index) {
  const d = createPhysicalPolicy(index + 1)
  const rule = raw?.rule ?? {}
  const receivers = normalizeReceiversFromRaw(raw, genPolicyId, d.receivers, {
    allowReceiverHost: true
  })
  // tfRouteRule -> 页面模型：rule.interface_name 映射 nicNames；dstIp/vni/rateLimit 映射 VXLAN 字段
  return {
    ...d,
    id: Number.isFinite(Number(raw?.id)) ? String(raw.id) : d.id,
    name: raw?.name ?? d.name,
    status: normalizeStatusFromRaw(raw),
    nicNames: rule?.interface_name ?? d.nicNames,
    vni: raw?.vni ?? d.vni,
    rateLimit: raw?.rateLimit ?? d.rateLimit,
    receivers: receivers.length ? receivers : d.receivers
  }
}

function toPhysicalTfRouteRule(policy) {
  // 页面模型 -> tfRouteRule（type=0 物理机）
  return {
    id: Number(policy.id) || undefined,
    name: policy.name,
    dstIp: stringifyReceiversToDstIp(policy.receivers),
    vni: String(policy.vni ?? ''),
    rateLimit: Number(policy.rateLimit ?? 0),
    status: toEnabledStatus(policy.status),
    type: 0,
    rule: {
      interface_name: String(policy.nicNames ?? '')
    }
  }
}

// 多 Tab 状态与增删、回显、保存基线
const {
  policies,
  activeId,
  activePolicy,
  addPolicy,
  removeTab,
  replacePolicyId,
  hydratePolicies,
  markCurrentPolicySaved
} = usePolicyTabs(createPhysicalPolicy)

const formRef = ref(null)
const validateForm = useFormValidate(formRef)

/** Tab「+ 新增策略」：先 el-form 校验，再 addPolicy（未保存脏数据时仍会被拦截） */
const onAddPolicyTab = wrapAddPolicyWithValidate(validateForm, addPolicy)

const { startLoading, loadTfRouteRules, onSave, onToggleCollection, onRemovePolicyTab } =
  useTfRouteRulePage({
    props,
    type: 0,
    // 仅拉取/保存 type=0（物理机）规则
    strategyTypeName: '物理机',
    policies,
    activePolicy,
    hydratePolicies,
    markCurrentPolicySaved,
    replacePolicyId,
    validateForm,
    removeTab,
    normalizePolicyFromTfRule: normalizePhysicalPolicyFromTfRule,
    normalizePolicyFromDetail: normalizePhysicalPolicy,
    toTfRouteRulePayload: toPhysicalTfRouteRule
  })

watch(() => props.groupId, loadTfRouteRules, { immediate: true })

/** 组装 el-form rules */
function buildPhysicalFormRules(policy) {
  const base = appendReceiverIpRules(
    {
      name: policyNameRequiredRule,
      nicNames: [{ required: true, message: '请输入网卡名称', trigger: 'blur' }],
      vni: [{ required: true, message: '请输入标识 VNI', trigger: 'blur' }],
      rateLimit: [{ required: true, message: '请输入限速', trigger: 'change' }]
    },
    policy
  )
  return base
}

const formRules = computed(() => buildPhysicalFormRules(activePolicy.value))

/** 接收端增删与采集开关切换复用逻辑 */
const { addReceiver, removeReceiver, updateVxlanField, updateReceiverIp } = useReceiverListActions({
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
    <!-- 多策略 Tab -->
    <CollectionPolicyTabBar
      :policies="policies"
      :active-id="activeId"
      @update:active-id="activeId = $event"
      @add="onAddPolicyTab"
      @remove="onRemovePolicyTab"
    />

    <!-- 当前激活策略的表单（:key 切换 Tab 时重置校验状态） -->
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

        <!-- 网卡设置 -->
        <section class="form-block">
          <h3 class="block-title">网卡设置</h3>
          <el-form-item prop="nicNames" class="field-label-mt">
            <template #label>
              <span>网卡名称</span>
              <el-tooltip content="支持正则表达式" placement="top">
                <el-icon class="nic-suffix-icon nic-label-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-input
              v-model="activePolicy.nicNames"
              class="field-input--nic-pattern"
              placeholder="eth0,eth1"
              clearable
            />
            <p class="field-hint">
              多个网卡用逗号分隔，支持正则表达式匹配，例如：eth.* 匹配所有以 eth 开头的网卡
            </p>
          </el-form-item>
        </section>

        <div class="block-divider" />

        <StrategyVxlanForwardSection
          :policy="activePolicy"
          @update-field="updateVxlanField"
          @update-receiver-ip="updateReceiverIp"
          @add-receiver="addReceiver"
          @remove-receiver="removeReceiver"
        />
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.field-label-mt {
  margin-top: 4px;
}
.nic-label-icon {
  margin-left: 4px;
  vertical-align: -2px;
  cursor: help;
}
.field-input--nic-pattern {
  max-width: 560px;
  width: 100%;
}
.field-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
  max-width: 560px;
}
.nic-suffix-icon {
  color: var(--el-text-color-secondary);
  cursor: help;
}
</style>
