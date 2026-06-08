import request from '@/utils/request'

const TRAFFIC_FORWARD_ALERT_PREFIX = '/tfTrafficForwardAlert'
const TF_ALARM_RULE_PREFIX = '/apmServer-s1/tf-alarm-rule'

export function fetchTrafficForwardAlertHistoryApi(params) {
  // 流量转发告警历史列表：统一从 request 走，后续 token、baseURL 等不需要改页面。
  return request.get(`${TRAFFIC_FORWARD_ALERT_PREFIX}/history/list`, {
    params,
    dedupeKey: 'traffic-forwarding:alert-history'
  })
}

export function fetchTfAlarmRuleListApi(payload) {
  // 告警规则列表使用 POST 分页查询，页面只负责组装筛选条件。
  return request.post(`${TF_ALARM_RULE_PREFIX}/list`, payload, {
    dedupeKey: 'traffic-forwarding:alarm-rule-list'
  })
}

export function createTfAlarmRuleApi(payload) {
  return request.post(`${TF_ALARM_RULE_PREFIX}/add`, payload)
}

export function editTfAlarmRuleApi(payload) {
  return request.post(`${TF_ALARM_RULE_PREFIX}/edit`, payload)
}

export function enableTfAlarmRuleApi(ids) {
  return request.get(`${TF_ALARM_RULE_PREFIX}/enable`, { params: { ids } })
}

export function disableTfAlarmRuleApi(ids) {
  return request.get(`${TF_ALARM_RULE_PREFIX}/disable`, { params: { ids } })
}

export function deleteTfAlarmRuleApi(ids) {
  return request.get(`${TF_ALARM_RULE_PREFIX}/delete`, { params: { ids } })
}

export function fetchTfAlarmRuleAlertContentTagsApi() {
  // 告警内容可插入标签列表，RuleDia 负责把返回值归一化成 select/tag 可用结构。
  return request.get(`${TF_ALARM_RULE_PREFIX}/alarm-content-tags`)
}

export function fetchTfAlarmRuleScopeGroupsApi() {
  // 告警作用域分组列表；接口字段可能随后端调整，归一化逻辑留在弹窗组件里。
  return request.get(`${TF_ALARM_RULE_PREFIX}/group/options`)
}

export function fetchTfAlarmRulePhysicalMachinesApi(params) {
  // 指定分组下的物理机列表，params 通常包含 groupId。
  return request.get(`${TF_ALARM_RULE_PREFIX}/agent/options`, { params })
}
