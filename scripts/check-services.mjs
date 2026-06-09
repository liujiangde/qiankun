const services = [
  {
    name: 'main',
    url: 'http://localhost:7100'
  },
  {
    name: 'react-dashboard',
    url: process.env.VITE_REACT_DASHBOARD_ENTRY || 'http://localhost:7101'
  },
  {
    name: 'vue3-app',
    url: process.env.VITE_VUE3_APP_ENTRY || 'http://localhost:7102'
  }
]

function normalizeUrl(url) {
  // qiankun entry 常写成 //localhost:7101，这里补全协议方便 fetch 检查。
  return url.startsWith('//') ? `http:${url}` : url
}

async function checkService(service) {
  const url = normalizeUrl(service.url)
  const controller = new AbortController()
  // 服务检查只用于快速发现未启动的子应用，避免长时间阻塞本地开发命令。
  const timeout = setTimeout(() => controller.abort(), 3000)

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    })

    return {
      ...service,
      url,
      ok: response.ok,
      status: response.status
    }
  } catch (error) {
    return {
      ...service,
      url,
      ok: false,
      error: error.message
    }
  } finally {
    clearTimeout(timeout)
  }
}

const results = await Promise.all(services.map(checkService))
let hasFailure = false

for (const result of results) {
  if (result.ok) {
    console.log(`[ok] ${result.name}: ${result.url}`)
  } else {
    hasFailure = true
    const reason = result.status ? `HTTP ${result.status}` : result.error
    console.error(`[missing] ${result.name}: ${result.url} (${reason})`)
  }
}

if (hasFailure) {
  process.exitCode = 1
}
