import axios from 'axios'

export const AUTH_EXPIRED_EVENT = 'vue3-app-auth-expired'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const AUTH_TOKEN_KEY = import.meta.env.VITE_AUTH_TOKEN_KEY || 'access_token'
const pendingControllers = new Map()

const service = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000
})

function getStoredToken() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(AUTH_TOKEN_KEY) || ''
}

function clearStoredToken() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
}

function dispatchAuthExpired(message) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(AUTH_EXPIRED_EVENT, {
      detail: { message }
    })
  )
}

function cancelPendingRequest(dedupeKey) {
  const controller = pendingControllers.get(dedupeKey)
  if (!controller) return
  controller.abort()
  pendingControllers.delete(dedupeKey)
}

function attachDedupeController(config) {
  const dedupeKey = config.dedupeKey
  if (!dedupeKey) return config

  // 同一个 dedupeKey 只保留最后一次请求，适合搜索、分页、图表等高频查询。
  cancelPendingRequest(dedupeKey)
  const controller = new AbortController()
  const originalSignal = config.signal

  if (originalSignal?.aborted) {
    controller.abort()
  } else {
    originalSignal?.addEventListener('abort', () => controller.abort(), {
      once: true
    })
  }

  config.signal = controller.signal
  config.__dedupeKey = dedupeKey
  pendingControllers.set(dedupeKey, controller)
  return config
}

function clearDedupeController(config) {
  const dedupeKey = config?.__dedupeKey
  if (!dedupeKey) return
  const controller = pendingControllers.get(dedupeKey)
  if (controller?.signal === config.signal) {
    pendingControllers.delete(dedupeKey)
  }
}

function createCanceledError() {
  const error = new Error('请求已取消')
  error.isCanceled = true
  return error
}

function normalizeErrorMessage(error) {
  return (
    error?.response?.data?.msg ||
    error?.response?.data?.message ||
    error?.message ||
    '请求失败，请稍后重试'
  )
}

service.interceptors.request.use((config) => {
  // 公共请求层适合放“每个接口都需要”的横切逻辑，例如 baseURL、token、超时。
  const token = getStoredToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`
  }
  return attachDedupeController(config)
})

service.interceptors.response.use(
  (response) => {
    clearDedupeController(response.config)
    const data = response.data

    // 后端常见约定：success=false 代表业务失败，HTTP 状态仍可能是 200。
    if (data && typeof data === 'object' && data.success === false) {
      return Promise.reject(new Error(data.msg || data.message || '请求失败，请稍后重试'))
    }

    return data
  },
  (error) => {
    clearDedupeController(error.config)

    if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') {
      return Promise.reject(createCanceledError())
    }

    const message = normalizeErrorMessage(error)
    if (error?.response?.status === 401) {
      // 401 统一在请求层处理：清 token 并广播事件，UI 层只监听事件展示提示或跳登录。
      clearStoredToken()
      dispatchAuthExpired(message || '登录状态已失效，请重新登录')
    }

    return Promise.reject(new Error(message))
  }
)

// 页面和业务 API 只使用这个 request 对象，避免到处直接依赖 axios 实例。
const request = {
  cancel(dedupeKey) {
    cancelPendingRequest(dedupeKey)
  },
  get(url, config = {}) {
    return service.get(url, config)
  },
  post(url, data, config = {}) {
    return service.post(url, data, config)
  },
  put(url, data, config = {}) {
    return service.put(url, data, config)
  },
  delete(url, config = {}) {
    return service.delete(url, config)
  }
}

export default request
