export function readEnvBool(key, fallback = false) {
  const raw = import.meta.env?.[key]
  if (raw === undefined) return fallback
  return String(raw).toLowerCase() === 'true'
}

// 所有 mock 开关集中在这里，页面只消费语义化字段，不直接读取环境变量名。
export const mockSwitches = {
  tbDetectionAlert: readEnvBool('VITE_USE_MOCK_TB_DETECTION_ALERT', false),
  trafficForwardingAlert: readEnvBool('VITE_USE_MOCK_TF_FORWARDING_ALERT', true),
  tfAlarmRuleList: readEnvBool('VITE_USE_MOCK_NEXT_PAGE_LIST', true),
  alertContentTags: readEnvBool('VITE_USE_MOCK_ALERT_CONTENT_TAGS', true),
  scopeApis: readEnvBool('VITE_USE_MOCK_SCOPE_APIS', false),
  tfRouteRule: readEnvBool('VITE_USE_MOCK_TF_ROUTE_RULE', true)
}
