import { defineConfig, devices } from '@playwright/test'

const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: isCI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:7100',
    // 失败重试时记录 trace，便于回放定位路由或子应用挂载问题。
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // 运行 e2e 前自动拉起三个 Vite 服务，测试结束后 Playwright 会负责清理。
  webServer: [
    {
      command: 'pnpm dev:main',
      url: 'http://localhost:7100',
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
    {
      command: 'pnpm dev:react-dashboard',
      url: 'http://localhost:7101',
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
    {
      command: 'pnpm dev:vue3-app',
      url: 'http://localhost:7102',
      // 本地已有服务时复用，CI 中每次都重新启动，减少环境残留影响。
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
  ],
})
