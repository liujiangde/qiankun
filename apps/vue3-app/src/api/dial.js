import request from '@/utils/request'

const DETECTION_RESULT_PREFIX = '/cloudmonitor/tbDetectionResult'
const DETECTION_ALERT_PREFIX = '/tbDetectionAlert'

function pickResponseData(raw) {
  return raw?.data ?? raw
}

function normalizeLineData(raw) {
  const data = pickResponseData(raw)
  return data && typeof data === 'object' ? data : {}
}

function queryDetectionLineApi(type, params) {
  // 页面只传业务参数；路径、请求方式、响应兜底统一放在 API 模块里。
  return request
    .get(`${DETECTION_RESULT_PREFIX}/${type}`, {
      params,
      dedupeKey: `dial:detection-line:${type}`
    })
    .then(normalizeLineData)
}

export function queryDetectionResultLineApi(params) {
  return queryDetectionLineApi('resultLine', params)
}

export function queryDetectionTimeSpentLineApi(params) {
  return queryDetectionLineApi('timeSpentLine', params)
}

export function fetchTbDetectionAlertListApi(params) {
  // 拨测告警列表仍保留原后端分页参数，由页面负责把筛选态转换成 params。
  return request.get(`${DETECTION_ALERT_PREFIX}/list`, {
    params,
    dedupeKey: 'dial:alert-list'
  })
}
