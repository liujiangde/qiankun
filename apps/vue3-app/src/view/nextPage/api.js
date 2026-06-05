import request from '@/utils/request'

const API_PREFIX = '/apmServer-s1/tf-alarm-rule'

export function fetchTfAlarmRuleListApi(payload) {
  return request.post(`${API_PREFIX}/list`, payload)
}

export function createTfAlarmRuleApi(payload) {
  return request.post(`${API_PREFIX}/add`, payload)
}

export function editTfAlarmRuleApi(payload) {
  return request.post(`${API_PREFIX}/edit`, payload)
}

export function enableTfAlarmRuleApi(ids) {
  return request.get(`${API_PREFIX}/enable`, { params: { ids } })
}

export function disableTfAlarmRuleApi(ids) {
  return request.get(`${API_PREFIX}/disable`, { params: { ids } })
}

export function deleteTfAlarmRuleApi(ids) {
  return request.get(`${API_PREFIX}/delete`, { params: { ids } })
}

/**
 * 告警内容可插入的标签列表（占位符）
 */
export function fetchTfAlarmRuleAlertContentTagsApi() {
  return request.get(`${API_PREFIX}/alarm-content-tags`)
}

/**
 * 告警作用域：分组列表（单选下拉）
 */
export function fetchTfAlarmRuleScopeGroupsApi() {
  // Swagger: GET /tf-alarm-rule/group/options
  return request.get(`${API_PREFIX}/group/options`)
}

/**
 * 指定分组下的物理机列表（多选下拉），依赖分组 id
 * @param {{ groupId: string }} params
 */
export function fetchTfAlarmRulePhysicalMachinesApi(params) {
  // Swagger: GET /tf-alarm-rule/agent/options
  // params 里传分组 id（例如 groupId）
  return request.get(`${API_PREFIX}/agent/options`, { params })
}
