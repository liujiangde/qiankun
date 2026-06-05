import axios from 'axios'

const service = axios.create({
  timeout: 15000
})

service.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error?.response?.data?.msg ||
      error?.response?.data?.message ||
      error?.message ||
      '请求失败，请稍后重试'
    return Promise.reject(new Error(message))
  }
)

const request = {
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
